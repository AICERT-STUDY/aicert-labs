// Generic, reusable tools — the stand-ins for Claude Code's built-in Read
// and Grep in this standalone script (built-ins only exist inside Claude
// Code itself; a plain Anthropic SDK loop has to provide equivalents). These
// don't know anything about this specific codebase's history or ownership —
// that's deliberately left to the MCP tools in mcp-server.ts.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import type Anthropic from "@anthropic-ai/sdk";

const SAMPLE_ROOT = resolve(import.meta.dirname, "..", "sample-codebase");

function resolveInSample(relativePath: string): string {
  const resolved = resolve(SAMPLE_ROOT, relativePath);
  if (!resolved.startsWith(SAMPLE_ROOT)) {
    throw new Error("Path escapes sample-codebase/ — refusing to read outside the sandboxed sample repo.");
  }
  return resolved;
}

function listAllFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? listAllFiles(full) : [full];
  });
}

export const LOCAL_TOOLS: Anthropic.Tool[] = [
  {
    name: "list_files",
    description: "List every file in the sample codebase, as paths relative to its root (e.g. discounts/validate-code.ts). Use this first to get your bearings.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "read_file",
    description: "Read the full contents of one file by its path relative to the sample codebase root.",
    input_schema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
    },
  },
  {
    name: "grep_codebase",
    description: "Search every file in the sample codebase for a literal substring (case-sensitive). Returns matching lines with their file and line number.",
    input_schema: {
      type: "object",
      properties: { pattern: { type: "string" } },
      required: ["pattern"],
    },
  },
];

export function runLocalTool(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case "list_files":
      return JSON.stringify({ files: listAllFiles(SAMPLE_ROOT).map((f) => relative(SAMPLE_ROOT, f)) });

    case "read_file": {
      const path = resolveInSample(String(input.path));
      return readFileSync(path, "utf-8");
    }

    case "grep_codebase": {
      const pattern = String(input.pattern);
      const matches = listAllFiles(SAMPLE_ROOT).flatMap((file) => {
        const relPath = relative(SAMPLE_ROOT, file);
        const lines = readFileSync(file, "utf-8").split("\n");
        return lines
          .map((text, i) => ({ file: relPath, line: i + 1, text }))
          .filter((m) => m.text.includes(pattern));
      });
      return JSON.stringify({ matches });
    }

    default:
      throw new Error(`Unknown local tool: ${name}`);
  }
}
