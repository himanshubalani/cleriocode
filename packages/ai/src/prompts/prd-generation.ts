import { generateObject } from "ai";
import { openrouter, DEFAULT_MODEL } from "../config.js";
import { prdSchema, type PRDContent } from "../schemas/prd.schema.js";

export async function generatePRD(featureRequest: {
  title: string;
  description: string;
}): Promise<PRDContent> {
  const result = await generateObject({
    model: openrouter(DEFAULT_MODEL),
    schema: prdSchema,
    prompt: `You are a senior product manager. Generate a structured Product Requirements Document (PRD) for the following feature request.

Feature Title: ${featureRequest.title}

Feature Description:
${featureRequest.description}

Generate comprehensive goals, detailed requirements with priorities, testable acceptance criteria, technical considerations, non-goals (out of scope), and edge cases.`,
  });
  return result.object;
}
