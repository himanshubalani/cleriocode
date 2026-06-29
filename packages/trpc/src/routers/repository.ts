import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  connectRepository,
  listRepositories,
  triggerRepoSync,
  getRepoSyncStatuses,
  getRepoSyncStatus,
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

export const repositoryRouter = router({
  /**
   * Connects a GitHub repository to a project within a workspace.
   * Requirements: 3.2
   */
  connect: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string().min(1),
        projectId: z.string().min(1),
        owner: z.string().min(1),
        name: z.string().min(1),
        installationId: z.number().int().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await connectRepository(
          input.projectId,
          ctx.workspaceId,
          input.owner,
          input.name,
          input.installationId
        );
      } catch (err) {
        mapDomainError(err);
      }
    }),

  /**
   * Lists all repositories connected to a project.
   * Requirements: 3.2
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
        return await listRepositories(input.projectId, ctx.workspaceId);
      } catch (err) {
        mapDomainError(err);
      }
    }),

  /**
   * Triggers a codebase sync for a repository (indexes into Pinecone).
   */
  syncCodebase: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string().min(1),
        repoFullName: z.string().min(1),
        installationId: z.number().int().positive(),
        branch: z.string().default("main"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        return await triggerRepoSync(
          input.installationId,
          input.repoFullName,
          input.branch
        );
      } catch (err) {
        mapDomainError(err);
      }
    }),

  /**
   * Gets sync status for a single repository.
   */
  getSyncStatus: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string().min(1),
        repoFullName: z.string().min(1),
      })
    )
    .query(async ({ input }) => {
      return await getRepoSyncStatus(input.repoFullName);
    }),

  /**
   * Gets sync statuses for multiple repositories.
   */
  getSyncStatuses: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string().min(1),
        repoFullNames: z.array(z.string().min(1)),
      })
    )
    .query(async ({ input }) => {
      return await getRepoSyncStatuses(input.repoFullNames);
    }),
});
