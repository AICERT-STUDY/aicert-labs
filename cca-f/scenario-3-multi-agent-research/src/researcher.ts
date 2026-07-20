// The research subagent: given one subtopic, runs its own bounded
// tool-calling loop (search_documents / get_document from the MCP server,
// plus a local record_finding tool) and returns ONLY a compact,
// structured SubtopicResearch — never its message history. That's the
// context-management decision this file exists to demonstrate.

import type Anthropic from "@anthropic-ai/sdk";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { getDocument } from "./mock-corpus.js";
import type { Finding, SubtopicResearch } from "./types.js";

const MAX_TURNS = 6;

const RECORD_FINDING_TOOL: Anthropic.Tool = {
  name: "record_finding",
  description:
    "Record one specific, citable research finding. Call this once per distinct finding (aim for 2-4 per subtopic) instead of putting findings in your text reply — text replies are not captured by the coordinator.",
  input_schema: {
    type: "object",
    properties: {
      claim: { type: "string", description: "One specific factual claim, not a summary of the whole document" },
      documentId: { type: "string", description: "The id of the document this claim is drawn from, e.g. doc_01" },
    },
    required: ["claim", "documentId"],
  },
};

const SYSTEM_PROMPT = `You are a research subagent responsible for exactly one subtopic. Use search_documents to find relevant sources, then get_document to read the full text before citing anything — snippets are truncated and not safe to cite directly. Prefer documents that directly address your subtopic over tangentially related ones. When you've read enough to answer, call record_finding for each distinct claim (2-4 findings is typical) and then stop.`;

function isToolUse(block: Anthropic.ContentBlock): block is Anthropic.ToolUseBlock {
  return block.type === "tool_use";
}

export async function researchSubtopic(
  anthropic: Anthropic,
  mcp: Client,
  subtopic: string
): Promise<SubtopicResearch> {
  const { tools: mcpTools } = await mcp.listTools();
  const tools: Anthropic.Tool[] = [
    ...mcpTools.map((tool) => ({
      name: tool.name,
      description: tool.description ?? "",
      input_schema: tool.inputSchema as Anthropic.Tool.InputSchema,
    })),
    RECORD_FINDING_TOOL,
  ];

  const findings: Finding[] = [];
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: `Research subtopic: "${subtopic}"` },
  ];

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    });
    messages.push({ role: "assistant", content: response.content });

    const toolUses = response.content.filter(isToolUse);
    if (response.stop_reason !== "tool_use" || toolUses.length === 0) break;

    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const block of toolUses) {
      if (block.name === "record_finding") {
        const input = block.input as { claim: string; documentId: string };
        const doc = getDocument(input.documentId);
        findings.push({ claim: input.claim, documentId: input.documentId, source: doc?.source ?? "unknown source" });
        results.push({ type: "tool_result", tool_use_id: block.id, content: "Recorded." });
        continue;
      }
      const result = await mcp.callTool({ name: block.name, arguments: block.input as Record<string, unknown> });
      const text = Array.isArray(result.content)
        ? result.content.map((c) => ("text" in c ? c.text : "")).join("\n")
        : "";
      results.push({ type: "tool_result", tool_use_id: block.id, content: text, is_error: result.isError === true });
    }
    messages.push({ role: "user", content: results });
  }

  return { subtopic, findings };
}
