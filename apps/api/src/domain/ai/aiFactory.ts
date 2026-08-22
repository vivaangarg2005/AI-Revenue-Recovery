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

  if ((mode === "gemini" || mode === "auto") && geminiKey) {
    try {
      cachedProvider = new GeminiAIProvider(geminiKey);
      currentProviderName = "Gemini";
      console.log(`[AIFactory] Initialized GeminiAIProvider with model: ${process.env.GEMINI_MODEL || "gemini-2.5-flash"}`);
      return cachedProvider;
    } catch (err: any) {
      console.warn(`[AIFactory] Failed to initialize GeminiAIProvider (${err.message}). Falling back to MockAIProvider.`);
    }
  }

  cachedProvider = new MockAIProvider();
  currentProviderName = "Mock";
  console.log(`[AIFactory] Initialized MockAIProvider ($0 cost mock mode).`);
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
