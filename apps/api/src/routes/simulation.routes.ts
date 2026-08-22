import { Router, Request, Response } from "express";
import { z } from "zod";
import { SimulationRunner } from "../domain/simulation/SimulationRunner.js";
import { serializeBigInt } from "../utils/bigintSerializer.js";

export const simulationRouter = Router();

// In-memory cache for fast local simulation experiment runs
const cachedSimulations = new Map<string, any>();

const RunSimulationSchema = z.object({
  seed: z.number().int().optional().default(20260822),
});

/**
 * POST /api/v1/simulations
 * Triggers a 500-case counterfactual experiment run.
 */
simulationRouter.post("/simulations", async (req: Request, res: Response) => {
  const parseResult = RunSimulationSchema.safeParse(req.body);
  const seed = parseResult.success ? parseResult.data.seed : 20260822;

  try {
    const result = await SimulationRunner.runSimulation(seed);
    cachedSimulations.set(result.metrics.simulationId, result);
    cachedSimulations.set("latest", result);

    res.status(201).json(serializeBigInt(result.metrics));
  } catch (err: any) {
    res.status(500).json({
      error: {
        code: "SIMULATION_FAILED",
        message: err.message || "Failed to execute simulation",
      },
    });
  }
});

/**
 * GET /api/v1/simulations/latest
 * Fetches latest simulation summary metrics.
 */
simulationRouter.get("/simulations/latest", async (req: Request, res: Response) => {
  let latest = cachedSimulations.get("latest");

  if (!latest) {
    // Automatically run default simulation if not cached yet
    latest = await SimulationRunner.runSimulation(20260822);
    cachedSimulations.set(latest.metrics.simulationId, latest);
    cachedSimulations.set("latest", latest);
  }

  res.json(serializeBigInt(latest.metrics));
});

/**
 * GET /api/v1/simulations/:id
 * Fetches specific simulation summary metrics.
 */
simulationRouter.get("/simulations/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const sim = cachedSimulations.get(id) || cachedSimulations.get("latest");

  if (!sim) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Simulation not found" } });
    return;
  }

  res.json(serializeBigInt(sim.metrics));
});

/**
 * GET /api/v1/simulations/:id/cases
 * Returns paired cases for side-by-side Control vs RECOVER-AI comparison.
 */
simulationRouter.get("/simulations/:id/cases", async (req: Request, res: Response) => {
  const { id } = req.params;
  let sim = cachedSimulations.get(id) || cachedSimulations.get("latest");

  if (!sim) {
    sim = await SimulationRunner.runSimulation(20260822);
    cachedSimulations.set(sim.metrics.simulationId, sim);
    cachedSimulations.set("latest", sim);
  }

  // Combine Control and Treatment outcomes into side-by-side comparison array
  const pairedCases = sim.controlOutcomes.map((ctrl: any, idx: number) => {
    const treat = sim.treatmentOutcomes[idx];
    return {
      caseIndex: idx + 1,
      caseId: ctrl.caseId,
      amountPaise: ctrl.amountPaise.toString(),
      control: {
        finalState: ctrl.finalState,
        recoveredPaise: ctrl.recoveredPaise.toString(),
        retryCount: ctrl.retryCount,
      },
      treatment: {
        finalState: treat.finalState,
        recoveredPaise: treat.recoveredPaise.toString(),
        netRecoveredPaise: treat.netRecoveredPaise.toString(),
        aiCategory: treat.aiDiagnosisCategory,
        strategyUsed: treat.strategyUsed,
        policyDecision: treat.policyDecision,
        isEscalated: treat.isEscalated,
        isPolicyBlocked: treat.isPolicyBlocked,
      },
    };
  });

  res.json(serializeBigInt(pairedCases));
});
