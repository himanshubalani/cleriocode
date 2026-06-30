import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, workspaceProcedure } from "../trpc.js";
import { getPRD, updatePRD, finalizePRD, DomainError } from "@cleriocode/services";

export const prdRouter = router({
  get: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        prdId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const result = await getPRD(input.prdId, ctx.workspaceId);
        return {
          id: result.id,
          content: result.content,
          status: result.status,
          featureRequestId: result.featureRequestId,
        };
      } catch (error) {
        if (error instanceof DomainError) {
          throw new TRPCError({
            code: error.code === "NOT_FOUND" ? "NOT_FOUND" : "BAD_REQUEST",
            message: error.message,
          });
        }
        throw error;
      }
    }),

  update: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        prdId: z.string(),
        content: z.object({
          goals: z.array(z.string().trim().min(1)),
          requirements: z.array(z.string().trim().min(1)),
          acceptanceCriteria: z.array(z.string().trim().min(1)),
          technicalNotes: z.array(z.string().trim().min(1)),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await updatePRD(
          input.prdId,
          ctx.workspaceId,
          input.content
        );
        return {
          id: result.id,
          content: result.content,
          status: result.status,
          featureRequestId: result.featureRequestId,
        };
      } catch (error) {
        if (error instanceof DomainError) {
          const code =
            error.code === "NOT_FOUND"
              ? "NOT_FOUND"
              : error.code === "CONFLICT"
                ? "CONFLICT"
                : "BAD_REQUEST";
          throw new TRPCError({ code, message: error.message });
        }
        throw error;
      }
    }),

  finalize: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        prdId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await finalizePRD(input.prdId, ctx.workspaceId);
        return { id: result.id, status: result.status };
      } catch (error) {
        if (error instanceof DomainError) {
          const code =
            error.code === "NOT_FOUND"
              ? "NOT_FOUND"
              : error.code === "CONFLICT"
                ? "CONFLICT"
                : "BAD_REQUEST";
          throw new TRPCError({ code, message: error.message });
        }
        throw error;
      }
    }),
});
