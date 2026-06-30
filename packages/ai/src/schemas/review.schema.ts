import { z } from "zod";

export const reviewCommentSchema = z.object({
  file: z.string().describe("File path"),
  line: z.number().optional().describe("Line number if applicable"),
  severity: z.enum(["critical", "warning", "suggestion"]).describe("Issue severity"),
  message: z.string().describe("Review comment explaining the issue"),
});

export const codeReviewSchema = z.object({
  summary: z.string().describe("Overall review summary"),
  comments: z.array(reviewCommentSchema).describe("Individual review comments"),
  overallStatus: z.enum(["passed", "needs_changes"]).describe("Whether the PR passes review"),
});

export type CodeReview = z.infer<typeof codeReviewSchema>;
export type ReviewComment = z.infer<typeof reviewCommentSchema>;

/**
 * Enforces the overallStatus/severity invariant: if any comment has
 * "critical" or "warning" severity, overallStatus must be "needs_changes".
 * Call this after parsing to correct inconsistent model outputs.
 */
export function enforceStatusInvariant(review: CodeReview): CodeReview {
  const hasBlockingIssues = review.comments.some(
    (c) => c.severity === "critical" || c.severity === "warning"
  );
  if (hasBlockingIssues && review.overallStatus === "passed") {
    return { ...review, overallStatus: "needs_changes" };
  }
  return review;
}
