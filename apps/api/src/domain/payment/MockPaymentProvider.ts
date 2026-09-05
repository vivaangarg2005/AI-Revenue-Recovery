import crypto from "node:crypto";
import { PaymentProvider, PaymentResult } from "./payment.types.js";

export class MockPaymentProvider implements PaymentProvider {
  private executedIdempotencyKeys = new Map<string, PaymentResult>();

  /**
   * Deterministic payment retry execution.
   */
  public async retryPayment(
    caseId: string,
    amountPaise: bigint,
    idempotencyKey: string,
    failureCategory: string = "TEMPORARY_FAILURE",
  ): Promise<PaymentResult> {
    // 1. Idempotency Check: return cached result if key was already processed
    if (this.executedIdempotencyKeys.has(idempotencyKey)) {
      return this.executedIdempotencyKeys.get(idempotencyKey)!;
    }

    let result: PaymentResult;

    if (
      failureCategory === "TEMPORARY_FAILURE" ||
      failureCategory === "GATEWAY_TIMEOUT"
    ) {
      result = {
        success: true,
        paymentId: `pay_sim_${crypto.randomBytes(6).toString("hex")}`,
        amountRecoveredPaise: amountPaise,
        failureReason: null,
        isSimulated: true,
      };
    } else if (failureCategory === "INSUFFICIENT_FUNDS") {
      result = {
        success: false,
        paymentId: null,
        amountRecoveredPaise: BigInt(0),
        failureReason:
          "Insufficient funds in customer account during debit retry",
        isSimulated: true,
      };
    } else if (
      failureCategory === "PERMANENT_FAILURE" ||
      failureCategory === "ACCOUNT_CLOSED"
    ) {
      result = {
        success: false,
        paymentId: null,
        amountRecoveredPaise: BigInt(0),
        failureReason: "Mandate account permanently closed or cancelled",
        isSimulated: true,
      };
    } else {
      result = {
        success: false,
        paymentId: null,
        amountRecoveredPaise: BigInt(0),
        failureReason: `Unable to recover payment for category: ${failureCategory}`,
        isSimulated: true,
      };
    }

    // Cache idempotency result
    this.executedIdempotencyKeys.set(idempotencyKey, result);
    return result;
  }

  /**
   * Deterministic payment link generation / execution.
   */
  public async createPaymentLink(
    caseId: string,
    amountPaise: bigint,
    discountPercent: number,
    idempotencyKey: string,
  ): Promise<PaymentResult> {
    if (this.executedIdempotencyKeys.has(idempotencyKey)) {
      return this.executedIdempotencyKeys.get(idempotencyKey)!;
    }

    // Calculate discounted amount using BigInt integer arithmetic
    const discountPaise =
      (amountPaise * BigInt(Math.round(discountPercent * 100))) / BigInt(10000);
    const finalAmountPaise = amountPaise - discountPaise;

    const result: PaymentResult = {
      success: true,
      paymentId: `pay_link_sim_${crypto.randomBytes(6).toString("hex")}`,
      amountRecoveredPaise: finalAmountPaise,
      failureReason: null,
      isSimulated: true,
    };

    this.executedIdempotencyKeys.set(idempotencyKey, result);
    return result;
  }

  public clearIdempotencyCache(): void {
    this.executedIdempotencyKeys.clear();
  }
}
