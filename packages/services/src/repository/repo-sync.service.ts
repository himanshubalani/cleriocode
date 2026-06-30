import { prisma } from "@cleriocode/db";
import { inngest } from "@cleriocode/workflows";

/**
 * Triggers a codebase sync for a repository.
 * Creates/updates RepoSync record and sends Inngest event.
 */
export async function triggerRepoSync(
  installationId: number,
  repoFullName: string,
  branch: string = "main"
) {
  const repoSync = await prisma.repoSync.upsert({
    where: { repoFullName },
    create: { installationId, repoFullName, branch, status: "pending" },
    update: { installationId, branch, status: "pending" },
  });

  await inngest.send({
    name: "repo/sync.requested",
    data: { repoSyncId: repoSync.id },
  });

  return { repoSyncId: repoSync.id, status: "pending" };
}

/**
 * Gets sync statuses for multiple repos.
 */
export async function getRepoSyncStatuses(repoFullNames: string[]) {
  const syncs = await prisma.repoSync.findMany({
    where: { repoFullName: { in: repoFullNames } },
    select: { repoFullName: true, status: true, syncedAt: true, chunkCount: true },
  });

  const statusByRepo: Record<string, { status: string; syncedAt: Date | null; chunkCount: number | null }> = {};

  for (const sync of syncs) {
    statusByRepo[sync.repoFullName] = {
      status: sync.status,
      syncedAt: sync.syncedAt,
      chunkCount: sync.chunkCount,
    };
  }

  return statusByRepo;
}

/**
 * Gets sync status for a single repo.
 */
export async function getRepoSyncStatus(repoFullName: string) {
  return prisma.repoSync.findUnique({
    where: { repoFullName },
    select: { id: true, status: true, syncedAt: true, chunkCount: true, branch: true },
  });
}
