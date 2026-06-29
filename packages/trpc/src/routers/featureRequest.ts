import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, workspaceProcedure } from "../trpc.js";
import {
  createFeatureRequest,
  listFeatureRequests,
  triggerPRDGeneration,
  DomainError,
} from "@cleriocode/services";

export const featureRequestRouter = router({
  create: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        projectId: z.string(),
        title: z.string().min(1),
        description: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await createFeatureRequest(
          input.projectId,
          ctx.workspaceId,
          { title: input.title, description: input.description }
        );
        return {
          id: result.id,
          title: result.title,
          description: result.description,
          status: result.status,
          projectId: result.projectId,
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

  list: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        projectId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const results = await listFeatureRequests(
          input.projectId,
          ctx.workspaceId
        );
        return results.map((fr) => ({
          id: fr.id,
          title: fr.title,
          description: fr.description,
          status: fr.status,
          projectId: fr.projectId,
          createdAt: fr.createdAt,
        }));
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

  generatePRD: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        featureRequestId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await triggerPRDGeneration(
          input.featureRequestId,
          ctx.workspaceId
        );
        return { workflowRunId: result.workflowRunId };
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
