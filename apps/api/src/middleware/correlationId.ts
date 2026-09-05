import { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";

export function correlationIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const correlationId =
    (req.headers["x-correlation-id"] as string) ||
    `corr_${crypto.randomBytes(8).toString("hex")}`;

  req.headers["x-correlation-id"] = correlationId;
  res.setHeader("X-Correlation-ID", correlationId);
  next();
}
