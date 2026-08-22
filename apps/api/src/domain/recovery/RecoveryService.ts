import crypto from "node:crypto";
import { FSMState, DecisionType } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma.js";
import { canTransition } from "../fsm/fsm.js";
import { evaluatePolicy } from "../policy/policy.js";
import { ActionType } from "../policy/policy.types.js";
import { getAIProvider } from "../ai/aiFactory.js";
import { MockPaymentProvider } from "../payment/MockPaymentProvider.js";

export class RecoveryService {
  private static paymentProvider = new MockPaymentProvider();

  /**
   * Deterministically maps AI recommended strategy to an executable ActionType.
   */
  public static mapStrategyToAction(strategy: string): ActionType {
    switch (strategy) {
      case "SCHEDULED_RETRY":
        return ActionType.RETRY_PAYMENT;
      case "PAYMENT_LINK":
        return ActionType.CREATE_PAYMENT_LINK;
      case "DISCOUNT_NUDGE":
        return ActionType.OFFER_DISCOUNT;
      case "HUMAN_ESCALATION":
      case "MANDATE_UPDATE":
      default:
        return ActionType.ESCALATE;
    }
  }

  /**
   * Runs the complete end-to-end recovery lifecycle for a given RecoveryCase.
   */
  public static async runRecoveryWorkflow(caseId: string) {
    const correlationId = `corr_${crypto.randomBytes(8).toString("hex")}`;

    // 1. Fetch Case with Subscription & Customer, Invoice, and FailureEvents
    const recoveryCase = await prisma.recoveryCase.findUnique({
      where: { id: caseId },
      include: {
        subscription: {
          include: { customer: true },
        },
        invoice: true,
        FailureEvent: { orderBy: { occurredAt: "desc" }, take: 1 },
      },
    });

    if (!recoveryCase) {
      throw new Error(`RecoveryCase with ID ${caseId} not found`);
    }

    const initialState = recoveryCase.fsmState;

    // Guard: If already terminal (PAID, TERMINATED_OPT_OUT), return early
    if (initialState === FSMState.PAID || initialState === FSMState.TERMINATED_OPT_OUT) {
      return {
        caseId,
        initialState,
        finalState: initialState,
        message: "Case is already in terminal state",
        recoveredPaise: recoveryCase.recoveredPaise.toString(),
      };
    }

    const customer = recoveryCase.subscription?.customer || { tier: "STANDARD", isOptedOut: false };
    const failureCode = recoveryCase.FailureEvent[0]?.rawProviderCode || "GATEWAY_TIMEOUT";
    const failureMessage = recoveryCase.FailureEvent[0]?.normalizedCategory || "Payment debit failure";

    // STEP 1: FAILED -> DIAGNOSING
    await this.updateCaseState(caseId, FSMState.DIAGNOSING, "WORKFLOW_START", correlationId);

    // STEP 2: AI Diagnosis
    const aiProvider = getAIProvider();
    const diagnosisResult = await aiProvider.diagnosePaymentFailure({
      failureCode,
      failureMessage,
      amountPaise: recoveryCase.amountDuePaise.toString(),
      customerTier: customer.tier,
    });

    // Save AIDiagnosis Record
    const diagnosisRecord = await prisma.aIDiagnosis.create({
      data: {
        caseId,
        modelName: "MockAIProvider",
        schemaVersion: "v1",
        rootCause: diagnosisResult.rootCause,
        confidence: diagnosisResult.confidence,
        recommendedStrategy: diagnosisResult.recommendedStrategy,
        recommendedDelayDays: diagnosisResult.recommendedDelayDays,
        primaryReasoning: diagnosisResult.rootCause,
      },
    });

    await this.createAuditEvent(
      caseId,
      "AI_DIAGNOSIS_COMPLETED",
      { diagnosisId: diagnosisRecord.id, category: diagnosisResult.category },
      correlationId
    );

    // STEP 3: DIAGNOSING -> DIAGNOSED
    await this.updateCaseState(caseId, FSMState.DIAGNOSED, "AI_DIAGNOSIS_DONE", correlationId);

    // STEP 4: Action Mapping
    const proposedActionType = this.mapStrategyToAction(diagnosisResult.recommendedStrategy);

    // STEP 5: Policy Gatekeeper Evaluation
    const policyDecision = evaluatePolicy({
      currentState: FSMState.DIAGNOSED,
      action: proposedActionType,
      retryCount: recoveryCase.retryCount,
      discountPercent: proposedActionType === ActionType.OFFER_DISCOUNT ? 5.0 : 0,
      isOptedOut: customer.isOptedOut,
      aiConfidence: diagnosisResult.confidence,
    });

    // Persist PolicyDecision Record
    const policyRecord = await prisma.policyDecision.create({
      data: {
        caseId,
        decision: policyDecision.allowed ? DecisionType.ALLOW : DecisionType.DENY,
        policyId: policyDecision.policyId,
        violations: policyDecision.violations,
        policySignatureHash: crypto
          .createHash("sha256")
          .update(`${caseId}:${policyDecision.allowed}:${Date.now()}`)
          .digest("hex"),
      },
    });

    await this.createAuditEvent(
      caseId,
      "POLICY_EVALUATED",
      { decisionId: policyRecord.id, allowed: policyDecision.allowed },
      correlationId
    );

    // STEP 6: Handle Policy DENIED
    if (!policyDecision.allowed) {
      await this.createAuditEvent(caseId, "ACTION_DENIED", { violations: policyDecision.violations }, correlationId);
      await this.updateCaseState(caseId, FSMState.POLICY_BLOCKED, "POLICY_DENIED", correlationId);

      return {
        caseId,
        initialState,
        finalState: FSMState.POLICY_BLOCKED,
        diagnosis: diagnosisResult,
        policyDecision: {
          ...policyDecision,
          decision: "DENY",
        },
        action: null,
        paymentResult: null,
        recoveredPaise: "0",
      };
    }

    // STEP 7: Policy ALLOWED -> Transition to ACTION_AUTHORIZED
    await this.createAuditEvent(caseId, "ACTION_AUTHORIZED", { action: proposedActionType }, correlationId);
    await this.updateCaseState(caseId, FSMState.ACTION_AUTHORIZED, "POLICY_ALLOWED", correlationId);

    const actionIdempotencyKey = `${caseId}_act_${Date.now()}`;

    // Create RecoveryAction Record
    const actionRecord = await prisma.recoveryAction.create({
      data: {
        caseId,
        actionType: proposedActionType,
        parameters: { strategy: diagnosisResult.recommendedStrategy },
        policyDecisionId: policyRecord.id,
        idempotencyKey: actionIdempotencyKey,
        executionStatus: "PROPOSED",
      },
    });

    // Handle ESCALATE Action
    if (proposedActionType === ActionType.ESCALATE) {
      await prisma.recoveryAction.update({
        where: { id: actionRecord.id },
        data: { executionStatus: "COMPLETED" },
      });
      await this.createAuditEvent(caseId, "RECOVERY_ESCALATED", { reason: "AI/Policy Escalation" }, correlationId);
      await this.updateCaseState(caseId, FSMState.ESCALATED, "HUMAN_ESCALATION_REQUIRED", correlationId);

      return {
        caseId,
        initialState,
        finalState: FSMState.ESCALATED,
        diagnosis: diagnosisResult,
        policyDecision: {
          ...policyDecision,
          decision: "ALLOW",
        },
        action: actionRecord,
        paymentResult: null,
        recoveredPaise: "0",
      };
    }

    // STEP 8: Execute Payment Action Routing based on ActionType
    const paymentIdempotencyKey = `${caseId}_pay_${recoveryCase.retryCount + 1}`;
    
    await this.createAuditEvent(caseId, "PAYMENT_ATTEMPTED", { idempotencyKey: paymentIdempotencyKey }, correlationId);

    let paymentResult;
    const discountPercent = proposedActionType === ActionType.OFFER_DISCOUNT ? 5.0 : 0;

    if (proposedActionType === ActionType.CREATE_PAYMENT_LINK || proposedActionType === ActionType.OFFER_DISCOUNT) {
      paymentResult = await this.paymentProvider.createPaymentLink(
        caseId,
        recoveryCase.amountDuePaise,
        discountPercent,
        paymentIdempotencyKey
      );
    } else {
      paymentResult = await this.paymentProvider.retryPayment(
        caseId,
        recoveryCase.amountDuePaise,
        paymentIdempotencyKey,
        diagnosisResult.category
      );
    }

    // Record PaymentAttempt
    await prisma.paymentAttempt.create({
      data: {
        invoiceId: recoveryCase.invoiceId,
        attemptNumber: recoveryCase.retryCount + 1,
        amountPaise: paymentResult.amountRecoveredPaise,
        idempotencyKey: paymentIdempotencyKey,
        status: paymentResult.success ? "SUCCESS" : "FAILED",
        failureReason: paymentResult.failureReason,
      },
    });

    if (paymentResult.success) {
      // Transition ACTION_AUTHORIZED -> AWAITING_PAYMENT -> PAID
      await this.updateCaseState(caseId, FSMState.AWAITING_PAYMENT, "PAYMENT_EXECUTED", correlationId);
      await this.updateCaseState(caseId, FSMState.PAID, "PAYMENT_CONFIRMED", correlationId);

      // Update Case Recovered Amount
      await prisma.recoveryCase.update({
        where: { id: caseId },
        data: { recoveredPaise: paymentResult.amountRecoveredPaise },
      });

      await prisma.recoveryAction.update({
        where: { id: actionRecord.id },
        data: { executionStatus: "COMPLETED" },
      });

      await this.createAuditEvent(
        caseId,
        "PAYMENT_SUCCEEDED",
        { amountRecovered: paymentResult.amountRecoveredPaise.toString() },
        correlationId
      );

      return {
        caseId,
        initialState,
        finalState: FSMState.PAID,
        diagnosis: diagnosisResult,
        action: actionRecord,
        policyDecision: {
          ...policyDecision,
          decision: "ALLOW",
        },
        paymentResult: {
          ...paymentResult,
          amountRecoveredPaise: paymentResult.amountRecoveredPaise.toString(),
        },
        recoveredPaise: paymentResult.amountRecoveredPaise.toString(),
      };
    } else {
      // Payment Failed -> Transition to HALTED
      await prisma.recoveryAction.update({
        where: { id: actionRecord.id },
        data: { executionStatus: "FAILED" },
      });

      await this.updateCaseState(caseId, FSMState.HALTED, "PAYMENT_FAILED", correlationId);
      await this.createAuditEvent(caseId, "PAYMENT_FAILED", { reason: paymentResult.failureReason }, correlationId);

      return {
        caseId,
        initialState,
        finalState: FSMState.HALTED,
        diagnosis: diagnosisResult,
        action: actionRecord,
        policyDecision: {
          ...policyDecision,
          decision: "ALLOW",
        },
        paymentResult: {
          ...paymentResult,
          amountRecoveredPaise: "0",
        },
        recoveredPaise: "0",
      };
    }
  }

