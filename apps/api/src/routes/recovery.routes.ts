import { Router, Request, Response } from "express";
import { z } from "zod";
import crypto from "node:crypto";
import { FSMState } from "@prisma/client";
import { prisma } from "../infrastructure/database/prisma.js";
import { RecoveryService } from "../domain/recovery/RecoveryService.js";
import { getAIProvider } from "../domain/ai/aiFactory.js";
import { serializeBigInt } from "../utils/bigintSerializer.js";

export const recoveryRouter = Router();

const CreateCaseSchema = z.object({
  customerId: z.string().optional(),
  subscriptionId: z.string().optional(),
  invoiceId: z.string().optional(),
  failureCode: z.string().min(1),
  failureMessage: z.string(),
  amountPaise: z.union([z.string(), z.number()]).optional().default(99900),
  customerTier: z.enum(["STANDARD", "ENTERPRISE"]).optional().default("STANDARD"),
  isOptedOut: z.boolean().optional().default(false),
});

const P2PSchema = z.object({
  message: z.string().min(1),
  currentDate: z.string().optional(),
  customerTimezone: z.string().optional().default("Asia/Kolkata"),
});

/**
 * POST /api/v1/recovery-cases
 * Creates a new failed-payment RecoveryCase in PostgreSQL.
 */
recoveryRouter.post("/recovery-cases", async (req: Request, res: Response) => {
  const parseResult = CreateCaseSchema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid recovery case input",
        details: parseResult.error.flatten(),
      },
    });
    return;
  }

  const data = parseResult.data;
  const amountPaise = BigInt(data.amountPaise);
  const correlationId = `corr_${crypto.randomBytes(8).toString("hex")}`;

  try {
    // Ensure Customer exists or create default demo customer
    let customer = await prisma.customer.findFirst({
      where: data.customerId ? { id: data.customerId } : { email: "demo.customer@example.com" },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          email: "demo.customer@example.com",
          name: "Demo Merchant Customer",
          phone: "+919876543210",
          tier: data.customerTier,
          isOptedOut: data.isOptedOut,
        },
      });
    }

    // Ensure Subscription exists
    let subscription = await prisma.subscription.findFirst({
      where: data.subscriptionId ? { id: data.subscriptionId } : { customerId: customer.id },
    });

    if (!subscription) {
      subscription = await prisma.subscription.create({
        data: {
          customerId: customer.id,
          planName: "Pro Tier Monthly Plan",
          amountPaise,
        },
      });
    }

    // Ensure Invoice exists
    let invoice = await prisma.invoice.findFirst({
      where: data.invoiceId ? { id: data.invoiceId } : { subscriptionId: subscription.id },
    });

    if (!invoice) {
      invoice = await prisma.invoice.create({
        data: {
          subscriptionId: subscription.id,
          amountDuePaise: amountPaise,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    }

    // Create RecoveryCase in FAILED state
    const recoveryCase = await prisma.recoveryCase.create({
      data: {
        subscriptionId: subscription.id,
        invoiceId: invoice.id,
        fsmState: FSMState.FAILED,
        amountDuePaise: amountPaise,
      },
    });

    // Create FailureEvent record
    await prisma.failureEvent.create({
      data: {
        caseId: recoveryCase.id,
        rawProviderCode: data.failureCode,
        normalizedCategory: data.failureMessage,
      },
    });

    // Record initial FSM transition & audit event
    await prisma.fSMTransition.create({
      data: {
        caseId: recoveryCase.id,
        fromState: FSMState.FAILED,
        toState: FSMState.FAILED,
        trigger: "CASE_CREATED",
        actor: "SYSTEM",
        correlationId,
      },
    });

    await prisma.auditEvent.create({
      data: {
        caseId: recoveryCase.id,
        eventType: "EVT_RECOVERY_CASE_CREATED",
        actor: "SYSTEM",
        payload: { failureCode: data.failureCode, amountPaise: amountPaise.toString() },
        previousHash: "genesis",
        currentHash: crypto
          .createHash("sha256")
          .update(`${recoveryCase.id}:EVT_RECOVERY_CASE_CREATED:${Date.now()}`)
          .digest("hex"),
        correlationId,
      },
    });

    res.status(201).json(serializeBigInt(recoveryCase));
  } catch (err: any) {
    res.status(500).json({
      error: {
        code: "CASE_CREATION_FAILED",
        message: err.message || "Failed to create recovery case",
      },
    });
  }
});

/**
 * POST /api/v1/recovery-cases/:id/run
 * Executes the complete AI recovery workflow.
 */
recoveryRouter.post("/recovery-cases/:id/run", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await RecoveryService.runRecoveryWorkflow(id);
    res.json(serializeBigInt(result));
  } catch (err: any) {
    res.status(500).json({
      error: {
        code: "WORKFLOW_EXECUTION_FAILED",
        message: err.message || "Failed to run recovery workflow",
      },
    });
  }
});

/**
 * POST /api/v1/recovery-cases/:id/p2p
 * Ingests inbound P2P message, extracts intent, and updates FSM accordingly.
 */
