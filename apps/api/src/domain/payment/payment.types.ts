export interface PaymentResult {
  success: boolean;
  paymentId: string | null;
  amountRecoveredPaise: bigint;
  failureReason: string | null;
  isSimulated: boolean;
}

export interface PaymentProvider {
  retryPayment(
    caseId: string,
    amountPaise: bigint,
    idempotencyKey: string
  ): Promise<PaymentResult>;

  createPaymentLink(
    caseId: string,
    amountPaise: bigint,
    discountPercent: number,
    idempotencyKey: string
  ): Promise<PaymentResult>;
}
