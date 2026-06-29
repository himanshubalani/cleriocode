import { getInstallationOctokit } from "@cleriocode/github";
import type { PrFile } from "@cleriocode/ai";

const FILES_PER_PAGE = 100;

/**
 * Fetches individual PR files with their patches from GitHub API.
 * Returns structured PrFile[] for chunking, unlike fetchPRDiff which returns a raw string.
 */
export async function fetchPRFiles(
  installationId: number,
  owner: string,
  repo: string,
  prNumber: number
): Promise<PrFile[]> {
  const octokit = await getInstallationOctokit(installationId);

  const { data } = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber,
    per_page: FILES_PER_PAGE,
  });

  const files: PrFile[] = [];

  for (const file of data) {
    if (!file.patch) continue;
    files.push({ filePath: file.filename, patch: file.patch });
  }

  return files;
}
