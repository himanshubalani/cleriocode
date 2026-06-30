import { prisma } from "@cleriocode/db";
import { NotFoundError } from "../errors.js";

export interface CreateProjectInput {
  name: string;
  description?: string;
}

export interface ProjectOutput {
  id: string;
  name: string;
  description: string | null;
  workspaceId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectListItem {
  id: string;
  name: string;
  description: string | null;
  workspaceId: string;
  repositoryCount: number;
  featureRequestCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export async function createProject(
  workspaceId: string,
  input: CreateProjectInput
): Promise<ProjectOutput> {
  const project = await prisma.project.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      workspaceId,
    },
  });

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    workspaceId: project.workspaceId,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

export async function listProjects(
  workspaceId: string
): Promise<ProjectListItem[]> {
  const projects = await prisma.project.findMany({
    where: { workspaceId },
    include: {
      _count: {
        select: {
          featureRequests: true,
          repositories: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    description: project.description,
    workspaceId: project.workspaceId,
    repositoryCount: project._count.repositories,
    featureRequestCount: project._count.featureRequests,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  }));
}

export async function getProject(
  projectId: string,
  workspaceId: string
): Promise<ProjectOutput> {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      workspaceId,
    },
  });

  if (!project) {
    throw new NotFoundError("Project", projectId);
  }

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    workspaceId: project.workspaceId,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}
