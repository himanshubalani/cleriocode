import { inngest } from "../client.js";
import {
  chunkRepoFiles,
  buildRepoNamespace,
  saveChunksToPinecone,
  deleteNamespace,
} from "@cleriocode/ai";
import { prisma } from "@cleriocode/db";
import { fetchRepoFiles } from "./helpers/fetch-repo-files.js";

export const repoSyncWorkflow = inngest.createFunction(
  {
    id: "sync-repo-codebase",
    retries: 2,
    onFailure: async ({ event }) => {
      const repoSyncId = event.data.event.data.repoSyncId;
      await prisma.repoSync.update({
        where: { id: repoSyncId },
        data: { status: "failed" },
      });
    },
  },
  { event: "repo/sync.requested" },
  async ({ event, step }) => {
    const { repoSyncId } = event.data;

    // Step 1: Mark as syncing
    const repoSync = await step.run("mark-syncing", async () => {
      return prisma.repoSync.update({
        where: { id: repoSyncId },
        data: { status: "syncing" },
      });
    });

    // Step 2: Fetch and chunk codebase
    const chunks = await step.run("fetch-and-chunk-codebase", async () => {
      const files = await fetchRepoFiles(
        repoSync.installationId,
        repoSync.repoFullName,
        repoSync.branch
      );
      return chunkRepoFiles(files);
    });

    const namespace = buildRepoNamespace(repoSync.repoFullName);

    // Step 3: Clear old vectors on re-sync
    if (repoSync.syncedAt) {
      await step.run("clear-old-vectors", async () => {
        await deleteNamespace(namespace);
      });
    }

    // Step 4: Save new vectors to Pinecone
    await step.run("save-vectors-to-pinecone", async () => {
      await saveChunksToPinecone(namespace, chunks);
    });

    // Step 5: Mark synced
    await step.run("mark-synced", async () => {
      await prisma.repoSync.update({
        where: { id: repoSyncId },
        data: {
          status: "synced",
          syncedAt: new Date(),
          chunkCount: chunks.length,
        },
      });
    });

    return { repoSyncId, status: "synced", chunkCount: chunks.length };
  }
);
