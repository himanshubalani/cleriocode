import { prisma } from "@cleriocode/db";
import { NotFoundError, ConflictError } from "../errors.js";

const VALID_STATUSES = ["todo", "in_progress", "in_review", "done"] as const;
type TaskStatus = (typeof VALID_STATUSES)[number];

/**
 * Lists all tasks for a project (across all PRDs) with workspace isolation.
 * Queries through FeatureRequest → PRD → Task chain.
 */
export async function listTasksByProject(
  projectId: string,
  workspaceId: string
) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project || project.workspaceId !== workspaceId) {
    throw new NotFoundError("Project", projectId);
  }

  const tasks = await prisma.task.findMany({
    where: {
      prd: {
        featureRequest: {
          projectId,
        },
      },
    },
    include: {
      prd: {
        select: {
          featureRequest: {
            select: { title: true },
          },
        },
      },
    },
    orderBy: { order: "asc" },
  });

  return tasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    complexity: task.complexity,
    order: task.order,
    prdId: task.prdId,
    featureTitle: task.prd.featureRequest.title,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  }));
}

/**
 * Lists all tasks for a PRD with workspace isolation.
 * Verifies PRD ownership through FeatureRequest → Project → Workspace chain.
 */
export async function listTasks(prdId: string, workspaceId: string) {
  const prd = await prisma.pRD.findUnique({
    where: { id: prdId },
    include: {
      featureRequest: {
        include: {
          project: true,
        },
      },
    },
  });

  if (!prd || prd.featureRequest.project.workspaceId !== workspaceId) {
    throw new NotFoundError("PRD", prdId);
  }

  const tasks = await prisma.task.findMany({
    where: { prdId },
    orderBy: { order: "asc" },
  });

  return tasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    complexity: task.complexity,
    order: task.order,
    prdId: task.prdId,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  }));
}

/**
 * Updates a task's status with workspace isolation.
 * Validates the status value and verifies task ownership through
 * PRD → FeatureRequest → Project → Workspace chain.
 */
export async function updateTaskStatus(
  taskId: string,
  workspaceId: string,
  status: string
) {
  if (!VALID_STATUSES.includes(status as TaskStatus)) {
    throw new ConflictError(
      `Invalid status "${status}". Valid statuses: ${VALID_STATUSES.join(", ")}`
    );
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      prd: {
        include: {
          featureRequest: {
            include: {
              project: true,
            },
          },
        },
      },
    },
  });

  if (!task || task.prd.featureRequest.project.workspaceId !== workspaceId) {
    throw new NotFoundError("Task", taskId);
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: { status },
  });

  return {
    id: updated.id,
    title: updated.title,
    description: updated.description,
    status: updated.status,
    complexity: updated.complexity,
    order: updated.order,
    prdId: updated.prdId,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };
}

/**
 * Triggers task generation for an approved PRD.
 * Validates that the PRD is in "approved" status before proceeding.
 * TODO: Wire up Inngest event to actually trigger async task generation.
 */
export async function triggerTaskGeneration(
  prdId: string,
  workspaceId: string
) {
  const prd = await prisma.pRD.findUnique({
    where: { id: prdId },
    include: {
      featureRequest: {
        include: {
          project: true,
        },
      },
    },
  });

  if (!prd || prd.featureRequest.project.workspaceId !== workspaceId) {
    throw new NotFoundError("PRD", prdId);
  }

  if (prd.status !== "approved") {
    throw new ConflictError("PRD must be approved before generating tasks");
  }

  // TODO: Send Inngest event for async task generation workflow
  // e.g., await inngest.send({ name: "tasks/generate", data: { prdId, workspaceId } });
  const workflowRunId = `placeholder-${prdId}-${Date.now()}`;

  return { workflowRunId };
}
