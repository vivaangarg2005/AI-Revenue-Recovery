import { SimulationRunner } from "../apps/api/src/domain/simulation/SimulationRunner.js";

async function main() {
  const seeds = [20260822, 20260823, 20260824, 20260825];
  console.log(`==================================================`);
  console.log(`RECOVER-AI 500-CASE MULTI-SEED EXPERIMENT RUNNER`);
  console.log(`Seeds Evaluated: ${seeds.join(", ")}`);
  console.log(`==================================================\n`);

  const summaryRows: any[] = [];
  let totalLiftSum = 0;

  for (const seed of seeds) {
    const { metrics } = await SimulationRunner.runSimulation(seed);

    const ctrlINR = (
      BigInt(metrics.controlNetRecoveredPaise) / BigInt(100)
    ).toLocaleString("en-IN");
    const treatINR = (
      BigInt(metrics.treatmentNetRecoveredPaise) / BigInt(100)
    ).toLocaleString("en-IN");
    const incINR = (
      BigInt(metrics.incrementalRecoveredPaise) / BigInt(100)
    ).toLocaleString("en-IN");

    totalLiftSum += metrics.recoveryLiftPercent;

    summaryRows.push({
      Seed: seed,
      "Control Net (₹)": `₹${ctrlINR}`,
      "RECOVER-AI Net (₹)": `₹${treatINR}`,
      "Incremental (₹)": `₹${incINR}`,
      "Lift %": `+${metrics.recoveryLiftPercent}%`,
      "AI Acc %": `${metrics.aiDiagnosisAccuracyPercent}%`,
      Escalations: metrics.escalationCount,
      "Unneeded %": `${metrics.unnecessaryInterventionRatePercent}%`,
    });
  }

  console.table(summaryRows);

  const averageLift = (totalLiftSum / seeds.length).toFixed(2);
  console.log(`\n==================================================`);
  console.log(
    `AVERAGE TREATMENT RECOVERY LIFT ACROSS 4 SEEDS: +${averageLift}%`,
  );
  console.log(`==================================================`);
  console.log(
    `✓ Multi-seed robustness evaluation completed successfully at ₹0 cost.`,
  );
}

main().catch((err) => {
  console.error("Simulation run failed:", err);
  process.exit(1);
});