  /**
   * Helper to safely update Case state in Prisma and log FSMTransitions.
   */
  private static async updateCaseState(
    caseId: string,
    toState: FSMState,
    trigger: string,
    correlationId: string
  ) {
    const currentCase = await prisma.recoveryCase.findUnique({ where: { id: caseId } });
    if (!currentCase) return;

    const fromState = currentCase.fsmState;
    if (fromState === toState) return;

    if (!canTransition(fromState, toState)) {
      throw new Error(`Forbidden FSM transition: ${fromState} -> ${toState}`);
    }

    await prisma.recoveryCase.update({
      where: { id: caseId },
      data: { fsmState: toState },
    });

    await prisma.fSMTransition.create({
      data: {
        caseId,
        fromState,
        toState,
        trigger,
        actor: "SYSTEM",
        correlationId,
      },
    });
  }

  /**
   * Helper to write immutable AuditEvent records.
   */
  private static async createAuditEvent(
    caseId: string,
    eventType: string,
    payload: Record<string, any>,
    correlationId: string
  ) {
    await prisma.auditEvent.create({
      data: {
        caseId,
        eventType,
        actor: "SYSTEM",
        payload,
        previousHash: "genesis",
        currentHash: crypto
          .createHash("sha256")
          .update(`${caseId}:${eventType}:${Date.now()}`)
          .digest("hex"),
        correlationId,
      },
    });
  }
}
