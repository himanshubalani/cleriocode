import { z } from "zod";

export const prdSchema = z.object({
  goals: z.array(z.string()).describe("List of goals this feature aims to achieve"),
  requirements: z.array(z.object({
    title: z.string(),
    description: z.string(),
    priority: z.enum(["must", "should", "could"]),
  })).describe("Functional requirements"),
  acceptanceCriteria: z.array(z.string()).describe("Testable acceptance criteria"),
  technicalNotes: z.array(z.string()).describe("Technical considerations and constraints"),
  nonGoals: z.array(z.string()).optional().describe("Explicitly out of scope items"),
  edgeCases: z.array(z.string()).optional().describe("Edge cases to consider"),
});

export type PRDContent = z.infer<typeof prdSchema>;
