import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default("4000"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  OPENAI_API_KEY: z.string().default("sk-proj-placeholder"),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  RAZORPAY_KEY_ID: z.string().default("rzp_test_placeholder"),
  RAZORPAY_KEY_SECRET: z.string().default("placeholder_secret"),
  RAZORPAY_WEBHOOK_SECRET: z.string().default("whsec_placeholder"),
  POLICY_MAX_DISCOUNT_PERCENT: z
    .string()
    .transform((val) => parseFloat(val))
    .default("5.0"),
  POLICY_MAX_RETRIES: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default("3"),
  POLICY_DND_START_HOUR: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default("9"),
  POLICY_DND_END_HOUR: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default("20"),
});

export const env = envSchema.parse(process.env);
