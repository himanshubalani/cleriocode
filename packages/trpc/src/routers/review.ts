import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prisma } from "@cleriocode/db";
import { router, workspaceProcedure } from "../trpc.js";

export const reviewRouter = router({
  /**
   * Lists AI reviews for a pull request.
   * Verifies workspace ownership via repository → project relationship.
   * Requirements: 9.5
   */
  list: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string().min(1),
        pullRequestId: z.string().min(1),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify workspace owns the PR via repository → project
      const pr = await prisma.pullRequest.findFirst({
        where: {
          id: input.pullRequestId,
          repository: {
            project: { workspaceId: ctx.workspaceId },
          },
        },
      });

      if (!pr) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pull request not found",
        });
      }

      return prisma.aIReview.findMany({
        where: { pullRequestId: input.pullRequestId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          comments: true,
          summary: true,
          previousReviewId: true,
          reviewedCommitSha: true,
          createdAt: true,
        },
      });
    }),
});
