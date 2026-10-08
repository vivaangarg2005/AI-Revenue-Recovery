import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { correlationIdMiddleware } from "./middleware/correlationId.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { healthRouter } from "./routes/health.routes.js";
import { policyRouter } from "./routes/policy.routes.js";
import { aiRouter } from "./routes/ai.routes.js";
import { recoveryRouter } from "./routes/recovery.routes.js";
import { simulationRouter } from "./routes/simulation.routes.js";
import { logger } from "./utils/logger.js";

export const app = express();

const allowedOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";

app.use(cors({ origin: allowedOrigin }));
app.use(express.json({ limit: "100kb" }));

// Rate Limiting Middleware
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

app.use("/api/", apiLimiter);

// Request Logging Middleware
app.use((req, res, next) => {
  const reqId = req.headers["x-correlation-id"] || "unknown";
  logger.http(`Incoming Request`, { 
    method: req.method, 
    path: req.path, 
    correlationId: reqId 
  });
  next();
});

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
