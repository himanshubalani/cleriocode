import { z } from "zod";

export const reviewCommentSchema = z.object({
  file: z.string().describe("File path"),
  line: z.number().describe("Line number"),
  severity: z
    .enum(["critical", "warning", "suggestion"])
    .describe("Issue severity"),
  message: z.string().describe("Review comment message"),
});

export const codeReviewSchema = z.object({
  comments: z.array(reviewCommentSchema),
  summary: z.string().describe("Overall review summary"),
  passed: z
    .boolean()
    .describe(
      "Whether the code passes review (no critical/warning issues)"
    ),
});

export type ReviewCommentOutput = z.infer<typeof reviewCommentSchema>;
export type CodeReviewOutput = z.infer<typeof codeReviewSchema>;
