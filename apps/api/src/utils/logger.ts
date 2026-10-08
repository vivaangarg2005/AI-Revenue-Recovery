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

const redactPII = winston.format((info) => {
  const maskEmail = (email: string) => email.replace(/(?<=.).(?=.*@)/g, "*");
  const maskPhone = (phone: string) => phone.replace(/\d(?=\d{4})/g, "*");
  const maskSecret = () => "********";

  const traverseAndMask = (obj: any, seen = new WeakSet()) => {
    if (typeof obj !== "object" || obj === null) return obj;
    if (seen.has(obj)) return obj;
    seen.add(obj);

    for (const key in obj) {
      if (typeof obj[key] === "string") {
        if (/(password|secret|apikey|api_key|token|jwt|authorization)/i.test(key)) {
          obj[key] = maskSecret();
        } else if (/email/i.test(key) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(obj[key])) {
          obj[key] = maskEmail(obj[key]);
        } else if (/(phone|mobile)/i.test(key) || /^\+?\d{10,15}$/.test(obj[key])) {
          obj[key] = maskPhone(obj[key]);
        }
      } else if (typeof obj[key] === "object") {
        traverseAndMask(obj[key], seen);
      }
    }
    return obj;
  };

  // Clone the info object to avoid mutating the original reference if it's reused
  const originalSymbols = Object.getOwnPropertySymbols(info);
  const clonedInfo = JSON.parse(JSON.stringify(info, (key, value) => {
    if (value instanceof Error) {
      return { message: value.message, stack: value.stack };
    }
    return value;
  }));
  
  traverseAndMask(clonedInfo);

  // Restore Winston symbols
  for (const sym of originalSymbols) {
    clonedInfo[sym] = (info as any)[sym];
  }

  return clonedInfo;
});

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: combine(
    errors({ stack: true }),
    timestamp(),
    redactPII(),
    env.NODE_ENV === "development" ? colorize() : winston.format.uncolorize(),
    env.NODE_ENV === "development" ? devFormat : json()
  ),
  defaultMeta: { service: "recover-ai-api" },
  transports: [
    new winston.transports.Console()
  ],
});
