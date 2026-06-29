import { getInstallationOctokit } from "./client.js";

/**
 * Represents a single review comment to post on a pull request.
 */
export interface ReviewComment {
  path: string;
  line: number;
  body: string;
  side?: "LEFT" | "RIGHT";
}

/**
 * Fetches the full diff for a pull request.
 */
export async function fetchPRDiff(
  installationId: number,
  owner: string,
  repo: string,
  prNumber: number
): Promise<string> {
  const octokit = await getInstallationOctokit(installationId);
  const { data } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
    mediaType: { format: "diff" },
  });
  return data as unknown as string;
}

/**
 * Fetches the incremental diff between two commits (e.g., since last review).
 */
export async function fetchIncrementalDiff(
  installationId: number,
  owner: string,
  repo: string,
  baseSha: string,
  headSha: string
): Promise<string> {
  const octokit = await getInstallationOctokit(installationId);
  const { data } = await octokit.rest.repos.compareCommits({
    owner,
    repo,
    base: baseSha,
    head: headSha,
    mediaType: { format: "diff" },
  });
  return (data as any).diff as string;
}

/**
 * Posts review comments on a pull request via the GitHub API.
 * Creates a pull request review with individual file-level comments.
 */
export async function postReviewComments(
  installationId: number,
  owner: string,
  repo: string,
  prNumber: number,
  comments: ReviewComment[]
): Promise<void> {
  if (comments.length === 0) return;

  const octokit = await getInstallationOctokit(installationId);

  await octokit.rest.pulls.createReview({
    owner,
    repo,
    pull_number: prNumber,
    event: "COMMENT",
    comments: comments.map((c) => ({
      path: c.path,
      line: c.line,
      body: c.body,
      side: c.side ?? "RIGHT",
    })),
  });
}
