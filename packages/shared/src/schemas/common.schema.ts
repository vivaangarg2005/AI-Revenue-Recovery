import { z } from "zod";

export const APIErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    correlationId: z.string(),
    details: z.unknown().optional(),
  }),
});

export type APIErrorResponseDTO = z.infer<typeof APIErrorResponseSchema>;
