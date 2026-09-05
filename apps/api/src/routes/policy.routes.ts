import { Router, Request, Response } from "express";
import { z } from "zod";
import { FSMState } from "@prisma/client";
import { ActionType } from "../domain/policy/policy.types.js";
import { evaluatePolicy } from "../domain/policy/policy.js";

export const policyRouter = Router();

const EvaluatePolicySchema = z.object({
  currentState: z.nativeEnum(FSMState),
  action: z.nativeEnum(ActionType),
  retryCount: z.number().int().min(0),
  discountPercent: z.number().optional().default(0),
  isOptedOut: z.boolean().optional().default(false),
  customerTier: z
    .enum(["STANDARD", "ENTERPRISE"])
    .optional()
    .default("STANDARD"),
  aiConfidence: z.number().min(0).max(1).optional().default(0.95),
});

/**
 * POST /api/v1/policy/evaluate
 * Development/Demo endpoint for evaluating Policy Gatekeeper rules.
 */
policyRouter.post("/policy/evaluate", (req: Request, res: Response) => {
  const parseResult = EvaluatePolicySchema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid policy evaluation input",
        details: parseResult.error.flatten(),
      },
    });
    return;
  }

  const decision = evaluatePolicy(parseResult.data);
  res.json(decision);
});
