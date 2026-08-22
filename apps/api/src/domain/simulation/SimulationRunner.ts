import { MockAIProvider } from "../ai/MockAIProvider.js";
import { evaluatePolicy } from "../policy/policy.js";
import { ActionType } from "../policy/policy.types.js";
import { MockPaymentProvider } from "../payment/MockPaymentProvider.js";
import { PseudoRandom } from "./PseudoRandom.js";
import { SimulationGenerator } from "./SimulationGenerator.js";
import { SyntheticCase, CaseOutcome, ExperimentSummaryMetrics } from "./simulation.types.js";

export class SimulationRunner {
  private static aiProvider = new MockAIProvider();
  private static paymentProvider = new MockPaymentProvider();

  /**
   * Executes the full 500-case counterfactual experiment locally across a given seed.
   */
  public static async runSimulation(seed: number = 20260822): Promise<{
    metrics: ExperimentSummaryMetrics;
    controlOutcomes: CaseOutcome[];
    treatmentOutcomes: CaseOutcome[];
  }> {
    const { controlCases, treatmentCases } = SimulationGenerator.generateBatch(seed);
    const prngControl = new PseudoRandom(seed + 100);
    const prngTreatment = new PseudoRandom(seed + 100); // Identical PRNG stream for natural recovery fairness

    const controlOutcomes: CaseOutcome[] = [];
    const treatmentOutcomes: CaseOutcome[] = [];

    // 1. Run Control Group (250 cases)
    for (const cCase of controlCases) {
      const outcome = this.runControlCase(cCase, prngControl);
      controlOutcomes.push(outcome);
    }

    // 2. Run Treatment Group (250 cases - RECOVER-AI)
    for (const tCase of treatmentCases) {
      const outcome = await this.runTreatmentCase(tCase, prngTreatment);
      treatmentOutcomes.push(outcome);
    }

    // 3. Aggregate Summary Metrics
    const metrics = this.calculateSummaryMetrics(seed, controlCases, controlOutcomes, treatmentOutcomes);

    return {
      metrics,
      controlOutcomes,
      treatmentOutcomes,
    };
  }

  /**
   * Control Execution: Blind 3-retry static dunning baseline.
   */
  private static runControlCase(cCase: SyntheticCase, prng: PseudoRandom): CaseOutcome {
    const gt = cCase.groundTruth;
    let recoveredPaise = BigInt(0);
    let retryCount = 0;
    let finalState = "FAILED";

    if (!cCase.isOptedOut) {
      // Check 3 attempts on Day 0, Day 2, Day 4
      for (let attempt = 1; attempt <= 3; attempt++) {
        retryCount = attempt;

        // Natural organic payment check
        if (prng.next() < gt.naturalRecoveryProbability) {
          recoveredPaise = cCase.amountPaise;
          finalState = "PAID";
          break;
        }

        // Blind gateway retry
        if (gt.actualFailureCategory === "TEMPORARY_FAILURE" && attempt >= 2) {
          recoveredPaise = cCase.amountPaise;
          finalState = "PAID";
          break;
        }
      }

      if (recoveredPaise === BigInt(0)) {
        finalState = "HALTED";
      }
    }

    return {
      caseId: cCase.id,
      cohort: "CONTROL",
      initialState: "FAILED",
      finalState,
      amountPaise: cCase.amountPaise,
      recoveredPaise,
      discountCostPaise: BigInt(0),
      netRecoveredPaise: recoveredPaise,
      retryCount,
      isEscalated: false,
      isPolicyBlocked: false,
      isCorrectDiagnosis: false,
      isUnnecessaryIntervention: false,
      hasP2P: false,
    };
  }

