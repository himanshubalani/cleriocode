import { createOpenRouter } from "@openrouter/ai-sdk-provider";

// Uses OPENROUTER_API_KEY environment variable
export const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Default model for all AI operations
export const DEFAULT_MODEL = "openrouter/owl-alpha";
