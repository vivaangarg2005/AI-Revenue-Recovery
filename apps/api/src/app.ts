import express from "express";
import cors from "cors";
import { correlationIdMiddleware } from "./middleware/correlationId.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { healthRouter } from "./routes/health.routes.js";
import { policyRouter } from "./routes/policy.routes.js";
import { aiRouter } from "./routes/ai.routes.js";
import { recoveryRouter } from "./routes/recovery.routes.js";
import { simulationRouter } from "./routes/simulation.routes.js";

export const app = express();

const allowedOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";

app.use(cors({ origin: allowedOrigin }));
app.use(express.json({ limit: "100kb" }));

export function requireApiKey(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  if (
    process.env.NODE_ENV === "production" &&
    req.header("x-api-key") !== process.env.INTERNAL_API_KEY
  ) {
    res.sendStatus(401);
    return;
  }
  next();
}

app.use(requireApiKey);
app.use(correlationIdMiddleware);

// API Routes (v1)
app.use("/api/v1", healthRouter);
app.use("/api/v1", policyRouter);
app.use("/api/v1", aiRouter);
app.use("/api/v1", recoveryRouter);
app.use("/api/v1", simulationRouter);

// Global Centralized Error Handler
app.use(errorHandler);
