import { describe, it, expect } from "vitest";
import { serializeBigInt } from "../src/utils/bigintSerializer.js";

describe("BigInt Serializer Utility", () => {
  it("should convert standalone BigInt to string", () => {
    const value = 499900n;
    const result = serializeBigInt(value);
    expect(result).toBe("499900");
  });

  it("should recursively convert BigInt in nested objects and arrays", () => {
    const payload = {
      subscriptionId: "sub_123",
      amountPaise: 149950n,
      nested: {
        balancePaise: 5000n,
        items: [{ pricePaise: 100n }, { pricePaise: 200n }],
      },
    };

    const serialized = serializeBigInt(payload);

    expect(serialized).toEqual({
      subscriptionId: "sub_123",
      amountPaise: "149950",
      nested: {
        balancePaise: "5000",
        items: [{ pricePaise: "100" }, { pricePaise: "200" }],
      },
    });
    // Ensure JSON.stringify works without throwing
    expect(() => JSON.stringify(serialized)).not.toThrow();
  });
});
