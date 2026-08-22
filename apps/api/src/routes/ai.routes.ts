import { Router, Request, Response } from "express";
import { DiagnosisInputSchema, P2PExtractionInputSchema } from "../domain/ai/ai.schemas.js";
import { getAIProvider } from "../domain/ai/aiFactory.js";

export const aiRouter = Router();

/**
 * POST /api/v1/ai/diagnose
 * Endpoint for running AI payment failure diagnosis.
 * Pure diagnostic endpoint — zero database mutation.
 */
aiRouter.post("/ai/diagnose", async (req: Request, res: Response) => {
  const parseResult = DiagnosisInputSchema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid diagnosis input payload",
        details: parseResult.error.flatten(),
      },
    });
    return;
  }

  try {
    const provider = getAIProvider();
    const result = await provider.diagnosePaymentFailure(parseResult.data);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      error: {
        code: "AI_DIAGNOSIS_ERROR",
        message: err.message || "Failed to execute AI diagnosis",
      },
    });
  }
});

/**
 * POST /api/v1/ai/extract-p2p
 * Endpoint for Promise-to-Pay intent extraction.
 * Pure extraction endpoint — zero database mutation.
 */
aiRouter.post("/ai/extract-p2p", async (req: Request, res: Response) => {
  const parseResult = P2PExtractionInputSchema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid P2P extraction input payload",
        details: parseResult.error.flatten(),
      },
    });
    return;
  }

  try {
    const provider = getAIProvider();
    const result = await provider.extractPromiseToPay(parseResult.data);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      error: {
        code: "AI_P2P_EXTRACTION_ERROR",
        message: err.message || "Failed to execute P2P intent extraction",
      },
    });
  }
});