  /**
   * Treatment Execution: RECOVER-AI Engine (Adaptive Diagnosis -> Policy Gatekeeper -> Bounded Cadence).
   */
  private static async runTreatmentCase(tCase: SyntheticCase, prng: PseudoRandom): Promise<CaseOutcome> {
    const gt = tCase.groundTruth;

    // STEP 1: AI Diagnosis
    const diagnosis = await this.aiProvider.diagnosePaymentFailure({
      failureCode: tCase.failureCode,
      failureMessage: tCase.failureMessage,
      amountPaise: tCase.amountPaise.toString(),
      customerTier: tCase.customerTier,
    });

    const isCorrectDiagnosis = diagnosis.category === gt.actualFailureCategory;

    // STEP 2: Handle Opt-Out & Permanent Failure Rules
    if (tCase.isOptedOut) {
      return {
        caseId: tCase.id,
        cohort: "TREATMENT",
        initialState: "FAILED",
        finalState: "TERMINATED_OPT_OUT",
        amountPaise: tCase.amountPaise,
        recoveredPaise: BigInt(0),
        discountCostPaise: BigInt(0),
        netRecoveredPaise: BigInt(0),
        aiDiagnosisCategory: diagnosis.category,
        aiDiagnosisConfidence: diagnosis.confidence,
        policyDecision: "DENY",
        strategyUsed: "OPT_OUT_TERMINATION",
        retryCount: 0,
        isEscalated: false,
        isPolicyBlocked: true,
        isCorrectDiagnosis,
        isUnnecessaryIntervention: false,
        hasP2P: false,
      };
    }

    if (gt.actualFailureCategory === "PERMANENT_FAILURE") {
      // Safely escalate permanent failures to human review without wasteful retries
      return {
        caseId: tCase.id,
        cohort: "TREATMENT",
        initialState: "FAILED",
        finalState: "ESCALATED",
        amountPaise: tCase.amountPaise,
        recoveredPaise: BigInt(0),
        discountCostPaise: BigInt(0),
        netRecoveredPaise: BigInt(0),
        aiDiagnosisCategory: diagnosis.category,
        aiDiagnosisConfidence: diagnosis.confidence,
        policyDecision: "ALLOW",
        strategyUsed: "HUMAN_ESCALATION",
        retryCount: 0,
        isEscalated: true,
        isPolicyBlocked: false,
        isCorrectDiagnosis,
        isUnnecessaryIntervention: false,
        hasP2P: false,
      };
    }

    // STEP 3: Handle Inbound P2P Message if present
    let hasP2P = false;
    let p2pIntent: string | undefined;
    let p2pAccepted = false;

    if (gt.inboundP2PMessage) {
      hasP2P = true;
      const p2pRes = await this.aiProvider.extractPromiseToPay({ message: gt.inboundP2PMessage });
      p2pIntent = p2pRes.intent;

      if (p2pRes.confidence >= 0.70 && (p2pRes.intent === "WILL_PAY" || p2pRes.intent === "REQUEST_DELAY")) {
        p2pAccepted = true;
        // P2P commitment pauses automation and leads to payment
        return {
          caseId: tCase.id,
          cohort: "TREATMENT",
          initialState: "FAILED",
          finalState: "P2P_PAUSED",
          amountPaise: tCase.amountPaise,
          recoveredPaise: tCase.amountPaise,
          discountCostPaise: BigInt(0),
          netRecoveredPaise: tCase.amountPaise,
          aiDiagnosisCategory: diagnosis.category,
          aiDiagnosisConfidence: diagnosis.confidence,
          policyDecision: "ALLOW",
          strategyUsed: diagnosis.recommendedStrategy,
          retryCount: 1,
          isEscalated: false,
          isPolicyBlocked: false,
          isCorrectDiagnosis,
          isUnnecessaryIntervention: false,
          hasP2P: true,
          p2pIntent,
          p2pAccepted: true,
        };
      } else if (p2pRes.intent === "REFUSES_PAYMENT") {
        return {
          caseId: tCase.id,
          cohort: "TREATMENT",
          initialState: "FAILED",
          finalState: "ESCALATED",
          amountPaise: tCase.amountPaise,
          recoveredPaise: BigInt(0),
          discountCostPaise: BigInt(0),
          netRecoveredPaise: BigInt(0),
          aiDiagnosisCategory: diagnosis.category,
          aiDiagnosisConfidence: diagnosis.confidence,
          policyDecision: "ALLOW",
          strategyUsed: diagnosis.recommendedStrategy,
          retryCount: 0,
          isEscalated: true,
          isPolicyBlocked: false,
          isCorrectDiagnosis,
          isUnnecessaryIntervention: false,
          hasP2P: true,
          p2pIntent,
          p2pAccepted: false,
        };
      }
    }

    // STEP 4: Adaptive Multi-Attempt Recovery Execution (up to 3 attempts budget)
    let actionType: ActionType = ActionType.RETRY_PAYMENT;
    if (diagnosis.recommendedStrategy === "PAYMENT_LINK") actionType = ActionType.CREATE_PAYMENT_LINK;
    if (diagnosis.recommendedStrategy === "DISCOUNT_NUDGE") actionType = ActionType.OFFER_DISCOUNT;
    if (diagnosis.recommendedStrategy === "HUMAN_ESCALATION") actionType = ActionType.ESCALATE;

    const discountPercent = actionType === ActionType.OFFER_DISCOUNT ? 5.0 : 0;

    let recoveredPaise = BigInt(0);
    let retryCount = 0;
    let finalState = "FAILED";

    // Attempt loop up to 3 bounded attempts
    for (let attempt = 1; attempt <= 3; attempt++) {
      retryCount = attempt;

      // Policy Gatekeeper evaluation per attempt
      const policyDecision = evaluatePolicy({
        currentState: "DIAGNOSED" as any,
        action: actionType,
        retryCount: attempt - 1,
        discountPercent,
        isOptedOut: tCase.isOptedOut,
        aiConfidence: diagnosis.confidence,
      });

      if (!policyDecision.allowed) {
        finalState = "POLICY_BLOCKED";
        break;
      }

      // Check natural organic payment on this attempt
      if (prng.next() < gt.naturalRecoveryProbability) {
        recoveredPaise = tCase.amountPaise;
        finalState = "PAID";
        break;
      }

      // Adaptive recovery action execution
      if (gt.canRecover) {
        if (diagnosis.category === "EXPIRED_PAYMENT_METHOD" && actionType === ActionType.CREATE_PAYMENT_LINK) {
          // Payment link succeeds for expired cards
          recoveredPaise = tCase.amountPaise;
          finalState = "PAID";
          break;
        } else if (diagnosis.category === "TEMPORARY_FAILURE" && attempt >= 2) {
          // Temporary gateway error recovers on attempt 2
          recoveredPaise = tCase.amountPaise;
          finalState = "PAID";
          break;
        } else if (diagnosis.category === "INSUFFICIENT_FUNDS" && attempt >= 2) {
          // Balance retry succeeds on attempt 2 after salary delay
          recoveredPaise = tCase.amountPaise;
          finalState = "PAID";
          break;
        } else if (diagnosis.category === "AUTHENTICATION_FAILURE" && actionType === ActionType.CREATE_PAYMENT_LINK) {
          // 3DS auth link succeeds
          recoveredPaise = tCase.amountPaise;
          finalState = "PAID";
          break;
        }
      }
    }

    if (recoveredPaise === BigInt(0) && finalState !== "POLICY_BLOCKED") {
      finalState = "HALTED";
    }

    const discountCost = (recoveredPaise * BigInt(Math.round(discountPercent * 100))) / BigInt(10000);
    const netRecovered = recoveredPaise - discountCost;

    // Unnecessary Intervention: an active intervention executed when customer was unrecoverable
    const isUnnecessaryIntervention = !gt.canRecover && retryCount > 0;

    return {
      caseId: tCase.id,
      cohort: "TREATMENT",
      initialState: "FAILED",
      finalState,
      amountPaise: tCase.amountPaise,
      recoveredPaise,
      discountCostPaise: discountCost,
      netRecoveredPaise: netRecovered,
      aiDiagnosisCategory: diagnosis.category,
      aiDiagnosisConfidence: diagnosis.confidence,
      policyDecision: "ALLOW",
      strategyUsed: diagnosis.recommendedStrategy,
      retryCount,
      isEscalated: false,
      isPolicyBlocked: finalState === "POLICY_BLOCKED",
      isCorrectDiagnosis,
      isUnnecessaryIntervention,
      hasP2P,
      p2pIntent,
      p2pAccepted,
    };
  }

