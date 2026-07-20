// Coordinator: plans subtopics, runs one research subagent per subtopic
// (src/researcher.ts), then synthesizes a cited report from their compact
// results. Run: npm run research -- "Does a 4-day work week actually work?"

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { researchSubtopic } from "./researcher.js";
import type { SubtopicResearch } from "./types.js";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5-20250929";

const PLAN_TOOL: Anthropic.Tool = {
  name: "submit_subtopics",
  description: "Submit the 2-4 non-overlapping subtopics to research in order to answer the user's question.",
  input_schema: {
    type: "object",
    properties: { subtopics: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 } },
    required: ["subtopics"],
  },
};

async function planSubtopics(anthropic: Anthropic, question: string): Promise<string[]> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 512,
    system:
      "You are a research coordinator. Break the user's question into 2-4 subtopics that together would let a team answer it thoroughly, with minimal overlap between them. Call submit_subtopics once.",
    tools: [PLAN_TOOL],
    tool_choice: { type: "tool", name: "submit_subtopics" },
    messages: [{ role: "user", content: question }],
  });
  const block = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  if (!block) throw new Error("Planner did not call submit_subtopics.");
  return (block.input as { subtopics: string[] }).subtopics;
}

async function synthesize(anthropic: Anthropic, question: string, results: SubtopicResearch[]): Promise<string> {
  const findingsBlock = results
    .map(
      (r) =>
        `### ${r.subtopic}\n` +
        r.findings.map((f) => `- ${f.claim} [${f.documentId}: ${f.source}]`).join("\n")
    )
    .join("\n\n");

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system:
      "You are a research synthesis agent. You'll receive findings grouped by subtopic, each tagged with the document id and source it came from. Write a short report: one section per subtopic, plus a final 'Where sources disagree' section if any findings conflict. Cite every claim inline as [doc_id]. Do not introduce any claim that isn't in the findings you were given.",
    messages: [{ role: "user", content: `Question: ${question}\n\nFindings:\n${findingsBlock}` }],
  });

  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

async function main() {
  const question = process.argv.slice(2).join(" ") || "Does a 4-day work week actually work?";

  const mcpTransport = new StdioClientTransport({ command: "npx", args: ["tsx", "src/mcp-server.ts"] });
  const mcp = new Client({ name: "research-coordinator", version: "1.0.0" });
  await mcp.connect(mcpTransport);
  const anthropic = new Anthropic();

  console.log(`\n[coordinator] Question: ${question}`);
  const subtopics = await planSubtopics(anthropic, question);
  console.log(`[coordinator] Subtopics:\n  - ${subtopics.join("\n  - ")}`);

  // Sequential for readable console output. Each call is independent — see
  // the README for why this can safely become Promise.all(subtopics.map(...)).
  const results: SubtopicResearch[] = [];
  for (const subtopic of subtopics) {
    console.log(`\n[researcher] Starting: ${subtopic}`);
    const result = await researchSubtopic(anthropic, mcp, subtopic);
    console.log(`[researcher] ${result.findings.length} finding(s) recorded for "${subtopic}"`);
    results.push(result);
  }

  console.log("\n[coordinator] Synthesizing report...\n");
  const report = await synthesize(anthropic, question, results);
  console.log(report);

  await mcp.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
