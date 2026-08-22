import { ActionType } from "../policy/policy.types.js";

export type Cohort = "CONTROL" | "TREATMENT";

export interface GroundTruth {
  actualFailureCategory: string;
  canRecover: boolean;
  maxRecoverableAmountPaise: bigint;
  naturalRecoveryProbability: number;
  bestRecoveryAction: ActionType;
  inboundP2PMessage?: string;
  expectedP2PIntent?: string;
}

export interface SyntheticCase {
  id: string;
  caseIndex: number;
  cohort: Cohort;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerTier: "STANDARD" | "ENTERPRISE";
  isOptedOut: boolean;
  planName: string;
  amountPaise: bigint;
  failureCode: string;
  failureMessage: string;
  failureCategory: string;
  groundTruth: GroundTruth;
}

export interface CaseOutcome {
  caseId: string;
  cohort: Cohort;
  initialState: string;
  finalState: string;
  amountPaise: bigint;
  recoveredPaise: bigint;
  discountCostPaise: bigint;
  netRecoveredPaise: bigint;
  aiDiagnosisCategory?: string;
  aiDiagnosisConfidence?: number;
  policyDecision?: string;
  strategyUsed?: string;
  retryCount: number;
  isEscalated: boolean;
  isPolicyBlocked: boolean;
  isCorrectDiagnosis: boolean;
  isUnnecessaryIntervention: boolean;
  hasP2P: boolean;
  p2pIntent?: string;
  p2pAccepted?: boolean;
}

export interface ExperimentSummaryMetrics {
  simulationId: string;
  seed: number;
  totalCases: number;
  controlCount: number;
  treatmentCount: number;
  
  totalRiskPaise: string;
  
  controlGrossRecoveredPaise: string;
  treatmentGrossRecoveredPaise: string;
  
  controlNetRecoveredPaise: string;
  treatmentNetRecoveredPaise: string;

  controlRecoveryRatePercent: number;
  treatmentRecoveryRatePercent: number;
  
  incrementalRecoveredPaise: string;
  netRoiIncreasePaise: string;
  recoveryLiftPercent: number;
  
  discountCostPaise: string;
  
  aiDiagnosisAccuracyPercent: number;
  p2pExtractionAccuracyPercent: number;
  
  escalationCount: number;
  policyBlockCount: number;
  unnecessaryInterventionRatePercent: number;
}
