import { FSMState } from "../fsm/fsm.types.js";

export enum ActionType {
  RETRY_PAYMENT = "RETRY_PAYMENT",
  SEND_REMINDER = "SEND_REMINDER",
  CREATE_PAYMENT_LINK = "CREATE_PAYMENT_LINK",
  OFFER_DISCOUNT = "OFFER_DISCOUNT",
  ESCALATE = "ESCALATE",
  HALT = "HALT",
}

export interface PolicyEvaluationInput {
  currentState: FSMState;
  action: ActionType;
  retryCount: number;
  discountPercent?: number;
  isOptedOut?: boolean;
  customerTier?: "STANDARD" | "ENTERPRISE";
  aiConfidence?: number;
}

export interface PolicyDecision {
  allowed: boolean;
  reason: string;
  policyId: string;
  violations: string[];
}
