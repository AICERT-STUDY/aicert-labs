import { z } from "zod";

export const LineItemSchema = z.object({
  description: z.string(),
  amount: z.number(),
});

const REVIEWABLE_FIELDS = ["vendor", "invoiceDate", "currency", "totalAmount"] as const;
export type ReviewableField = (typeof REVIEWABLE_FIELDS)[number];

// The interesting part of this schema isn't the field types — it's the
// invariant in superRefine below. A tool_use JSON schema (see extract.ts)
// can enforce that totalAmount is "number | null", but it cannot enforce
// that *if* it's null, it also appears in fieldsNeedingReview. That
// cross-field consistency check is exactly what a hand-authored tool schema
// structurally cannot express, and what this second validation layer exists
// to catch. See the README for why this is the actual scenario, not a detail.
export const ExtractionSchema = z
  .object({
    vendor: z.string().nullable(),
    invoiceDate: z.string().nullable(), // ISO 8601 (yyyy-mm-dd) or null
    currency: z.string().nullable(), // ISO 4217, e.g. "USD"
    lineItems: z.array(LineItemSchema),
    totalAmount: z.number().nullable(),
    fieldsNeedingReview: z.array(z.enum(REVIEWABLE_FIELDS)),
  })
  .superRefine((data, ctx) => {
    for (const field of REVIEWABLE_FIELDS) {
      const isNull = data[field] === null;
      const isFlagged = data.fieldsNeedingReview.includes(field);
      if (isNull && !isFlagged) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${field} is null but not listed in fieldsNeedingReview — a null value must always be flagged, never silently accepted as "unknown".`,
          path: ["fieldsNeedingReview"],
        });
      }
    }
  });

export type ExtractionResult = z.infer<typeof ExtractionSchema>;

// The JSON Schema handed to Claude via tool_use. Deliberately does NOT (and
// structurally cannot, in plain JSON Schema) express the null <-> flagged
// invariant above — that's the point being demonstrated, not an oversight.
export const EXTRACTION_TOOL_INPUT_SCHEMA = {
  type: "object" as const,
  properties: {
    vendor: { type: ["string", "null"], description: "Vendor/company name, or null if not confidently determinable" },
    invoiceDate: { type: ["string", "null"], description: "ISO 8601 date (yyyy-mm-dd), or null if ambiguous or missing" },
    currency: { type: ["string", "null"], description: "ISO 4217 currency code, or null if ambiguous or missing" },
    lineItems: {
      type: "array",
      items: {
        type: "object",
        properties: { description: { type: "string" }, amount: { type: "number" } },
        required: ["description", "amount"],
      },
    },
    totalAmount: { type: ["number", "null"], description: "Total amount, or null if not confidently determinable" },
    fieldsNeedingReview: {
      type: "array",
      items: { type: "string", enum: REVIEWABLE_FIELDS },
      description:
        "Every field above that is null, PLUS any field you extracted a value for but aren't confident is correct (e.g. an ambiguous date format).",
    },
  },
  required: ["vendor", "invoiceDate", "currency", "lineItems", "totalAmount", "fieldsNeedingReview"],
};
