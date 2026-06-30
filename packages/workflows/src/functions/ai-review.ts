import { inngest } from "../client.js";
import { postReviewComments } from "@cleriocode/github";
import {
  generateContextReview,
  chunkPrFiles,
  buildPrNamespace,
  buildRepoNamespace,
  saveChunksToPinecone,
  searchPrContext,
} from "@cleriocode/ai";
import { prisma } from "@cleriocode/db";
import { fetchPRFiles } from "./helpers/fetch-pr-files.js";

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

    // Step 2: Mark PR as processing + create pending review
    const { reviewId, title } = await step.run("mark-processing", async () => {
      const pr = await prisma.pullRequest.update({
        where: { id: pullRequestId },
        data: { status: "processing" },
        select: { headSha: true, title: true },
      });

      const review = await prisma.aIReview.create({
        data: {
          status: "in_progress",
          comments: [],
          pullRequestId,
          reviewedCommitSha: pr.headSha,
        },
      });

      return { reviewId: review.id, title: pr.title };
    });

    // Step 3: Fetch PR files and chunk them
    const chunks = await step.run("fetch-and-chunk-diff", async () => {
      const files = await fetchPRFiles(installationId, owner, repo, prNumber);
      return chunkPrFiles(prNumber, files);
    });

    // Early exit if no code changes
    if (chunks.length === 0) {
      await step.run("mark-reviewed-no-code", async () => {
        await prisma.aIReview.update({
          where: { id: reviewId },
          data: { status: "passed", summary: "No code changes to review." },
        });
        await prisma.pullRequest.update({
          where: { id: pullRequestId },
          data: { status: "reviewed" },
        });
      });
      return { status: "completed", reviewId, reason: "no_code_changes" };
    }

    // Step 4: Save chunks to Pinecone (PR namespace)
    const repoFullName = `${owner}/${repo}`;
    const namespace = buildPrNamespace(repoFullName, prNumber);

    await step.run("save-vectors-to-pinecone", async () => {
      await saveChunksToPinecone(namespace, chunks);
    });

    // Step 5: Wait for Pinecone to index vectors
    await step.sleep("wait-for-vectors-to-index", "10s");

    // Step 6: Search repo-wide context (if codebase is synced)
    const repoContextSnippets = await step.run("search-repo-context", async () => {
      const repoSync = await prisma.repoSync.findUnique({
        where: { repoFullName },
      });

      if (!repoSync || repoSync.status !== "synced") {
        return [];
      }

      const repoNamespace = buildRepoNamespace(repoFullName);
      return searchPrContext(repoNamespace, title);
    });

    // Step 7: Search PR context + generate AI review
    const reviewText = await step.run("generate-ai-review", async () => {
      const contextSnippets = await searchPrContext(namespace, title);

      return generateContextReview({
        repoFullName,
        title,
        contextSnippets,
        repoContextSnippets,
      });
    });

    // Step 8: Post comment to GitHub + persist + decrement credits
    await step.run("post-and-persist", async () => {
      // Post review to GitHub
      await postReviewComments(installationId, owner, repo, prNumber, reviewText);

      // Persist review
      await prisma.aIReview.update({
        where: { id: reviewId },
        data: {
          status: "completed",
          summary: reviewText,
          comments: [],
        },
      });

      // Mark PR as reviewed
      await prisma.pullRequest.update({
        where: { id: pullRequestId },
        data: { status: "reviewed" },
      });

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
