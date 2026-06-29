import { prisma } from "@cleriocode/db";
import { NotFoundError, ConflictError } from "../errors.js";

export type PRDContent = {
  goals: string[];
  requirements: string[];
  acceptanceCriteria: string[];
  technicalNotes: string[];
};

/**
 * Retrieves a PRD by ID with workspace isolation.
 * Verifies ownership by joining through FeatureRequest → Project → Workspace.
 */
export async function getPRD(prdId: string, workspaceId: string) {
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

  return {
    id: prd.id,
    content: prd.content,
    status: prd.status,
    featureRequestId: prd.featureRequestId,
    createdAt: prd.createdAt,
    updatedAt: prd.updatedAt,
  };
}

/**
 * Updates PRD content. Only allowed when status is "draft".
 * Verifies workspace isolation before making changes.
 */
export async function updatePRD(
  prdId: string,
  workspaceId: string,
  content: PRDContent
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

  if (prd.status !== "draft") {
    throw new ConflictError("Cannot edit an approved PRD");
  }

  const updated = await prisma.pRD.update({
    where: { id: prdId },
    data: { content },
  });

  return {
    id: updated.id,
    content: updated.content,
    status: updated.status,
    featureRequestId: updated.featureRequestId,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };
}

/**
 * Finalizes a PRD by transitioning its status to "approved".
 * Also updates the parent FeatureRequest status to "prd_ready".
 * Blocks if already approved.
 */
export async function finalizePRD(prdId: string, workspaceId: string) {
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

  if (prd.status === "approved") {
    throw new ConflictError("PRD is already approved");
  }

  await prisma.$transaction([
    prisma.pRD.update({
      where: { id: prdId },
      data: { status: "approved" },
    }),
    prisma.featureRequest.update({
      where: { id: prd.featureRequestId },
      data: { status: "prd_ready" },
    }),
  ]);

  return { id: prd.id, status: "approved" };
}
