import { z } from "zod";

export const prdSchema = z.object({
  goals: z.array(z.string()).describe("High-level goals this feature addresses"),
  requirements: z
    .array(z.string())
    .describe("Functional requirements"),
  acceptanceCriteria: z
    .array(z.string())
    .describe("Testable acceptance criteria"),
  technicalNotes: z
    .array(z.string())
    .describe("Technical considerations and constraints"),
});

export type PRDOutput = z.infer<typeof prdSchema>;
