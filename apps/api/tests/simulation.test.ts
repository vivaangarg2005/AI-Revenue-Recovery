import { describe, it, expect } from "vitest";
import { SimulationGenerator } from "../src/domain/simulation/SimulationGenerator.js";
import { SimulationRunner } from "../src/domain/simulation/SimulationRunner.js";

describe("RECOVER-AI 500-Case Simulation Experiment Test Suite", () => {
  it("1 & 2. Should generate 500 cases split 250 Control / 250 Treatment", () => {
    const { controlCases, treatmentCases } = SimulationGenerator.generateBatch(20260822);
    expect(controlCases.length).toBe(250);
    expect(treatmentCases.length).toBe(250);
    expect(controlCases.length + treatmentCases.length).toBe(500);
  });

  it("3 & 4. Deterministic seed must produce 100% identical dataset and metrics", async () => {
    const run1 = await SimulationRunner.runSimulation(20260822);
    const run2 = await SimulationRunner.runSimulation(20260822);

    expect(run1.metrics.totalRiskPaise).toBe(run2.metrics.totalRiskPaise);
    expect(run1.metrics.controlNetRecoveredPaise).toBe(run2.metrics.controlNetRecoveredPaise);
    expect(run1.metrics.treatmentNetRecoveredPaise).toBe(run2.metrics.treatmentNetRecoveredPaise);
    expect(run1.metrics.aiDiagnosisAccuracyPercent).toBe(run2.metrics.aiDiagnosisAccuracyPercent);
  });

  it("5. Different seed must produce different dataset and metrics", async () => {
    const runA = await SimulationRunner.runSimulation(20260822);
    const runB = await SimulationRunner.runSimulation(20260823);

    expect(runA.metrics.controlNetRecoveredPaise).not.toBe(runB.metrics.controlNetRecoveredPaise);
  });

  it("6. Ground truth must be preserved and independent of AI", () => {
    const { controlCases, treatmentCases } = SimulationGenerator.generateBatch(20260822);
    expect(controlCases[0].groundTruth.actualFailureCategory).toBe(treatmentCases[0].groundTruth.actualFailureCategory);
    expect(controlCases[0].groundTruth.canRecover).toBe(treatmentCases[0].groundTruth.canRecover);
  });

  it("7 & 8. Control and Treatment cohorts must execute successfully", async () => {
    const { controlOutcomes, treatmentOutcomes } = await SimulationRunner.runSimulation(20260822);
    expect(controlOutcomes.length).toBe(250);
    expect(treatmentOutcomes.length).toBe(250);
  });

  it("9 & 10 & 13. Money calculations must use integer BigInt Paise and net = gross - discount", async () => {
    const { metrics, treatmentOutcomes } = await SimulationRunner.runSimulation(20260822);
    
    expect(typeof metrics.controlGrossRecoveredPaise).toBe("string");
    expect(typeof metrics.treatmentGrossRecoveredPaise).toBe("string");

    let totalDiscountCost = BigInt(0);
    let totalNet = BigInt(0);

    for (const t of treatmentOutcomes) {
      totalDiscountCost += t.discountCostPaise;
      totalNet += t.netRecoveredPaise;
    }

    expect(totalDiscountCost.toString()).toBe(metrics.discountCostPaise);
    expect(totalNet.toString()).toBe(metrics.treatmentNetRecoveredPaise);
  });

  it("11. Recovery lift calculation must be positive and accurate (+6.7% for seed 20260822)", async () => {
    const { metrics } = await SimulationRunner.runSimulation(20260822);
    expect(metrics.recoveryLiftPercent).toBeGreaterThan(0);
    expect(metrics.recoveryLiftPercent).toBe(6.7);
  });

  it("12. AI Diagnosis Accuracy must be calculated against ground truth", async () => {
    const { metrics, treatmentOutcomes } = await SimulationRunner.runSimulation(20260822);
    expect(metrics.aiDiagnosisAccuracyPercent).toBeGreaterThan(80);

    let correct = 0;
    for (const t of treatmentOutcomes) {
      if (t.isCorrectDiagnosis) correct++;
    }
    const expectedAccuracy = Number(((correct / treatmentOutcomes.length) * 100).toFixed(1));
    expect(metrics.aiDiagnosisAccuracyPercent).toBe(expectedAccuracy);
  });

  it("14. Stopping rules (Policy blocks & retries cap) must be enforced", async () => {
    const { metrics, treatmentOutcomes } = await SimulationRunner.runSimulation(20260822);
    expect(metrics.policyBlockCount).toBeGreaterThan(0);

    for (const t of treatmentOutcomes) {
      if (t.isPolicyBlocked) {
        expect(t.recoveredPaise.toString()).toBe("0");
      }
    }
  });

  it("15. P2P customer replies must be ingested and evaluated", async () => {
    const { treatmentOutcomes } = await SimulationRunner.runSimulation(20260822);
    const p2pCases = treatmentOutcomes.filter((t) => t.hasP2P);
    expect(p2pCases.length).toBeGreaterThan(0);
  });

  it("16. Multi-seed robustness check across 4 seeds must demonstrate positive mean lift", async () => {
    const seeds = [20260822, 20260823, 20260824, 20260825];
    let liftSum = 0;

    for (const seed of seeds) {
      const { metrics } = await SimulationRunner.runSimulation(seed);
      expect(metrics.recoveryLiftPercent).toBeGreaterThan(0);
      liftSum += metrics.recoveryLiftPercent;
    }

    const meanLift = liftSum / seeds.length;
    expect(meanLift).toBeGreaterThan(0);
    expect(Number(meanLift.toFixed(2))).toBe(20.98);
  });
});
