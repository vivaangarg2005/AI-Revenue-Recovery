import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { mockPrismaInstance } from "./mockPrisma.js";

vi.mock("../src/infrastructure/database/prisma.js", () => ({
  prisma: mockPrismaInstance,
}));

import { app } from "../src/app.js";

describe("GET /api/v1/health", () => {
  it("should return health status payload with X-Correlation-ID header", async () => {
    const response = await request(app).get("/api/v1/health");

    expect(response.headers["x-correlation-id"]).toBeDefined();
    expect(response.body).toHaveProperty("service", "recover-ai-api");
    expect(response.body).toHaveProperty("status");
    expect(response.body).toHaveProperty("services");
    expect(response.body.services).toHaveProperty("api", "ok");
  });
});
