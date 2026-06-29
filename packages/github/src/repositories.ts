import { getInstallationOctokit } from "./client.js";

export async function verifyRepoAccess(
  installationId: number,
  owner: string,
  name: string
): Promise<boolean> {
  const octokit = await getInstallationOctokit(installationId);
  try {
    await octokit.rest.repos.get({ owner, repo: name });
    return true;
  } catch {
    return false;
  }
}
