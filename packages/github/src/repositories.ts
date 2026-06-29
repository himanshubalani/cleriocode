import { getInstallationOctokit } from "./client.js";

/**
 * Verifies that the given GitHub App installation has access to the
 * specified repository. Returns true if access is confirmed, false otherwise.
 */
export async function verifyRepoAccess(
  installationId: number,
  owner: string,
  name: string
): Promise<boolean> {
  try {
    const octokit = await getInstallationOctokit(installationId);
    const { data } = await octokit.rest.repos.get({
      owner,
      repo: name,
    });
    return data.full_name === `${owner}/${name}`;
  } catch (error: unknown) {
    // If the API returns 404 or 403, the installation lacks access
    if (
      error instanceof Error &&
      "status" in error &&
      ((error as any).status === 404 || (error as any).status === 403)
    ) {
      return false;
    }
    throw error;
  }
}
