import { z } from "zod";

export const taskSchema = z.object({
  title: z.string().describe("Short task title"),
  description: z.string().describe("Detailed task description"),
  complexity: z.enum(["low", "medium", "high"]).describe("Estimated complexity"),
});

export const taskBreakdownSchema = z.object({
  tasks: z.array(taskSchema).describe("List of engineering tasks"),
});

export type TaskBreakdown = z.infer<typeof taskBreakdownSchema>;
export type TaskItem = z.infer<typeof taskSchema>;
