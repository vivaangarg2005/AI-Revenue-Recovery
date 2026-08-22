import { describe, it, expect } from "vitest";
import { env } from "../src/config/env.js";

describe("Environment Variable Configuration", () => {
  it("should validate default configuration and numeric policy bounds", () => {
    expect(env.PORT).toBeTypeOf("number");
    expect(env.POLICY_MAX_DISCOUNT_PERCENT).toBe(5.0);
    expect(env.POLICY_MAX_RETRIES).toBe(3);
    expect(env.POLICY_DND_START_HOUR).toBe(9);
    expect(env.POLICY_DND_END_HOUR).toBe(20);
  });
});
