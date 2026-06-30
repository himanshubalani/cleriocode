import { prisma } from "@cleriocode/db";
import { inngest } from "@cleriocode/workflows";
import { NotFoundError, ConflictError } from "../errors.js";

// ─── Types ───

export interface CreateFeatureRequestInput {
  title: string;
  description: string;
}

export interface FeatureRequestOutput {
  id: string;
  title: string;
  description: string;
  status: string;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TriggerPRDGenerationOutput {
  featureRequestId: string;
  workflowRunId: string;
  status: string;
}

// ─── Helpers ───

async function verifyProjectBelongsToWorkspace(
  projectId: string,
  workspaceId: string
): Promise<void> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId },
  });

  if (!project) {
    throw new NotFoundError("Project", projectId);
  }
}

// ─── Service Functions ───

export async function createFeatureRequest(
  projectId: string,
  workspaceId: string,
  input: CreateFeatureRequestInput
): Promise<FeatureRequestOutput> {
  await verifyProjectBelongsToWorkspace(projectId, workspaceId);

  const featureRequest = await prisma.featureRequest.create({
    data: {
      title: input.title,
      description: input.description,
      projectId,
    },
  });

  return {
    id: featureRequest.id,
    title: featureRequest.title,
    description: featureRequest.description,
    status: featureRequest.status,
    projectId: featureRequest.projectId,
    createdAt: featureRequest.createdAt,
    updatedAt: featureRequest.updatedAt,
  };
}

export async function listFeatureRequests(
  projectId: string,
  workspaceId: string
): Promise<FeatureRequestOutput[]> {
  await verifyProjectBelongsToWorkspace(projectId, workspaceId);

  const featureRequests = await prisma.featureRequest.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });

  return featureRequests.map((fr) => ({
    id: fr.id,
    title: fr.title,
    description: fr.description,
    status: fr.status,
    projectId: fr.projectId,
    createdAt: fr.createdAt,
    updatedAt: fr.updatedAt,
  }));
}

export async function triggerPRDGeneration(
  featureRequestId: string,
  workspaceId: string
): Promise<TriggerPRDGenerationOutput> {
  const featureRequest = await prisma.featureRequest.findFirst({
    where: {
      id: featureRequestId,
      project: { workspaceId },
    },
  });

  if (!featureRequest) {
    throw new NotFoundError("FeatureRequest", featureRequestId);
  }

  if (featureRequest.status !== "open") {
    throw new ConflictError(
      `Cannot generate PRD for feature request in "${featureRequest.status}" status. Must be "open".`
    );
  }

  await prisma.featureRequest.update({
    where: { id: featureRequestId },
    data: { status: "prd_generating" },
  });

  const sendResult = await inngest.send({
    name: "prd/generation.requested",
    data: { featureRequestId },
  });

  return {
    featureRequestId,
    workflowRunId: sendResult.ids[0] ?? featureRequestId,
    status: "prd_generating",
  };
}
