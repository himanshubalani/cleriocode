import { generateObject } from "ai";
import { openrouter, DEFAULT_MODEL } from "../config.js";
import { taskBreakdownSchema, type TaskBreakdown } from "../schemas/task.schema.js";
import type { PRDContent } from "../schemas/prd.schema.js";

export async function generateTaskBreakdown(prd: PRDContent): Promise<TaskBreakdown> {
  const result = await generateObject({
    model: openrouter(DEFAULT_MODEL),
    schema: taskBreakdownSchema,
    prompt: `You are a senior software engineer. Break down the following PRD into discrete engineering tasks suitable for a Kanban board.

PRD Goals:
${prd.goals.join("\n- ")}

Requirements:
${prd.requirements.map(r => `[${r.priority}] ${r.title}: ${r.description}`).join("\n")}

Acceptance Criteria:
${prd.acceptanceCriteria.join("\n- ")}

Technical Notes:
${prd.technicalNotes.join("\n- ")}

Generate tasks with clear titles, detailed descriptions, and complexity estimates (low/medium/high). Tasks should be independently implementable.`,
  });
  return result.object;
}
