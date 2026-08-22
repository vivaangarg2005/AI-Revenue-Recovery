import { z } from "zod";

export const ServiceStatusSchema = z.enum(["ok", "degraded", "down"]);

export const HealthCheckResponseSchema = z.object({
  status: z.enum(["ok", "degraded", "down"]),
  service: z.string(),
  version: z.string(),
  timestamp: z.string(),
  services: z.object({
    api: ServiceStatusSchema,
    database: ServiceStatusSchema,
    redis: ServiceStatusSchema,
  }),
});

export type HealthCheckResponseDTO = z.infer<typeof HealthCheckResponseSchema>;
