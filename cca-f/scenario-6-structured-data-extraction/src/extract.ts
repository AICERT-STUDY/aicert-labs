import Anthropic from "@anthropic-ai/sdk";
import { EXTRACTION_TOOL_INPUT_SCHEMA } from "./schema.js";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5-20250929";

const SYSTEM_PROMPT = `You extract structured data from unstructured invoice/receipt text. Precision matters more than completeness: if you cannot confidently determine a field (illegible vendor, ambiguous date format, missing or inconsistent currency), set it to null and list it in fieldsNeedingReview — do not guess a plausible-looking value. Also list any field in fieldsNeedingReview if you extracted a value but are not confident it's correct, even if it isn't null.`;

// Forces the model to respond via the record_extraction tool rather than
// free text, using tool_choice — this is what makes the output structurally
// parseable at all. It does NOT, on its own, guarantee the result honors the
// null/fieldsNeedingReview invariant — see validate.ts for the layer that
// actually checks that.
export async function extractFromDocument(documentText: string): Promise<unknown> {
  const anthropic = new Anthropic();
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools: [
      {
        name: "record_extraction",
        description: "Record the structured extraction result for this document.",
        input_schema: EXTRACTION_TOOL_INPUT_SCHEMA,
      },
    ],
    tool_choice: { type: "tool", name: "record_extraction" },
    messages: [{ role: "user", content: `Extract structured data from this document:\n\n${documentText}` }],
  });

  const block = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  if (!block) throw new Error("Model did not call record_extraction.");
  return block.input;
}
