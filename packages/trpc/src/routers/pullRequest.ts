import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prisma } from "@cleriocode/db";
import { router, workspaceProcedure } from "../trpc.js";

export const pullRequestRouter = router({
  /**
   * Lists pull requests for a connected repository.
   * Verifies workspace ownership via the project relationship.
   * Requirements: 3.4
   */
  list: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string().min(1),
        repositoryId: z.string().min(1),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify workspace owns the repository via its project
      const repository = await prisma.repository.findFirst({
        where: {
          id: input.repositoryId,
          project: { workspaceId: ctx.workspaceId },
        },
      });

      if (!repository) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Repository not found",
        });
      }

      return prisma.pullRequest.findMany({
        where: { repositoryId: input.repositoryId },
        include: {
          reviews: {
            select: { id: true, status: true, createdAt: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),
});
