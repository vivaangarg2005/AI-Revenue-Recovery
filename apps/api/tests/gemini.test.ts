import { describe, it, expect, vi, beforeEach } from "vitest";
import { GeminiAIProvider } from "../src/domain/ai/GeminiAIProvider.js";

// Mock the GoogleGenAI sdk
vi.mock("@google/genai", () => {
  return {
    GoogleGenAI: vi.fn().mockImplementation(() => ({
      models: {
        generateContent: vi.fn(),
      },
    })),
  };
});

describe("GeminiAIProvider Backoff Retry", () => {
  let provider: GeminiAIProvider;
  let mockGenerateContent: any;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = "fake-key";
    provider = new GeminiAIProvider();
    
    // Extract the mocked generateContent from the instance
    mockGenerateContent = (provider as any).ai.models.generateContent;
  });

  it("should retry on 429 error and succeed on 3rd attempt", async () => {
    // 1st call: throw 429
    // 2nd call: throw 429
    // 3rd call: succeed
    mockGenerateContent
      .mockRejectedValueOnce({ status: 429, message: "Too many requests 429" })
      .mockRejectedValueOnce({ status: 429, message: "Too many requests 429" })
      .mockResolvedValueOnce({
        text: JSON.stringify({
          category: "TEMPORARY_FAILURE",
          rootCause: "test",
          confidence: 0.9,
          recommendedStrategy: "SCHEDULED_RETRY",
          recommendedDelayDays: 2
        })
      });

    // We can speed up the test by mocking setTimeout or just let it run (it uses 1000 + 2000 = 3s)
    // To avoid waiting 3 seconds in unit tests, we'll spy on setTimeout
    vi.useFakeTimers();
    
    const promise = provider.diagnosePaymentFailure({
      failureCode: "ERR",
      failureMessage: "test",
      amountPaise: "100",
      customerTier: "STANDARD"
    });

    // Fast-forward timers for the retries
    await vi.runAllTimersAsync();
    
    const result = await promise;
    
    expect(mockGenerateContent).toHaveBeenCalledTimes(3);
    expect(result.category).toBe("TEMPORARY_FAILURE");
    
    vi.useRealTimers();
  });
});
