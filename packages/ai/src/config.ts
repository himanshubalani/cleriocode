import { createOpenAI } from "@ai-sdk/openai";

/**
 * OpenRouter provider configuration.
 * Uses OPENROUTER_API_KEY env var to authenticate.
 * Model selection: pass model ID string to the returned function.
 *
 * Environment variables:
 * - OPENROUTER_API_KEY: API key for OpenRouter
 */
export const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});
