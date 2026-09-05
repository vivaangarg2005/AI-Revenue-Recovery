import { Request, Response, NextFunction } from "express";

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
): void {
  const statusCode = err.statusCode || 500;
  const correlationId =
    (req.headers["x-correlation-id"] as string) || "unknown";

  const errorResponse = {
    error: {
      code: err.code || "INTERNAL_SERVER_ERROR",
      message: err.message || "An unexpected error occurred",
      correlationId,
      ...(process.env.NODE_ENV === "development"
        ? { details: err.details, stack: err.stack }
        : {}),
    },
  };

  res.status(statusCode).json(errorResponse);
}
