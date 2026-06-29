import { inngest } from "../client.js";
import { fetchIncrementalDiff, postReviewComments } from "@cleriocode/github";
import { generateReReview } from "@cleriocode/ai";
import type { ReviewComment } from "@cleriocode/ai";
import { prisma } from "@cleriocode/db";

export const reReviewWorkflow = inngest.createFunction(
  { id: "re-review", retries: 3 },
  { event: "pr/re-review.requested" },
  async ({ event, step }) => {
    const {
      pullRequestId,
      previousReviewId,
      installationId,
      owner,
      repo,
      prNumber,
      baseSha,
      headSha,
      workspaceId,
    } = event.data;

    // Step 1: Get previous review comments
    const previousComments = await step.run("get-previous-comments", async () => {
      const previous = await prisma.aIReview.findUniqueOrThrow({
        where: { id: previousReviewId },
        select: { comments: true },
      });
      return previous.comments as unknown as ReviewComment[];
    });

    // Step 2: Fetch incremental diff
    const diff = await step.run("fetch-incremental-diff", async () => {
      return fetchIncrementalDiff(installationId, owner, repo, baseSha, headSha);
    });

    // Step 3: Generate re-review
    const review = await step.run("generate-re-review", async () => {
      return generateReReview(diff, previousComments);
    });

    // Step 4: Persist re-review + post to GitHub + decrement credit if passed
    const reviewId = await step.run("persist-re-review", async () => {
      const status = review.overallStatus === "passed" ? "passed" : "completed";

      const newReview = await prisma.aIReview.create({
        data: {
          status,
          comments: JSON.parse(JSON.stringify(review.comments)),
          summary: review.summary,
          pullRequestId,
          previousReviewId,
          reviewedCommitSha: headSha,
        },
      });

      // Post to GitHub
      const commentBody = formatReReviewComment(review.summary, review.comments);
      await postReviewComments(installationId, owner, repo, prNumber, commentBody);

      // Consume credit only if review passed
      if (status === "passed") {
        await prisma.workspace.update({
          where: { id: workspaceId },
          data: { reviewCredits: { decrement: 1 } },
        });
        await prisma.reviewCreditLedger.create({
          data: {
            workspaceId,
            amount: -1,
            reason: "review_consumed",
            referenceId: newReview.id,
          },
        });
      }

      return newReview.id;
    });

    return { status: "completed", reviewId };
  }
);

function formatReReviewComment(summary: string, comments: ReviewComment[]): string {
  let body = `## 🤖 AI Re-Review\n\n${summary}\n\n`;

  if (comments.length === 0) {
    body += "✅ All previous issues resolved!\n";
  } else {
    body += "### Remaining Issues\n\n";
    for (const comment of comments) {
      const icon =
        comment.severity === "critical"
          ? "🔴"
          : comment.severity === "warning"
            ? "🟡"
            : "🔵";
      body += `${icon} **[${comment.severity}]** \`${comment.file}${comment.line ? `:${comment.line}` : ""}\`\n`;
      body += `  ${comment.message}\n\n`;
    }
  }

  return body;
}