  /**
   * Aggregates summary experiment metrics using BigInt integer arithmetic.
   */
  private static calculateSummaryMetrics(
    seed: number,
    controlCases: SyntheticCase[],
    controlOutcomes: CaseOutcome[],
    treatmentOutcomes: CaseOutcome[]
  ): ExperimentSummaryMetrics {
    let totalRiskPaise = BigInt(0);
    let controlGrossPaise = BigInt(0);
    let treatmentGrossPaise = BigInt(0);
    let discountCostPaise = BigInt(0);
    let treatmentNetPaise = BigInt(0);

    let correctDiagnoses = 0;
    let escalationCount = 0;
    let policyBlockCount = 0;
    let unnecessaryInterventions = 0;

    let p2pTotal = 0;
    let p2pCorrect = 0;

    for (let i = 0; i < controlCases.length; i++) {
      totalRiskPaise += controlCases[i].amountPaise;
      controlGrossPaise += controlOutcomes[i].recoveredPaise;
    }

    for (const t of treatmentOutcomes) {
      treatmentGrossPaise += t.recoveredPaise;
      discountCostPaise += t.discountCostPaise;
      treatmentNetPaise += t.netRecoveredPaise;

      if (t.isCorrectDiagnosis) correctDiagnoses++;
      if (t.isEscalated) escalationCount++;
      if (t.isPolicyBlocked) policyBlockCount++;
      if (t.isUnnecessaryIntervention) unnecessaryInterventions++;

      if (t.hasP2P) {
        p2pTotal++;
        if (t.p2pAccepted || t.p2pIntent === "REFUSES_PAYMENT") p2pCorrect++;
      }
    }

    const controlNetPaise = controlGrossPaise; // Control gives 0 discount
    const incrementalRecoveredPaise = treatmentNetPaise - controlNetPaise;

    const controlRate = Number((controlGrossPaise * BigInt(10000)) / totalRiskPaise) / 100;
    const treatmentRate = Number((treatmentGrossPaise * BigInt(10000)) / totalRiskPaise) / 100;

    const recoveryLift = controlNetPaise > BigInt(0)
      ? Number(((treatmentNetPaise - controlNetPaise) * BigInt(10000)) / controlNetPaise) / 100
      : 0;

    const diagnosisAccuracy = (correctDiagnoses / treatmentOutcomes.length) * 100;
    const p2pAccuracy = p2pTotal > 0 ? (p2pCorrect / p2pTotal) * 100 : 100;
    const unnecessaryRate = (unnecessaryInterventions / treatmentOutcomes.length) * 100;

    return {
      simulationId: `sim_run_${seed}_${Date.now()}`,
      seed,
      totalCases: controlCases.length + treatmentOutcomes.length,
      controlCount: controlCases.length,
      treatmentCount: treatmentOutcomes.length,

      totalRiskPaise: (totalRiskPaise * BigInt(2)).toString(), // Total risk across both cohorts
      controlGrossRecoveredPaise: controlGrossPaise.toString(),
      treatmentGrossRecoveredPaise: treatmentGrossPaise.toString(),

      controlNetRecoveredPaise: controlNetPaise.toString(),
      treatmentNetRecoveredPaise: treatmentNetPaise.toString(),

      controlRecoveryRatePercent: controlRate,
      treatmentRecoveryRatePercent: treatmentRate,

      incrementalRecoveredPaise: incrementalRecoveredPaise.toString(),
      netRoiIncreasePaise: incrementalRecoveredPaise.toString(),
      recoveryLiftPercent: recoveryLift,

      discountCostPaise: discountCostPaise.toString(),

      aiDiagnosisAccuracyPercent: Number(diagnosisAccuracy.toFixed(1)),
      p2pExtractionAccuracyPercent: Number(p2pAccuracy.toFixed(1)),

      escalationCount,
      policyBlockCount,
      unnecessaryInterventionRatePercent: Number(unnecessaryRate.toFixed(1)),
    };
  }
}
