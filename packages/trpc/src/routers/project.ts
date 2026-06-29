import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createProject,
  listProjects,
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

export const projectRouter = router({
  /**
   * Creates a new project within a workspace.
   * Requirements: 3.1
   */
  create: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string().min(1),
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await createProject(input.workspaceId, {
          name: input.name,
          ...(input.description !== undefined && { description: input.description }),
        });
      } catch (err) {
        mapDomainError(err);
      }
    }),

  /**
   * Lists all projects in a workspace.
   * Requirements: 3.1
   */
  list: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string().min(1),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        return await listProjects(input.workspaceId);
      } catch (err) {
        mapDomainError(err);
      }
    }),
});
