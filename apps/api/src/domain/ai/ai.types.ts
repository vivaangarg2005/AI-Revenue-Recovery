export type DiagnosisCategory =
  | "TEMPORARY_FAILURE"
  | "INSUFFICIENT_FUNDS"
  | "AUTHENTICATION_FAILURE"
  | "EXPIRED_PAYMENT_METHOD"
  | "PERMANENT_FAILURE"
  | "UNKNOWN";

export type RecommendedStrategy =
  | "SCHEDULED_RETRY"
  | "PAYMENT_LINK"
  | "MANDATE_UPDATE"
  | "DISCOUNT_NUDGE"
  | "HUMAN_ESCALATION";

export type P2PIntent =
  | "WILL_PAY"
  | "REQUEST_DELAY"
  | "REFUSES_PAYMENT"
  | "UNKNOWN";

export interface DiagnosisInput {
  failureCode: string;
  failureMessage: string;
  paymentHistory?: Array<{ date: string; status: string; failureCode?: string }>;
  amountPaise: string | number;
  customerTier: string;
}

export interface DiagnosisOutput {
  rootCause: string;
  category: DiagnosisCategory;
  confidence: number;
  recommendedStrategy: RecommendedStrategy;
  recommendedDelayDays: number;
}

export interface P2PExtractionInput {
  message: string;
  currentDate?: string;
  customerTimezone?: string;
  customerId?: string;
  historicalContext?: {
    pastBrokenPromises?: number;
    historicalSuccessRate?: number;
  };
}

export interface P2PExtractionOutput {
  intent: P2PIntent;
  confidence: number;
  reasoning: string;
  promisedDate: string | null;
}

export interface AIProvider {
  diagnosePaymentFailure(input: DiagnosisInput): Promise<DiagnosisOutput>;
  extractPromiseToPay(input: P2PExtractionInput): Promise<P2PExtractionOutput>;
}
