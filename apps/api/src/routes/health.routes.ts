import { Router, Request, Response } from "express";
import { prisma } from "../infrastructure/database/prisma.js";
import { checkRedisHealth } from "../infrastructure/redis/redis.js";
import { HealthCheckResponseSchema } from "@recover-ai/shared";

export const healthRouter = Router();

healthRouter.get("/health", async (req: Request, res: Response) => {
  let dbStatus: "ok" | "degraded" | "down" = "down";
  let redisStatus: "ok" | "degraded" | "down" = "down";

  // Check Database
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "ok";
  } catch (err) {
    dbStatus = "down";
  }

  // Check Redis
  const isRedisOk = await checkRedisHealth();
  redisStatus = isRedisOk ? "ok" : "down";

  const overallStatus =
    dbStatus === "ok" && redisStatus === "ok"
      ? "ok"
      : dbStatus === "down" && redisStatus === "down"
      ? "down"
      : "degraded";

  const responsePayload = {
    status: overallStatus,
    service: "recover-ai-api",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    services: {
      api: "ok" as const,
      database: dbStatus,
      redis: redisStatus,
    },
  };

  const validatedResponse = HealthCheckResponseSchema.parse(responsePayload);
  const statusCode = overallStatus === "down" ? 503 : 200;

  res.status(statusCode).json(validatedResponse);
});
