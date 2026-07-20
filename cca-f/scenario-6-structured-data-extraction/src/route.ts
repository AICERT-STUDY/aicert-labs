import type { ExtractionResult } from "./schema.js";
import type { ValidationOutcome } from "./validate.js";

export type RoutingDecision =
  | { action: "auto_process"; result: ExtractionResult }
  | { action: "human_review"; result: ExtractionResult | null; reason: string };

// The downstream-integration half of "keeps precision high while handling
// edge cases": auto-processing is only allowed when the extraction is both
// schema-valid AND has nothing flagged for review. A validation failure
// (invariant violated, or the model's tool_use input didn't even parse)
// routes to human review with no result at all, rather than guessing which
// half of a self-contradictory extraction to trust.
export function route(outcome: ValidationOutcome): RoutingDecision {
  if (!outcome.ok) {
    return { action: "human_review", result: null, reason: `validation failed: ${outcome.reason}` };
  }
  if (outcome.result.fieldsNeedingReview.length > 0) {
    return {
      action: "human_review",
      result: outcome.result,
      reason: `flagged fields: ${outcome.result.fieldsNeedingReview.join(", ")}`,
    };
  }
  return { action: "auto_process", result: outcome.result };
}
