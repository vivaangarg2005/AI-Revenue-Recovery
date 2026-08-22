import { z } from "zod";

export const DiagnosisCategoryEnum = z.enum([
  "TEMPORARY_FAILURE",
  "INSUFFICIENT_FUNDS",
  "AUTHENTICATION_FAILURE",
  "EXPIRED_PAYMENT_METHOD",
  "PERMANENT_FAILURE",
  "UNKNOWN",
]);

export const RecommendedStrategyEnum = z.enum([
  "SCHEDULED_RETRY",
  "PAYMENT_LINK",
  "MANDATE_UPDATE",
  "DISCOUNT_NUDGE",
  "HUMAN_ESCALATION",
]);

export const P2PIntentEnum = z.enum([
  "WILL_PAY",
  "REQUEST_DELAY",
  "REFUSES_PAYMENT",
  "UNKNOWN",
]);

export const DiagnosisInputSchema = z.object({
  failureCode: z.string().min(1),
  failureMessage: z.string(),
  paymentHistory: z
    .array(
      z.object({
        date: z.string(),
        status: z.string(),
        failureCode: z.string().optional(),
      })
    )
    .optional()
    .default([]),
  amountPaise: z.union([z.string(), z.number()]),
  customerTier: z.string().default("STANDARD"),
});

export const DiagnosisOutputSchema = z.object({
  rootCause: z.string().min(1),
  category: DiagnosisCategoryEnum,
  confidence: z.number().min(0).max(1),
  recommendedStrategy: RecommendedStrategyEnum,
  recommendedDelayDays: z.number().int().min(0),
});

export const P2PExtractionInputSchema = z.object({
  message: z.string().min(1),
  currentDate: z.string().optional(),
  customerTimezone: z.string().optional().default("Asia/Kolkata"),
});

export const P2PExtractionOutputSchema = z.object({
  intent: P2PIntentEnum,
  confidence: z.number().min(0).max(1),
  promisedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be ISO format YYYY-MM-DD")
    .nullable(),
});
