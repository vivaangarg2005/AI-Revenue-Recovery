import { describe, it, expect } from "vitest";
import { FSMState } from "../fsm/fsm.types.js";
import { ActionType } from "./policy.types.js";
import { evaluatePolicy } from "./policy.js";

describe("Policy Gatekeeper Domain Engine", () => {
  const baseInput = {
    currentState: FSMState.DIAGNOSED,
    action: ActionType.RETRY_PAYMENT,
    retryCount: 0,
    discountPercent: 0,
    isOptedOut: false,
    aiConfidence: 0.90,
  };

  it("1. Retry 0 -> allowed", () => {
    const res = evaluatePolicy({ ...baseInput, retryCount: 0 });
    expect(res.allowed).toBe(true);
    expect(res.violations).toHaveLength(0);
  });

  it("2. Retry 2 -> allowed", () => {
    const res = evaluatePolicy({ ...baseInput, retryCount: 2 });
    expect(res.allowed).toBe(true);
  });

  it("3. Retry 3 -> denied", () => {
    const res = evaluatePolicy({ ...baseInput, retryCount: 3 });
    expect(res.allowed).toBe(false);
    expect(res.violations[0]).toContain("exceeds maximum policy limit");
  });

  it("4. Retry 4 -> denied", () => {
    const res = evaluatePolicy({ ...baseInput, retryCount: 4 });
    expect(res.allowed).toBe(false);
  });

  it("5. Discount 0% -> allowed", () => {
    const res = evaluatePolicy({ ...baseInput, discountPercent: 0 });
    expect(res.allowed).toBe(true);
  });

  it("6. Discount 5% -> allowed", () => {
    const res = evaluatePolicy({ ...baseInput, discountPercent: 5.0 });
    expect(res.allowed).toBe(true);
  });

  it("7. Discount 5.01% -> denied", () => {
    const res = evaluatePolicy({ ...baseInput, discountPercent: 5.01 });
    expect(res.allowed).toBe(false);
    expect(res.violations[0]).toContain("exceeds maximum policy limit of 5%");
  });

  it("8. Negative discount -> denied", () => {
    const res = evaluatePolicy({ ...baseInput, discountPercent: -1 });
    expect(res.allowed).toBe(false);
    expect(res.violations[0]).toContain("cannot be negative");
  });

  it("9. Opted-out customer + reminder -> denied", () => {
    const res = evaluatePolicy({
      ...baseInput,
      action: ActionType.SEND_REMINDER,
      isOptedOut: true,
    });
    expect(res.allowed).toBe(false);
    expect(res.violations[0]).toContain("opted out");
  });

  it("10. Paid case + retry -> denied", () => {
    const res = evaluatePolicy({
      ...baseInput,
      currentState: FSMState.PAID,
      action: ActionType.RETRY_PAYMENT,
    });
    expect(res.allowed).toBe(false);
    expect(res.violations[0]).toContain("already PAID");
  });

  it("11. Invalid FSM state + retry -> denied", () => {
    const res = evaluatePolicy({
      ...baseInput,
      currentState: FSMState.FAILED,
      action: ActionType.RETRY_PAYMENT,
    });
    expect(res.allowed).toBe(false);
    expect(res.violations[0]).toContain("invalid FSM state");
  });

  it("12. AI confidence 0.69 + financial action -> denied", () => {
    const res = evaluatePolicy({
      ...baseInput,
      action: ActionType.CREATE_PAYMENT_LINK,
      aiConfidence: 0.69,
    });
    expect(res.allowed).toBe(false);
    expect(res.violations[0]).toContain("below minimum required threshold");
  });

  it("13. AI confidence 0.70 + financial action -> allowed", () => {
    const res = evaluatePolicy({
      ...baseInput,
      action: ActionType.CREATE_PAYMENT_LINK,
      aiConfidence: 0.70,
    });
    expect(res.allowed).toBe(true);
  });

  it("14. Escalation -> allowed even when retry limit is reached", () => {
    const res = evaluatePolicy({
      ...baseInput,
      action: ActionType.ESCALATE,
      retryCount: 5,
      isOptedOut: true,
    });
    expect(res.allowed).toBe(true);
  });

  it("15. HALT -> allowed", () => {
    const res = evaluatePolicy({
      ...baseInput,
      action: ActionType.HALT,
      retryCount: 10,
    });
    expect(res.allowed).toBe(true);
  });
});
