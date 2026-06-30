import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createWorkspace,
  listWorkspaces,
  inviteMember,
  DomainError,
} from "@cleriocode/services";
import { router, authedProcedure, workspaceProcedure } from "../trpc.js";

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

export const workspaceRouter = router({
  /**
   * Creates a new workspace. The authenticated user becomes the owner.
   * Requirements: 1.1
   */
  create: authedProcedure
    .input(z.object({ name: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await createWorkspace(input, ctx.user.id);
      } catch (err) {
        mapDomainError(err);
      }
    }),

  /**
   * Lists all workspaces the authenticated user is a member of.
   * Requirements: 1.5
   */
  list: authedProcedure.query(async ({ ctx }) => {
    try {
      return await listWorkspaces(ctx.user.id);
    } catch (err) {
      mapDomainError(err);
    }
  }),

  /**
   * Invites a user to a workspace by email. Requires admin+ role.
   * Requirements: 1.2
   */
  invite: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string().min(1),
        email: z.string().email(),
        role: z.enum(["admin", "member"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await inviteMember(
          input.workspaceId,
          input.email,
          input.role,
          ctx.user!.id
        );
      } catch (err) {
        mapDomainError(err);
      }
    }),
});
