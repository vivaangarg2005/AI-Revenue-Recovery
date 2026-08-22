import { FSMState, TransitionResult } from "./fsm.types.js";

export class InvalidTransitionError extends Error {
  constructor(public fromState: FSMState, public toState: FSMState) {
    super(`Invalid FSM transition from ${fromState} to ${toState}`);
    this.name = "InvalidTransitionError";
  }
}

/**
 * Explicit map of allowed FSM state transitions.
 * Pure, deterministic logic. Zero external dependencies.
 */
const ALLOWED_TRANSITIONS: Record<FSMState, FSMState[]> = {
  [FSMState.FAILED]: [FSMState.DIAGNOSING, FSMState.HALTED],
  [FSMState.DIAGNOSING]: [
    FSMState.DIAGNOSED,
    FSMState.ESCALATED,
    FSMState.POLICY_BLOCKED,
    FSMState.HALTED,
  ],
  [FSMState.DIAGNOSED]: [
    FSMState.ACTION_AUTHORIZED,
    FSMState.P2P_PAUSED,
    FSMState.POLICY_BLOCKED,
    FSMState.ESCALATED,
    FSMState.HALTED,
  ],
  [FSMState.ACTION_AUTHORIZED]: [
    FSMState.AWAITING_PAYMENT,
    FSMState.P2P_PAUSED,
    FSMState.POLICY_BLOCKED,
    FSMState.ESCALATED,
    FSMState.HALTED,
  ],
  [FSMState.P2P_PAUSED]: [
    FSMState.AWAITING_PAYMENT,
    FSMState.HALTED,
    FSMState.TERMINATED_OPT_OUT,
  ],
  [FSMState.AWAITING_PAYMENT]: [
    FSMState.PAID,
    FSMState.HALTED,
    FSMState.TERMINATED_OPT_OUT,
    FSMState.ESCALATED,
  ],
  [FSMState.PAID]: [], // Terminal state
  [FSMState.HALTED]: [FSMState.ESCALATED],
  [FSMState.ESCALATED]: [
    FSMState.ACTION_AUTHORIZED,
    FSMState.AWAITING_PAYMENT,
    FSMState.HALTED,
    FSMState.TERMINATED_OPT_OUT,
  ],
  [FSMState.POLICY_BLOCKED]: [FSMState.DIAGNOSING, FSMState.ESCALATED, FSMState.HALTED],
  [FSMState.TERMINATED_OPT_OUT]: [], // Terminal state
};

/**
 * Checks if a transition from `from` state to `to` state is valid.
 */
export function canTransition(from: FSMState, to: FSMState): boolean {
  if (from === to) return true; // Self-transition / Idempotent
  const allowed = ALLOWED_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

/**
 * Transitions from `from` state to `to` state.
 * Throws InvalidTransitionError if transition is illegal.
 */
export function transition(from: FSMState, to: FSMState): TransitionResult {
  if (!canTransition(from, to)) {
    throw new InvalidTransitionError(from, to);
  }
  return {
    fromState: from,
    toState: to,
    success: true,
  };
}
