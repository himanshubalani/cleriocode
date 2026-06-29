import { z } from "zod";

export const taskSchema = z.object({
  title: z.string().describe("Task title"),
  description: z.string().describe("Detailed task description"),
  complexity: z
    .enum(["low", "medium", "high"])
    .describe("Estimated complexity"),
});

export const taskBreakdownSchema = z.object({
  tasks: z.array(taskSchema),
});

export type TaskOutput = z.infer<typeof taskSchema>;
export type TaskBreakdownOutput = z.infer<typeof taskBreakdownSchema>;
