import { inngest } from "../client.js";
import { fetchPRDiff, postReviewComments } from "@cleriocode/github";
import { generateCodeReview } from "@cleriocode/ai";
import type { ReviewComment } from "@cleriocode/ai";
import { prisma } from "@cleriocode/db";

export const aiReviewWorkflow = inngest.createFunction(
  { id: "ai-review", retries: 3 },
  { event: "pr/review.requested" },
  async ({ event, step }) => {
    const { pullRequestId, installationId, owner, repo, prNumber, workspaceId } =
      event.data;

    // Step 1: Check credits
    const hasCredits = await step.run("check-credits", async () => {
      const workspace = await prisma.workspace.findFirst({
        where: { id: workspaceId },
        select: { reviewCredits: true },
      });
      return (workspace?.reviewCredits ?? 0) > 0;
    });

    if (!hasCredits) {
      return { status: "skipped", reason: "no_credits" };
    }

    // Step 2: Create pending review record
    const reviewId = await step.run("create-pending-review", async () => {
      const pr = await prisma.pullRequest.findUniqueOrThrow({
        where: { id: pullRequestId },
        select: { headSha: true },
      });
      const review = await prisma.aIReview.create({
        data: {
          status: "in_progress",
          comments: [],
          pullRequestId,
          reviewedCommitSha: pr.headSha,
        },
      });
      return review.id;
    });

    // Step 3: Fetch diff
    const diff = await step.run("fetch-diff", async () => {
      return fetchPRDiff(installationId, owner, repo, prNumber);
    });

    // Step 4: Generate review
    const review = await step.run("generate-review", async () => {
      return generateCodeReview(diff);
    });

    // Step 5: Persist review + post to GitHub + decrement credits
    await step.run("persist-and-post", async () => {
      const status = review.overallStatus === "passed" ? "passed" : "completed";

      await prisma.aIReview.update({
        where: { id: reviewId },
        data: {
          status,
          comments: JSON.parse(JSON.stringify(review.comments)),
          summary: review.summary,
        },
      });

      // Post to GitHub
      const commentBody = formatReviewComment(review.summary, review.comments);
      await postReviewComments(installationId, owner, repo, prNumber, commentBody);

      // Decrement credits
      await prisma.workspace.update({
        where: { id: workspaceId },
        data: { reviewCredits: { decrement: 1 } },
      });

      // Record in ledger
      await prisma.reviewCreditLedger.create({
        data: {
          workspaceId,
          amount: -1,
          reason: "review_consumed",
          referenceId: reviewId,
        },
      });
    });

    return { status: "completed", reviewId };
  }
);

function formatReviewComment(summary: string, comments: ReviewComment[]): string {
  let body = `## 🤖 AI Code Review\n\n${summary}\n\n`;

  if (comments.length === 0) {
    body += "✅ No issues found. Code looks good!\n";
  } else {
    body += "### Issues Found\n\n";
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
