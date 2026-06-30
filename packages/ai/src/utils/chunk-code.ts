import type { CodeChunk, PrFile, RepoFile } from "../types/chunks.js";

const MAX_CHUNK_LINES = 80;

function buildPrChunkId(prNumber: number, filePath: string, part: number): string {
  return `pr-${prNumber}--${filePath}--part-${part}`;
}

function buildRepoChunkId(filePath: string, part: number): string {
  return `repo--${filePath}--part-${part}`;
}

/**
 * Splits PR file patches into fixed-size chunks suitable for Pinecone embedding.
 * Each chunk is ~80 lines of the unified diff.
 */
export function chunkPrFiles(prNumber: number, files: PrFile[]): CodeChunk[] {
  const chunks: CodeChunk[] = [];

  for (const file of files) {
    const lines = file.patch.split("\n");

    for (let start = 0; start < lines.length; start += MAX_CHUNK_LINES) {
      const part = start / MAX_CHUNK_LINES;
      const text = lines.slice(start, start + MAX_CHUNK_LINES).join("\n");
      if (text.trim() === "") continue;

      chunks.push({
        id: buildPrChunkId(prNumber, file.filePath, part),
        filePath: file.filePath,
        text,
      });
    }
  }

  return chunks;
}

/**
 * Splits full repo file contents into fixed-size chunks for codebase sync.
 * Each chunk is ~80 lines of source code.
 */
export function chunkRepoFiles(files: RepoFile[]): CodeChunk[] {
  const chunks: CodeChunk[] = [];

  for (const file of files) {
    const lines = file.content.split("\n");

    for (let start = 0; start < lines.length; start += MAX_CHUNK_LINES) {
      const part = start / MAX_CHUNK_LINES;
      const text = lines.slice(start, start + MAX_CHUNK_LINES).join("\n");
      if (text.trim() === "") continue;

      chunks.push({
        id: buildRepoChunkId(file.filePath, part),
        filePath: file.filePath,
        text,
      });
    }
  }

  return chunks;
}
