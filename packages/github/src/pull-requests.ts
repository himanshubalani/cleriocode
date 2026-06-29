import { getInstallationOctokit } from "./client.js";

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

export async function postReviewComments(
  installationId: number,
  owner: string,
  repo: string,
  prNumber: number,
  body: string
): Promise<void> {
  const octokit = await getInstallationOctokit(installationId);
  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    body,
  });
}
