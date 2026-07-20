import { z } from "zod";

// Mirrors what review-prompt.md asks Claude Code to produce via its
// submit_findings tool. Confidence and severity are the two fields
// filter-findings.ts uses to decide what actually gets posted — everything
// else is just for the comment body.
export const FindingSchema = z.object({
  file: z.string(),
  line: z.number().int().positive(),
  failureScenario: z.string().min(1),
  confidence: z.number().min(0).max(1),
  severity: z.enum(["bug", "risk", "nitpick"]),
  summary: z.string().min(1),
});

export type Finding = z.infer<typeof FindingSchema>;
