import { ExtractionSchema, type ExtractionResult } from "./schema.js";

export type ValidationOutcome =
  | { ok: true; result: ExtractionResult }
  | { ok: false; reason: string };

// If Claude's raw tool_use input fails the schema's cross-field invariant —
// or fails to parse at all — the fail-safe is to route to human review, not
// to throw and crash the pipeline, and not to silently accept a
// self-contradictory extraction (confident-looking value, not flagged, but
// the model also said the document was ambiguous). See route.ts: an
// invalid result is treated as maximally uncertain, not ignored.
export function validateExtraction(raw: unknown): ValidationOutcome {
  const parsed = ExtractionSchema.safeParse(raw);
  if (parsed.success) return { ok: true, result: parsed.data };
  return { ok: false, reason: parsed.error.issues.map((i) => i.message).join("; ") };
}
