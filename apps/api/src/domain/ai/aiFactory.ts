import { AIProvider } from "./ai.types.js";
import { MockAIProvider } from "./MockAIProvider.js";
import { OpenAIProvider } from "./OpenAIProvider.js";

/**
 * Creates an AIProvider instance.
 * Defaults to MockAIProvider (ZERO API cost).
 */
export function getAIProvider(overrideMode?: string): AIProvider {
  const mode = overrideMode || process.env.AI_MODE || "mock";
  const apiKey = process.env.OPENAI_API_KEY;

  if (mode === "openai" && apiKey) {
    return new OpenAIProvider(apiKey);
  }

  return new MockAIProvider();
}
