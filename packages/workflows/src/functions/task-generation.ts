import { inngest } from "../client.js";
import { generateTaskBreakdown } from "@cleriocode/ai";
import { prisma } from "@cleriocode/db";
import type { PRDContent } from "@cleriocode/ai";

export const taskGenerationWorkflow = inngest.createFunction(
  { id: "task-generation", retries: 3 },
  { event: "task/generation.requested" },
  async ({ event, step }) => {
    const { prdId } = event.data;

    // Step 1: Fetch the PRD
    const prd = await step.run("fetch-prd", async () => {
      const result = await prisma.pRD.findUniqueOrThrow({
        where: { id: prdId },
        select: { id: true, content: true, status: true },
      });
      return result;
    });

    // Step 2: Generate tasks using AI
    const taskBreakdown = await step.run("generate-tasks", async () => {
      return generateTaskBreakdown(prd.content as unknown as PRDContent);
    });

    // Step 3: Persist tasks
    await step.run("persist-tasks", async () => {
      const taskData = taskBreakdown.tasks.map((task, index) => ({
        title: task.title,
        description: task.description,
        complexity: task.complexity,
        status: "todo" as const,
        order: index,
        prdId,
      }));

      await prisma.task.createMany({ data: taskData });
    });

    return { status: "completed", prdId, taskCount: taskBreakdown.tasks.length };
  }
);
