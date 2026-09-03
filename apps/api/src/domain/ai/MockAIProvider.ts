import { AIProvider, DiagnosisInput, DiagnosisOutput, P2PExtractionInput, P2PExtractionOutput } from "./ai.types.js";
import { DiagnosisOutputSchema, P2PExtractionOutputSchema } from "./ai.schemas.js";

export class MockAIProvider implements AIProvider {
  /**
   * Deterministic payment failure diagnosis fixture matching.
   */
  public async diagnosePaymentFailure(input: DiagnosisInput): Promise<DiagnosisOutput> {
    const code = (input.failureCode || "").toUpperCase();
    const msg = (input.failureMessage || "").toLowerCase();

    let rawOutput: DiagnosisOutput;

    if (code.includes("GATEWAY_TIMEOUT") || msg.includes("timeout") || msg.includes("network error")) {
      rawOutput = {
        rootCause: "Temporary payment gateway network timeout",
        category: "TEMPORARY_FAILURE",
        confidence: 0.95,
        recommendedStrategy: "SCHEDULED_RETRY",
        recommendedDelayDays: 1,
      };
    } else if (code.includes("INSUFFICIENT_FUNDS") || msg.includes("balance") || msg.includes("funds")) {
      rawOutput = {
        rootCause: "Insufficient account balance at time of debit",
        category: "INSUFFICIENT_FUNDS",
        confidence: 0.92,
        recommendedStrategy: "SCHEDULED_RETRY",
        recommendedDelayDays: 3,
      };
    } else if (code.includes("EXPIRED_CARD") || code.includes("MANDATE_EXPIRED") || msg.includes("expired")) {
      rawOutput = {
        rootCause: "Payment method or mandate card expired",
        category: "EXPIRED_PAYMENT_METHOD",
        confidence: 0.98,
        recommendedStrategy: "MANDATE_UPDATE",
        recommendedDelayDays: 0,
      };
    } else if (code.includes("ACCOUNT_CLOSED") || msg.includes("closed") || msg.includes("stolen")) {
      rawOutput = {
        rootCause: "Customer bank account closed or flagged stolen",
        category: "PERMANENT_FAILURE",
        confidence: 0.99,
        recommendedStrategy: "HUMAN_ESCALATION",
        recommendedDelayDays: 0,
      };
    } else if (code.includes("LOW_CONFIDENCE_RETRY")) {
      rawOutput = {
        rootCause: "Maybe it will work",
        category: "TEMPORARY_FAILURE",
        confidence: 0.50,
        recommendedStrategy: "SCHEDULED_RETRY",
        recommendedDelayDays: 1,
      };
    } else {
      rawOutput = {
        rootCause: `Unrecognized payment failure code: ${input.failureCode}`,
        category: "UNKNOWN",
        confidence: 0.50,
        recommendedStrategy: "HUMAN_ESCALATION",
        recommendedDelayDays: 0,
      };
    }

    // Always validate output with Zod before returning!
    return DiagnosisOutputSchema.parse(rawOutput);
  }

  /**
   * Deterministic Promise-to-Pay extraction with prompt injection defense.
   */
  public async extractPromiseToPay(input: P2PExtractionInput): Promise<P2PExtractionOutput> {
    const text = (input.message || "").toLowerCase();

    // 1. Detect Prompt Injection Attempts
    const isInjection =
      text.includes("ignore") ||
      text.includes("system prompt") ||
      text.includes("previous instructions") ||
      text.includes("administrator") ||
      text.includes("bypass") ||
      text.includes("pay me instead");

    let rawOutput: P2PExtractionOutput;

    if (isInjection) {
      // Neutralize prompt injection attempts completely
      rawOutput = {
        intent: "UNKNOWN",
        confidence: 0.10,
        promisedDate: null,
      };
    } else if (text.includes("refuse") || text.includes("don't want to pay") || text.includes("cancel subscription")) {
      rawOutput = {
        intent: "REFUSES_PAYMENT",
        confidence: 0.95,
        promisedDate: null,
      };
    } else if (text.includes("friday") || text.includes("after salary") || text.includes("i will pay") || text.includes("ill pay")) {
      rawOutput = {
        intent: "WILL_PAY",
        confidence: 0.90,
        promisedDate: "2026-08-28", // Deterministic mock target date
      };
    } else if (text.includes("give me until") || text.includes("delay") || text.includes("next week") || text.includes("monday")) {
      rawOutput = {
        intent: "REQUEST_DELAY",
        confidence: 0.88,
        promisedDate: "2026-08-31", // Deterministic mock target date
      };
    } else if (text.includes("maybe") || text.includes("not sure") || text.includes("check later")) {
      rawOutput = {
        intent: "UNKNOWN",
        confidence: 0.40,
        promisedDate: null,
      };
    } else {
      rawOutput = {
        intent: "UNKNOWN",
        confidence: 0.20,
        promisedDate: null,
      };
    }

    // Always validate output with Zod before returning!
    return P2PExtractionOutputSchema.parse(rawOutput);
  }
}
