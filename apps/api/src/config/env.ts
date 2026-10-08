import { z } from "zod";
import * as dotenv from "dotenv";

// Load .env (local development fallback)
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  GEMINI_API_KEY: z.string().optional(),
  LOG_LEVEL: z.enum(["error", "warn", "info", "http", "verbose", "debug", "silly"]).default("info"),
  AWS_REGION: z.string().optional(),
  AI_MODE: z.enum(["gemini", "mock"]).default("mock"),
  POLICY_MAX_RETRIES: z.coerce.number().default(3),
  POLICY_MAX_DISCOUNT_PERCENT: z.coerce.number().default(5.0),
  POLICY_DND_START_HOUR: z.coerce.number().default(9),
  POLICY_DND_END_HOUR: z.coerce.number().default(20),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("❌ Invalid environment variables:", _env.error.format());
  process.exit(1);
}

export const env = _env.data;
