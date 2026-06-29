import { prisma } from "@cleriocode/db";
import { verifyRepoAccess, type PullRequestWebhookPayload, REVIEWABLE_ACTIONS } from "@cleriocode/github";
import { NotFoundError, ExternalServiceError } from "../errors.js";

export async function connectRepository(
  projectId: string,
  workspaceId: string,
  owner: string,
  name: string,
  installationId: number
) {
  // Verify workspace owns the project
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId },
  });
  if (!project) throw new NotFoundError("Project", projectId);

  // Verify GitHub access
  const hasAccess = await verifyRepoAccess(installationId, owner, name);
  if (!hasAccess) {
    throw new ExternalServiceError("GitHub", `Cannot access repository ${owner}/${name}`);
  }

  const fullName = `${owner}/${name}`;

  // Create repository record
  const repository = await prisma.repository.upsert({
    where: { fullName },
    create: {
      owner,
      name,
      fullName,
      installationId,
      projectId,
    },
    update: {
      installationId,
      projectId,
    },
  });

  return {
    id: repository.id,
    owner: repository.owner,
    name: repository.name,
    fullName: repository.fullName,
    projectId: repository.projectId,
  };
}

export async function handlePullRequestWebhook(payload: PullRequestWebhookPayload) {
  const { action, repository: repo, pull_request: pr, installation } = payload;

  // Only process reviewable actions
  if (!REVIEWABLE_ACTIONS.includes(action as typeof REVIEWABLE_ACTIONS[number])) {
    return { processed: false, reason: "action_not_reviewable" };
  }

  // Find the repository in our database
  const repository = await prisma.repository.findUnique({
    where: { fullName: repo.full_name },
  });

  if (!repository) {
    return { processed: false, reason: "repository_not_connected" };
  }

  // Upsert the pull request
  const pullRequest = await prisma.pullRequest.upsert({
    where: {
      repositoryId_prNumber: {
        repositoryId: repository.id,
        prNumber: pr.number,
      },
    },
    create: {
      prNumber: pr.number,
      title: pr.title,
      authorLogin: pr.user?.login ?? null,
      headSha: pr.head.sha,
      baseBranch: pr.base.ref,
      status: "open",
      repositoryId: repository.id,
    },
    update: {
      title: pr.title,
      headSha: pr.head.sha,
      status: "open",
    },
  });

  return {
    processed: true,
    pullRequestId: pullRequest.id,
    repositoryId: repository.id,
    installationId: installation.id,
  };
}

export async function listRepositories(projectId: string, workspaceId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId },
  });
  if (!project) throw new NotFoundError("Project", projectId);

  return prisma.repository.findMany({
    where: { projectId },
    select: {
      id: true,
      owner: true,
      name: true,
      fullName: true,
      installationId: true,
      createdAt: true,
    },
  });
}
