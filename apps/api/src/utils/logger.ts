import winston from "winston";
import { env } from "../config/env.js";

const { combine, timestamp, json, printf, colorize, errors } = winston.format;

// Custom format for local development
const devFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  let log = `${timestamp} [${level}]: ${message}`;
  if (Object.keys(meta).length) {
    log += ` | ${JSON.stringify(meta)}`;
  }
  if (stack) {
    log += `\n${stack}`;
  }
  return log;
});

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: combine(
    errors({ stack: true }),
    timestamp(),
    env.NODE_ENV === "development" ? colorize() : winston.format.uncolorize(),
    env.NODE_ENV === "development" ? devFormat : json()
  ),
  defaultMeta: { service: "recover-ai-api" },
  transports: [
    new winston.transports.Console()
  ],
});
