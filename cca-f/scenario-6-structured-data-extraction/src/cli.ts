// Run: npm run extract -- fixtures/invoice-ambiguous.txt

import "dotenv/config";
import { readFileSync } from "node:fs";
import { extractFromDocument } from "./extract.js";
import { validateExtraction } from "./validate.js";
import { route } from "./route.js";

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: npm run extract -- <path to document text file>");
    process.exit(1);
  }

  const documentText = readFileSync(path, "utf-8");
  console.log(`Extracting from ${path}...\n`);

  const raw = await extractFromDocument(documentText);
  console.log("Raw tool_use input:", JSON.stringify(raw, null, 2));

  const outcome = validateExtraction(raw);
  const decision = route(outcome);

  console.log(`\nRouting decision: ${decision.action}`);
  if (decision.action === "human_review") console.log(`Reason: ${decision.reason}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
