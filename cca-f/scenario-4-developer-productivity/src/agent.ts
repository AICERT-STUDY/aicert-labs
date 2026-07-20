// Combines the generic local tools (list_files, read_file, grep_codebase —
// standing in for Claude Code's built-ins) with the codebase-intelligence
// MCP server (get_file_history, find_owner, find_related_tests) in one loop,
// to answer a question about an unfamiliar codebase.
//
// Run: npm run agent -- "How do LEGACY- discount codes work, and who do I ask if one misbehaves?"

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { LOCAL_TOOLS, runLocalTool } from "./local-tools.js";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5-20250929";
const MAX_TURNS = 10;
const LOCAL_TOOL_NAMES = new Set(LOCAL_TOOLS.map((t) => t.name));

const SYSTEM_PROMPT = `You're helping an engineer who has never seen this codebase before answer a question about it. You have two kinds of tools:

- Generic exploration tools (list_files, read_file, grep_codebase): use these to find and read code, the same way you'd use Read/Grep on any codebase.
- Codebase-intelligence tools (get_file_history, find_owner, find_related_tests): use these for things you cannot learn from reading the code itself — why it was written that way, who to actually ask, and whether it has test coverage.

Prefer reading the code first to understand *what* it does, then use the intelligence tools to understand *why* and *who owns it* before making any claim about risk or who to contact. If a file has no related tests, say so explicitly — that's important context, not a detail to skip.`;

async function main() {
  const question = process.argv.slice(2).join(" ");
  if (!question) {
    console.error('Usage: npm run agent -- "<question about the sample codebase>"');
    process.exit(1);
  }

  const mcpTransport = new StdioClientTransport({ command: "npx", args: ["tsx", "src/mcp-server.ts"] });
  const mcp = new Client({ name: "dev-productivity-agent", version: "1.0.0" });
  await mcp.connect(mcpTransport);

  const { tools: mcpTools } = await mcp.listTools();
  const tools: Anthropic.Tool[] = [
    ...LOCAL_TOOLS,
    ...mcpTools.map((tool) => ({
      name: tool.name,
      description: tool.description ?? "",
      input_schema: tool.inputSchema as Anthropic.Tool.InputSchema,
    })),
  ];

  const anthropic = new Anthropic();
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: question }];

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    });
    messages.push({ role: "assistant", content: response.content });

    for (const block of response.content) {
      if (block.type === "text") console.log(`\n[agent] ${block.text}`);
    }

    const toolUses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (response.stop_reason !== "tool_use" || toolUses.length === 0) {
      await mcp.close();
      return;
    }

    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const block of toolUses) {
      console.log(`[tool call] ${block.name}(${JSON.stringify(block.input)})`);
      const input = block.input as Record<string, unknown>;
      let text: string;
      let isError = false;
      try {
        if (LOCAL_TOOL_NAMES.has(block.name)) {
          text = runLocalTool(block.name, input);
        } else {
          const result = await mcp.callTool({ name: block.name, arguments: input });
          text = Array.isArray(result.content)
            ? result.content.map((c) => ("text" in c ? c.text : "")).join("\n")
            : "";
          isError = result.isError === true;
        }
      } catch (err) {
        text = err instanceof Error ? err.message : String(err);
        isError = true;
      }
      results.push({ type: "tool_result", tool_use_id: block.id, content: text, is_error: isError });
    }
    messages.push({ role: "user", content: results });
  }

  console.warn(`\nStopped after ${MAX_TURNS} turns without a final answer.`);
  await mcp.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
