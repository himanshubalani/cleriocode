import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import { ConflictError, NotFoundError } from "../../errors.js";

/**
 * Property 11: Task Status Transition Persistence
 *
 * For any Task and any valid target status from the set {todo, in_progress, in_review, done},
 * updating the Task status SHALL persist the new status value and the Task SHALL reflect
 * the updated status on subsequent reads.
 *
 * **Feature: shipflow-ai-platform, Property 11: Task Status Transition Persistence**
 * **Validates: Requirements 5.4**
 */

// ─── Mock Prisma ───

vi.mock("@cleriocode/db", () => ({
  prisma: {
    task: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "@cleriocode/db";
import { updateTaskStatus } from "../task.service.js";

const mockPrisma = vi.mocked(prisma);

// ─── Constants ───

const VALID_STATUSES = ["todo", "in_progress", "in_review", "done"] as const;
const WORKSPACE_ID = "workspace-1";

// ─── Helpers ───

function makeTaskRecord(taskId: string, currentStatus: string) {
  return {
    id: taskId,
    title: "Sample Task",
    description: "A task description",
    status: currentStatus,
    complexity: "medium",
    order: 1,
    prdId: "prd-1",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-02"),
    prd: {
      featureRequest: {
        project: {
          workspaceId: WORKSPACE_ID,
        },
      },
    },
  };
}

// ─── Arbitraries ───

const validStatusArb = fc.constantFrom(...VALID_STATUSES);
const taskIdArb = fc.uuid();

// ─── Setup ───

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Property 11: Task Status Transition Persistence ───

describe("Property 11: Task Status Transition Persistence", () => {
  it("updating task status with any valid status SHALL persist and reflect the new status", async () => {
    await fc.assert(
      fc.asyncProperty(taskIdArb, validStatusArb, async (taskId, targetStatus) => {
        vi.clearAllMocks();

        // Setup: task exists in the workspace
        const existingTask = makeTaskRecord(taskId, "todo");
        mockPrisma.task.findUnique.mockResolvedValue(existingTask as any);

        // After update, prisma returns the task with new status
        mockPrisma.task.update.mockResolvedValue({
          id: taskId,
          title: "Sample Task",
          description: "A task description",
          status: targetStatus,
          complexity: "medium",
          order: 1,
          prdId: "prd-1",
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-02"),
        } as any);

        const result = await updateTaskStatus(taskId, WORKSPACE_ID, targetStatus);

        // The returned object SHALL reflect the updated status
        expect(result.status).toBe(targetStatus);
        expect(result.id).toBe(taskId);

        // Verify persistence was called with the correct status
        expect(mockPrisma.task.update).toHaveBeenCalledWith({
          where: { id: taskId },
          data: { status: targetStatus },
        });
      }),
      { numRuns: 100 }
    );
  });

  it("updateTaskStatus SHALL throw ConflictError for any invalid status", async () => {
    const invalidStatusArb = fc.string({ minLength: 1 }).filter(
      (s) => !VALID_STATUSES.includes(s as any)
    );

    await fc.assert(
      fc.asyncProperty(taskIdArb, invalidStatusArb, async (taskId, invalidStatus) => {
        vi.clearAllMocks();

        await expect(
          updateTaskStatus(taskId, WORKSPACE_ID, invalidStatus)
        ).rejects.toThrow(ConflictError);

        // Prisma should never be called for invalid statuses
        expect(mockPrisma.task.findUnique).not.toHaveBeenCalled();
        expect(mockPrisma.task.update).not.toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });

  it("updateTaskStatus SHALL throw NotFoundError when task is not in workspace", async () => {
    await fc.assert(
      fc.asyncProperty(taskIdArb, validStatusArb, async (taskId, targetStatus) => {
        vi.clearAllMocks();

        // Task exists but belongs to a different workspace
        const taskInOtherWorkspace = makeTaskRecord(taskId, "todo");
        taskInOtherWorkspace.prd.featureRequest.project.workspaceId = "other-workspace";
        mockPrisma.task.findUnique.mockResolvedValue(taskInOtherWorkspace as any);

        await expect(
          updateTaskStatus(taskId, WORKSPACE_ID, targetStatus)
        ).rejects.toThrow(NotFoundError);

        // Update should not be called
        expect(mockPrisma.task.update).not.toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });

  it("updateTaskStatus SHALL throw NotFoundError when task does not exist", async () => {
    await fc.assert(
      fc.asyncProperty(taskIdArb, validStatusArb, async (taskId, targetStatus) => {
        vi.clearAllMocks();

        // Task not found at all
        mockPrisma.task.findUnique.mockResolvedValue(null);

        await expect(
          updateTaskStatus(taskId, WORKSPACE_ID, targetStatus)
        ).rejects.toThrow(NotFoundError);

        // Update should not be called
        expect(mockPrisma.task.update).not.toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });
});
