#!/usr/bin/env node
// MCP server for information a generic Read/Grep tool cannot produce, because
// it isn't in the file's text: who last touched it and why, who owns it now,
// and what tests actually cover it. Compare this to src/local-tools.ts, which
// implements the generic, Claude-Code-built-in-style tools (read_file,
// grep_codebase) — see the README for why the split is the actual lesson
// here, not any individual tool.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getFileHistory, findOwner, findRelatedTests } from "./mock-metadata.js";

const server = new McpServer({ name: "codebase-intelligence-tools", version: "1.0.0" });

server.tool(
  "get_file_history",
  "Get recent commit history (author, date, message) for a file, relative to the sample-codebase root, e.g. discounts/validate-code.ts. Use this to understand why code looks the way it does, not just what it does.",
  { path: z.string() },
  async ({ path }) => {
    const history = getFileHistory(path);
    if (!history) return { content: [{ type: "text", text: JSON.stringify({ history: [] }) }] };
    return { content: [{ type: "text", text: JSON.stringify({ history }) }] };
  }
);

server.tool(
  "find_owner",
  "Find who currently owns a file — a team or person to actually ask, or a note if the original author is gone. This is not derivable from the file's contents.",
  { path: z.string() },
  async ({ path }) => {
    const owner = findOwner(path);
    return { content: [{ type: "text", text: JSON.stringify({ owner: owner ?? "unknown" }) }] };
  }
);

server.tool(
  "find_related_tests",
  "Find test files that cover a given source file. Returns an empty list if there's no direct coverage — that absence is itself important context before changing the file.",
  { path: z.string() },
  async ({ path }) => {
    const tests = findRelatedTests(path);
    return { content: [{ type: "text", text: JSON.stringify({ tests: tests ?? [] }) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
