// Agentic loop for Scenario 1 (Agentic Architecture & Orchestration): spawns
// the MCP server as a subprocess, discovers its tools, and drives a Claude
// conversation against them until the ticket is resolved or escalated.
//
// Run: npm run agent -- cust_1001 ord_9001 "the keyboard arrived with a broken key"

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// Swap for whatever the current Claude model is in the Anthropic docs; kept
// as an env override so this example doesn't silently go stale.
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5-20250929";
const MAX_AGENT_TURNS = 8;

const SYSTEM_PROMPT = `You are a customer support resolution agent. Your goal is to resolve the customer's issue in this single conversation whenever possible (target: 80%+ first-contact resolution).

Rules:
- Always call get_customer before taking any action on an account, to confirm the customer and find the relevant order.
- Use process_refund for refund requests. If it returns needs_escalation: true, do not retry it — call escalate_to_human instead, and explain to the customer that a specialist will follow up.
- Call escalate_to_human immediately if the customer explicitly asks for a human, or the request is outside these tools' scope.
- Keep responses to the customer concise and concrete: state what you found, what you did, and what happens next.`;

async function main() {
  const [customerId, orderId, issue] = process.argv.slice(2);
  if (!customerId || !orderId || !issue) {
    console.error('Usage: npm run agent -- <customerId> <orderId> "<issue description>"');
    process.exit(1);
  }

  const mcpTransport = new StdioClientTransport({
    command: "npx",
    args: ["tsx", "src/mcp-server.ts"],
  });
  const mcp = new Client({ name: "support-agent-client", version: "1.0.0" });
  await mcp.connect(mcpTransport);

  const { tools: mcpTools } = await mcp.listTools();
  const tools: Anthropic.Tool[] = mcpTools.map((tool) => ({
    name: tool.name,
    description: tool.description ?? "",
    input_schema: tool.inputSchema as Anthropic.Tool.InputSchema,
  }));

  const anthropic = new Anthropic();
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Customer ${customerId} is asking about order ${orderId}: ${issue}`,
    },
  ];

  for (let turn = 0; turn < MAX_AGENT_TURNS; turn++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );

    for (const block of response.content) {
      if (block.type === "text") console.log(`\n[agent] ${block.text}`);
    }

    if (response.stop_reason !== "tool_use" || toolUseBlocks.length === 0) {
      await mcp.close();
      return;
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of toolUseBlocks) {
      console.log(`[tool call] ${block.name}(${JSON.stringify(block.input)})`);
      const result = await mcp.callTool({ name: block.name, arguments: block.input as Record<string, unknown> });
      const text = Array.isArray(result.content)
        ? result.content.map((c) => ("text" in c ? c.text : "")).join("\n")
        : "";
      console.log(`[tool result] ${text}`);
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: text,
        is_error: result.isError === true,
      });
    }

    messages.push({ role: "user", content: toolResults });
  }

  console.warn(`\nStopped after ${MAX_AGENT_TURNS} turns without a final response — likely a tool-design flaw (see CCA-F domain "Context Management & Reliability").`);
  await mcp.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
