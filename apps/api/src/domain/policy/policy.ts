import { FSMState } from "../fsm/fsm.types.js";
import { ActionType, PolicyEvaluationInput, PolicyDecision } from "./policy.types.js";
import { POLICY_CONFIG } from "./policy.config.js";

/**
 * Pure, deterministic Policy Gatekeeper.
 * 
 * Invariant: AI REASONING != POLICY AUTHORIZATION
 * Does NOT call databases, LLMs, OpenAI, Razorpay, or external network APIs.
 */
export function evaluatePolicy(input: PolicyEvaluationInput): PolicyDecision {
  const violations: string[] = [];
  const isEscalateOrHalt =
    input.action === ActionType.ESCALATE || input.action === ActionType.HALT;

  // RULE 6: Already PAID case cannot execute recovery actions
  if (input.currentState === FSMState.PAID && !isEscalateOrHalt) {
    violations.push("Case is already PAID; further recovery actions are denied");
  }

  // RULE 4: Actions cannot be authorized from invalid FSM states
  const validActionStates: FSMState[] = [
    FSMState.DIAGNOSED,
    FSMState.ACTION_AUTHORIZED,
  ];

  if (!isEscalateOrHalt && !validActionStates.includes(input.currentState)) {
    violations.push(
      `Cannot authorize action '${input.action}' from invalid FSM state '${input.currentState}'`
    );
  }

  // RULE 3: Opted-out customers cannot receive automated recovery communication
  if (input.isOptedOut && !isEscalateOrHalt) {
    violations.push("Customer has opted out of automated recovery communications");
  }

  // RULE 1 & 9: Maximum retries limit check
  if (!isEscalateOrHalt && input.retryCount >= POLICY_CONFIG.MAX_RETRIES) {
    violations.push(
      `Retry count (${input.retryCount}) reaches or exceeds maximum policy limit of ${POLICY_CONFIG.MAX_RETRIES}`
    );
  }

  // RULE 2, 7 & 8: Discount bounds check
  if (input.discountPercent !== undefined && !isEscalateOrHalt) {
    if (input.discountPercent < 0) {
      violations.push(`Discount percent (${input.discountPercent}%) cannot be negative`);
    } else if (input.discountPercent > POLICY_CONFIG.MAX_DISCOUNT_PERCENT) {
      violations.push(
        `Discount percent (${input.discountPercent}%) exceeds maximum policy limit of ${POLICY_CONFIG.MAX_DISCOUNT_PERCENT}%`
      );
    }
  }

  // RULE 5: Low-confidence AI recommendations check
  if (
    input.aiConfidence !== undefined &&
    !isEscalateOrHalt &&
    input.aiConfidence < POLICY_CONFIG.MIN_AI_CONFIDENCE
  ) {
    violations.push(
      `AI confidence (${input.aiConfidence}) is below minimum required threshold of ${POLICY_CONFIG.MIN_AI_CONFIDENCE}`
    );
  }

  const allowed = violations.length === 0;
  const reason = allowed
    ? `Action '${input.action}' authorized by Policy Gatekeeper`
    : `Action '${input.action}' denied by Policy Gatekeeper due to ${violations.length} violation(s)`;

  return {
    allowed,
    reason,
    policyId: POLICY_CONFIG.POLICY_ID,
    violations,
  };
}
