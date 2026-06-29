import { prisma } from "@cleriocode/db";
import { NotFoundError, ForbiddenError } from "../errors.js";

// ─── Types ───

export interface ReleaseOutput {
  id: string;
  version: string;
  notes: string | null;
  approvedById: string;
  projectId: string;
  createdAt: Date;
}

export interface ReleaseListItem {
  id: string;
  version: string;
  notes: string | null;
  approvedById: string;
  createdAt: Date;
}

// ─── Service Functions ───

/**
 * Approves a release for a project.
 * Validates: user has admin/owner role, all tasks are done, PRs have passed reviews.
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */
export async function approveRelease(
  projectId: string,
  workspaceId: string,
  userId: string,
  version: string
): Promise<ReleaseOutput> {
  // Verify project belongs to workspace
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId },
  });
  if (!project) {
    throw new NotFoundError("Project", projectId);
  }

  // Verify user has admin or owner role (Requirement 8.4)
  const member = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId },
  });
  if (!member || !["admin", "owner"].includes(member.role)) {
    throw new ForbiddenError("Only admin or owner can approve releases");
  }

  // Check all tasks for this project's PRDs are done (Requirement 8.1)
  const featureRequests = await prisma.featureRequest.findMany({
    where: { projectId },
    include: {
      prd: {
        include: { tasks: true },
      },
    },
  });

  const allTasks = featureRequests.flatMap((fr) => fr.prd?.tasks ?? []);
  const incompleteTasks = allTasks.filter(
    (t) => t.status !== "done" && t.status !== "released"
  );

  if (allTasks.length === 0 || incompleteTasks.length > 0) {
    throw new ForbiddenError(
      `Cannot release: ${incompleteTasks.length} task(s) not done`
    );
  }

  // Check PRs have passed reviews (Requirement 8.1)
  const repositories = await prisma.repository.findMany({
    where: { projectId },
    include: {
      pullRequests: {
        where: { status: "open" },
        include: {
          reviews: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  const openPRs = repositories.flatMap((r) => r.pullRequests);
  const failedPRs = openPRs.filter(
    (pr) => pr.reviews.length === 0 || pr.reviews[0].status !== "passed"
  );

  if (openPRs.length > 0 && failedPRs.length > 0) {
    throw new ForbiddenError(
      `Cannot release: ${failedPRs.length} PR(s) without passed review`
    );
  }

  // Create the release (Requirement 8.2)
  const release = await prisma.release.create({
    data: {
      version,
      approvedById: userId,
      projectId,
    },
  });

  // Cascade: update all tasks to "released" (Requirement 8.3)
  const taskIds = allTasks.map((t) => t.id);
  if (taskIds.length > 0) {
    await prisma.task.updateMany({
      where: { id: { in: taskIds } },
      data: { status: "released" },
    });
  }

  // Cascade: update all open PRs to "released" (Requirement 8.3)
  const prIds = openPRs.map((pr) => pr.id);
  if (prIds.length > 0) {
    await prisma.pullRequest.updateMany({
      where: { id: { in: prIds } },
      data: { status: "released" },
    });
  }

  return {
    id: release.id,
    version: release.version,
    notes: release.notes ?? null,
    approvedById: release.approvedById,
    projectId: release.projectId,
    createdAt: release.createdAt,
  };
}

/**
 * Lists all releases for a project.
 * Requirements: 8.5
 */
export async function listReleases(
  projectId: string,
  workspaceId: string
): Promise<ReleaseListItem[]> {
  // Verify project belongs to workspace (tenant isolation)
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId },
  });
  if (!project) {
    throw new NotFoundError("Project", projectId);
  }

  const releases = await prisma.release.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      version: true,
      notes: true,
      approvedById: true,
      createdAt: true,
    },
  });

  return releases;
}
