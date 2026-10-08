import { SimulationRunner } from "./src/domain/simulation/SimulationRunner.js";
import { serializeBigInt } from "./src/utils/bigintSerializer.js";

async function run() {
  console.log("Running simulation...");
  const result = await SimulationRunner.runSimulation(20260822);
  console.log(JSON.stringify(serializeBigInt(result.metrics), null, 2));
}

run().catch(console.error);
