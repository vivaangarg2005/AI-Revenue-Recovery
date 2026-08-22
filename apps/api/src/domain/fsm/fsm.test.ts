import { describe, it, expect } from "vitest";
import { FSMState } from "./fsm.types.js";
import { canTransition, transition, InvalidTransitionError } from "./fsm.js";

describe("FSM State Machine Domain Engine", () => {
  describe("Valid Transitions", () => {
    it("should allow FAILED -> DIAGNOSING", () => {
      expect(canTransition(FSMState.FAILED, FSMState.DIAGNOSING)).toBe(true);
      const res = transition(FSMState.FAILED, FSMState.DIAGNOSING);
      expect(res.toState).toBe(FSMState.DIAGNOSING);
    });

    it("should allow DIAGNOSING -> DIAGNOSED", () => {
      expect(canTransition(FSMState.DIAGNOSING, FSMState.DIAGNOSED)).toBe(true);
      const res = transition(FSMState.DIAGNOSING, FSMState.DIAGNOSED);
      expect(res.toState).toBe(FSMState.DIAGNOSED);
    });

    it("should allow DIAGNOSED -> ACTION_AUTHORIZED", () => {
      expect(canTransition(FSMState.DIAGNOSED, FSMState.ACTION_AUTHORIZED)).toBe(true);
    });

    it("should allow DIAGNOSED -> P2P_PAUSED", () => {
      expect(canTransition(FSMState.DIAGNOSED, FSMState.P2P_PAUSED)).toBe(true);
    });

    it("should allow DIAGNOSED -> POLICY_BLOCKED", () => {
      expect(canTransition(FSMState.DIAGNOSED, FSMState.POLICY_BLOCKED)).toBe(true);
    });

    it("should allow DIAGNOSED -> ESCALATED", () => {
      expect(canTransition(FSMState.DIAGNOSED, FSMState.ESCALATED)).toBe(true);
    });

    it("should allow ACTION_AUTHORIZED -> AWAITING_PAYMENT", () => {
      expect(canTransition(FSMState.ACTION_AUTHORIZED, FSMState.AWAITING_PAYMENT)).toBe(true);
    });

    it("should allow AWAITING_PAYMENT -> PAID", () => {
      expect(canTransition(FSMState.AWAITING_PAYMENT, FSMState.PAID)).toBe(true);
    });

    it("should allow any appropriate state -> HALTED", () => {
      expect(canTransition(FSMState.FAILED, FSMState.HALTED)).toBe(true);
      expect(canTransition(FSMState.DIAGNOSING, FSMState.HALTED)).toBe(true);
      expect(canTransition(FSMState.DIAGNOSED, FSMState.HALTED)).toBe(true);
      expect(canTransition(FSMState.AWAITING_PAYMENT, FSMState.HALTED)).toBe(true);
    });

    it("should be idempotent when transitioning from state to itself", () => {
      expect(canTransition(FSMState.FAILED, FSMState.FAILED)).toBe(true);
      const res = transition(FSMState.FAILED, FSMState.FAILED);
      expect(res.toState).toBe(FSMState.FAILED);
    });
  });

  describe("Invalid Transitions", () => {
    it("should throw InvalidTransitionError for FAILED -> PAID", () => {
      expect(canTransition(FSMState.FAILED, FSMState.PAID)).toBe(false);
      expect(() => transition(FSMState.FAILED, FSMState.PAID)).toThrow(InvalidTransitionError);
    });

    it("should throw InvalidTransitionError for FAILED -> ACTION_AUTHORIZED", () => {
      expect(canTransition(FSMState.FAILED, FSMState.ACTION_AUTHORIZED)).toBe(false);
      expect(() => transition(FSMState.FAILED, FSMState.ACTION_AUTHORIZED)).toThrow(InvalidTransitionError);
    });

    it("should throw InvalidTransitionError for DIAGNOSING -> PAID", () => {
      expect(canTransition(FSMState.DIAGNOSING, FSMState.PAID)).toBe(false);
      expect(() => transition(FSMState.DIAGNOSING, FSMState.PAID)).toThrow(InvalidTransitionError);
    });

    it("should throw InvalidTransitionError for POLICY_BLOCKED -> ACTION_AUTHORIZED", () => {
      expect(canTransition(FSMState.POLICY_BLOCKED, FSMState.ACTION_AUTHORIZED)).toBe(false);
      expect(() => transition(FSMState.POLICY_BLOCKED, FSMState.ACTION_AUTHORIZED)).toThrow(InvalidTransitionError);
    });

    it("should throw InvalidTransitionError for PAID -> FAILED", () => {
      expect(canTransition(FSMState.PAID, FSMState.FAILED)).toBe(false);
      expect(() => transition(FSMState.PAID, FSMState.FAILED)).toThrow(InvalidTransitionError);
    });

    it("should throw InvalidTransitionError for PAID -> ACTION_AUTHORIZED", () => {
      expect(canTransition(FSMState.PAID, FSMState.ACTION_AUTHORIZED)).toBe(false);
      expect(() => transition(FSMState.PAID, FSMState.ACTION_AUTHORIZED)).toThrow(InvalidTransitionError);
    });
  });
});
