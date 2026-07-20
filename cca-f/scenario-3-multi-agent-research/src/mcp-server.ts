#!/usr/bin/env node
// MCP server the research subagent (src/researcher.ts) uses to search and
// read source documents. Two tools only: search_documents returns compact
// hits (id, title, source, snippet) so a subagent can scan cheaply before
// deciding what to read in full, and get_document returns the full body of
// exactly one document. This two-step shape is deliberate — see the README's
// "why two tools instead of one" section.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { search, getDocument } from "./mock-corpus.js";

const server = new McpServer({ name: "research-corpus-tools", version: "1.0.0" });

server.tool(
  "search_documents",
  "Search the document corpus by keyword. Returns compact hits (id, title, source, snippet) — call get_document with an id to read the full text before citing it.",
  { query: z.string().describe("Keywords to search for, e.g. 'productivity compressed schedule'") },
  async ({ query }) => {
    const hits = search(query);
    return { content: [{ type: "text", text: JSON.stringify({ hits }) }] };
  }
);

server.tool(
  "get_document",
  "Fetch the full text and source citation for one document by id. Always call this before quoting or citing a finding — snippets from search_documents are truncated and not safe to cite directly.",
  { id: z.string().describe("Document id from a prior search_documents result, e.g. doc_01") },
  async ({ id }) => {
    const doc = getDocument(id);
    if (!doc) {
      return { content: [{ type: "text", text: JSON.stringify({ error: "document_not_found" }) }], isError: true };
    }
    return { content: [{ type: "text", text: JSON.stringify(doc) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
