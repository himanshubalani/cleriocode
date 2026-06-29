import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, workspaceProcedure } from "../trpc.js";
import {
  listTasks,
  updateTaskStatus,
  triggerTaskGeneration,
  DomainError,
} from "@cleriocode/services";

export const taskRouter = router({
  list: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        prdId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const results = await listTasks(input.prdId, ctx.workspaceId);
        return results.map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status,
          complexity: task.complexity,
          order: task.order,
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

  updateStatus: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        taskId: z.string(),
        status: z.enum(["todo", "in_progress", "in_review", "done"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await updateTaskStatus(
          input.taskId,
          ctx.workspaceId,
          input.status
        );
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

  generate: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        prdId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await triggerTaskGeneration(
          input.prdId,
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
