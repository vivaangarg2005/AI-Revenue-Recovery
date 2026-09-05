import { AIProvider } from "./ai.types.js";
import { MockAIProvider } from "./MockAIProvider.js";
import { GeminiAIProvider } from "./GeminiAIProvider.js";

let cachedProvider: AIProvider | null = null;
let currentProviderName: "Gemini" | "Mock" = "Mock";

export function getAIProvider(): AIProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const mode = (process.env.AI_MODE || "mock").toLowerCase();
  const geminiKey = process.env.GEMINI_API_KEY;
  const isVitest = !!process.env.VITEST || process.env.NODE_ENV === "test";

  // Automated tests and batch simulations strictly use MockAIProvider to avoid rate limits
  if (mode === "gemini" && geminiKey && !isVitest) {
    try {
      cachedProvider = new GeminiAIProvider(geminiKey);
      currentProviderName = "Gemini";
      console.log(
        `[AIFactory] Initialized GeminiAIProvider with model: ${process.env.GEMINI_MODEL || "gemini-2.5-flash"}`,
      );
      return cachedProvider;
    } catch (err: any) {
      console.warn(
        `[AIFactory] Failed to initialize GeminiAIProvider (${err.message}). Falling back to MockAIProvider.`,
      );
    }
  }

  cachedProvider = new MockAIProvider();
  currentProviderName = "Mock";
  return cachedProvider;
}

export function getAIProviderName(): "Gemini" | "Mock" {
  getAIProvider();
  return currentProviderName;
}

export function resetAIProviderCache(): void {
  cachedProvider = null;
  currentProviderName = "Mock";
}