recoveryRouter.post("/recovery-cases/:id/p2p", async (req: Request, res: Response) => {
  const { id } = req.params;
  const parseResult = P2PSchema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid P2P payload",
        details: parseResult.error.flatten(),
      },
    });
    return;
  }

  const correlationId = `corr_${crypto.randomBytes(8).toString("hex")}`;

  try {
    const recoveryCase = await prisma.recoveryCase.findUnique({
      where: { id },
      include: {
        subscription: {
          include: { customer: true },
        },
      },
    });

    if (!recoveryCase) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Recovery case not found" } });
      return;
    }

    const customer = recoveryCase.subscription?.customer || { tier: "STANDARD", isOptedOut: false };

    // Call AI P2P Extractor
    const aiProvider = getAIProvider();
    const p2pResult = await aiProvider.extractPromiseToPay(parseResult.data);

    // Save P2P Commitment record
    const p2pCommitment = await prisma.p2PCommitment.create({
      data: {
        caseId: id,
        rawCustomerMessage: parseResult.data.message,
        intent: p2pResult.intent,
        confidence: p2pResult.confidence,
        promisedIsoDate: p2pResult.promisedDate ? new Date(p2pResult.promisedDate) : null,
      },
    });

    await prisma.auditEvent.create({
      data: {
        caseId: id,
        eventType: "EVT_P2P_RECEIVED",
        actor: "CUSTOMER",
        payload: { intent: p2pResult.intent, confidence: p2pResult.confidence },
        previousHash: "genesis",
        currentHash: crypto
          .createHash("sha256")
          .update(`${id}:EVT_P2P_RECEIVED:${Date.now()}`)
          .digest("hex"),
        correlationId,
      },
    });

    // Evaluate P2P rules: confidence >= 0.70 and valid intent
    const isAccepted =
      p2pResult.confidence >= 0.70 &&
      (p2pResult.intent === "WILL_PAY" || p2pResult.intent === "REQUEST_DELAY") &&
      !customer.isOptedOut;

    if (isAccepted) {
      // Transition FSM to P2P_PAUSED
      await prisma.recoveryCase.update({
        where: { id },
        data: { fsmState: FSMState.P2P_PAUSED },
      });

      await prisma.fSMTransition.create({
        data: {
          caseId: id,
          fromState: recoveryCase.fsmState,
          toState: FSMState.P2P_PAUSED,
          trigger: "P2P_COMMITMENT_ACCEPTED",
          actor: "SYSTEM",
          correlationId,
        },
      });

      await prisma.auditEvent.create({
        data: {
          caseId: id,
          eventType: "EVT_P2P_ACCEPTED",
          actor: "SYSTEM",
          payload: { promisedDate: p2pResult.promisedDate },
          previousHash: "genesis",
          currentHash: crypto
            .createHash("sha256")
            .update(`${id}:EVT_P2P_ACCEPTED:${Date.now()}`)
            .digest("hex"),
          correlationId,
        },
      });

      res.json({
        accepted: true,
        fsmState: FSMState.P2P_PAUSED,
        p2p: p2pCommitment,
      });
    } else {
      // Reject commitment or escalate if refusal
      const targetState =
        p2pResult.intent === "REFUSES_PAYMENT" ? FSMState.ESCALATED : recoveryCase.fsmState;

      if (targetState !== recoveryCase.fsmState) {
        await prisma.recoveryCase.update({
          where: { id },
          data: { fsmState: targetState },
        });

        await prisma.fSMTransition.create({
          data: {
            caseId: id,
            fromState: recoveryCase.fsmState,
            toState: targetState,
            trigger: "P2P_REFUSAL_ESCALATED",
            actor: "SYSTEM",
            correlationId,
          },
        });
      }

      await prisma.auditEvent.create({
        data: {
          caseId: id,
          eventType: "EVT_P2P_REJECTED",
          actor: "SYSTEM",
          payload: { intent: p2pResult.intent, confidence: p2pResult.confidence },
          previousHash: "genesis",
          currentHash: crypto
            .createHash("sha256")
            .update(`${id}:EVT_P2P_REJECTED:${Date.now()}`)
            .digest("hex"),
          correlationId,
        },
      });

      res.json({
        accepted: false,
        fsmState: targetState,
        p2p: p2pCommitment,
      });
    }
  } catch (err: any) {
    res.status(500).json({
      error: {
        code: "P2P_PROCESSING_FAILED",
        message: err.message || "Failed to process P2P message",
      },
    });
  }
});

/**
 * GET /api/v1/recovery-cases/:id
 * Fetches complete details of a recovery case.
 */
recoveryRouter.get("/recovery-cases/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const recoveryCase = await prisma.recoveryCase.findUnique({
      where: { id },
      include: {
        subscription: {
          include: { customer: true },
        },
        invoice: true,
        AIDiagnosis: { orderBy: { createdAt: "desc" } },
        PolicyDecision: { orderBy: { createdAt: "desc" } },
        RecoveryAction: { orderBy: { createdAt: "desc" } },
        FailureEvent: { orderBy: { occurredAt: "desc" } },
        P2PCommitment: { orderBy: { createdAt: "desc" } },
        FSMTransition: { orderBy: { createdAt: "asc" } },
        AuditEvent: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!recoveryCase) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Recovery case not found" } });
      return;
    }

    res.json(serializeBigInt(recoveryCase));
  } catch (err: any) {
    res.status(500).json({
      error: {
        code: "FETCH_FAILED",
        message: err.message || "Failed to fetch recovery case",
      },
    });
  }
});
