import type { CodeChunk } from "../types/chunks.js";
import { getPineconeIndex } from "./client.js";

const CONTEXT_RESULTS = 10;
const UPSERT_BATCH_SIZE = 90;

/**
 * Builds a Pinecone namespace scoped to a specific PR.
 * Format: owner--repo--pr-{number}
 */
export function buildPrNamespace(repoFullName: string, prNumber: number): string {
  return `${repoFullName.replace("/", "--")}--pr-${prNumber}`;
}

/**
 * Builds a Pinecone namespace for codebase-wide sync.
 * Format: owner--repo--codebase
 */
export function buildRepoNamespace(repoFullName: string): string {
  return `${repoFullName.replace("/", "--")}--codebase`;
}

/**
 * Upserts code chunks into a Pinecone namespace using integrated embeddings.
 * Pinecone automatically generates embeddings from the `text` field.
 */
export async function saveChunksToPinecone(
  namespace: string,
  chunks: CodeChunk[]
): Promise<void> {
  const index = getPineconeIndex();

  for (let start = 0; start < chunks.length; start += UPSERT_BATCH_SIZE) {
    const batch = chunks.slice(start, start + UPSERT_BATCH_SIZE);

    const records = batch.map((chunk) => ({
      id: chunk.id,
      text: chunk.text,
      filePath: chunk.filePath,
    }));

    await index.namespace(namespace).upsertRecords({ records });
  }
}

/**
 * Searches a Pinecone namespace for chunks similar to the query.
 * Returns formatted snippets with file paths.
 */
export async function searchPrContext(
  namespace: string,
  query: string
): Promise<string[]> {
  const index = getPineconeIndex();

  const response = await index.namespace(namespace).searchRecords({
    query: { topK: CONTEXT_RESULTS, inputs: { text: query } },
  });

  const snippets: string[] = [];

  for (const hit of response.result.hits) {
    const fields = hit.fields as { text?: string; filePath?: string };
    if (!fields.text) continue;

    snippets.push(`File: ${fields.filePath}\n${fields.text}`);
  }

  return snippets;
}

/**
 * Deletes an entire Pinecone namespace (used during repo re-sync).
 */
export async function deleteNamespace(namespace: string): Promise<void> {
  const index = getPineconeIndex();
  await index.deleteNamespace(namespace);
}
