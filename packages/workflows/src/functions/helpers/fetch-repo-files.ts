import { getInstallationOctokit } from "@cleriocode/github";
import type { RepoFile } from "@cleriocode/ai";

const MAX_FILE_SIZE_BYTES = 100_000;
const MAX_FILES = 200;

const CODE_EXTENSIONS = [
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".py", ".go", ".rb", ".rs",
  ".java", ".kt", ".swift", ".c", ".h", ".cpp", ".cs", ".php",
  ".sql", ".prisma", ".css", ".md", ".yml", ".yaml",
];

const SKIPPED_FOLDERS = [
  "node_modules/", "dist/", "build/", ".next/", "generated/", "vendor/",
  ".turbo/", ".git/", "coverage/",
];

type TreeEntry = {
  path?: string;
  type?: string;
  sha?: string;
  size?: number;
};

function hasCodeExtension(path: string): boolean {
  return CODE_EXTENSIONS.some((ext) => path.endsWith(ext));
}

function isSkippedPath(path: string): boolean {
  return SKIPPED_FOLDERS.some((folder) => path.includes(folder));
}

function isIndexableFile(entry: TreeEntry): boolean {
  if (entry.type !== "blob" || !entry.path || !entry.sha) return false;
  if (entry.size && entry.size > MAX_FILE_SIZE_BYTES) return false;
  if (isSkippedPath(entry.path)) return false;
  return hasCodeExtension(entry.path);
}

/**
 * Fetches code files from a GitHub repo using the Git tree API.
 * Filters for code extensions, skips node_modules etc., caps at 200 files.
 */
export async function fetchRepoFiles(
  installationId: number,
  repoFullName: string,
  branch: string
): Promise<RepoFile[]> {
  const octokit = await getInstallationOctokit(installationId);
  const [owner, repo] = repoFullName.split("/");

  // Get the full tree recursively
  const { data: tree } = await octokit.rest.git.getTree({
    owner: owner!,
    repo: repo!,
    tree_sha: branch,
    recursive: "1",
  });

  const entries = tree.tree.filter(isIndexableFile).slice(0, MAX_FILES);
  const files: RepoFile[] = [];

  for (const entry of entries) {
    try {
      const { data: blob } = await octokit.rest.git.getBlob({
        owner: owner!,
        repo: repo!,
        file_sha: entry.sha!,
      });

      const content = Buffer.from(blob.content, "base64").toString("utf-8");
      files.push({ filePath: entry.path!, content });
    } catch {
      // Skip files that can't be fetched (e.g., too large)
      continue;
    }
  }

  return files;
}
