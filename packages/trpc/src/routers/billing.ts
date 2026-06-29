import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  getBillingStatus,
  createSubscription,
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

export const billingRouter = router({
  /**
   * Returns the billing status for the current workspace.
   * Includes plan, review credits, and subscription info.
   * Requirements: 9.5
   */
  getStatus: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string().min(1),
      })
    )
    .query(async ({ ctx }) => {
      try {
        return await getBillingStatus(ctx.workspaceId);
      } catch (err) {
        mapDomainError(err);
      }
    }),

  /**
   * Initiates a subscription to the pro plan via Razorpay sandbox.
   * Requirements: 9.5
   */
  subscribe: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string().min(1),
        planId: z.literal("pro"),
      })
    )
    .mutation(async ({ ctx }) => {
      try {
        return await createSubscription(ctx.workspaceId);
      } catch (err) {
        mapDomainError(err);
      }
    }),
});
