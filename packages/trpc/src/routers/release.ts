import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  approveRelease,
  listReleases,
  DomainError,
} from "@cleriocode/services";
import { router, workspaceProcedure } from "../trpc.js";

/**
 * Maps domain-level errors to appropriate TRPCError codes.
 */
function mapDomainError(err: unknown): never {
  if (err instanceof DomainError) {
    const codeMap: Record<string, TRPCError["code"]> = {
      NOT_FOUND: "NOT_FOUND",
      FORBIDDEN: "FORBIDDEN",
      CONFLICT: "CONFLICT",
      EXTERNAL_SERVICE_ERROR: "INTERNAL_SERVER_ERROR",
    };

    throw new TRPCError({
      code: codeMap[err.code] ?? "BAD_REQUEST",
      message: err.message,
    });
  }
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred",
  });
}

export const releaseRouter = router({
  /**
   * Approves a release for a project.
   * Validates admin/owner role, all tasks done, PRs passed.
   * Requirements: 8.2
   */
  approve: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string().min(1),
        projectId: z.string().min(1),
        version: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await approveRelease(
          input.projectId,
          ctx.workspaceId,
          ctx.user!.id,
          input.version
        );
      } catch (err) {
        mapDomainError(err);
      }
    }),

  /**
   * Lists all releases for a project.
   * Requirements: 8.5
   */
  list: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string().min(1),
        projectId: z.string().min(1),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        return await listReleases(input.projectId, ctx.workspaceId);
      } catch (err) {
        mapDomainError(err);
      }
    }),
});
