import { App } from "octokit";

let app: App | null = null;

/**
 * Returns the singleton GitHub App instance configured with
 * environment variables for App ID, private key, and webhook secret.
 */
export function getGitHubApp(): App {
  if (!app) {
    app = new App({
      appId: process.env.GITHUB_APP_ID!,
      privateKey: process.env.GITHUB_PRIVATE_KEY!.replace(/\\n/g, "\n"),
      webhooks: { secret: process.env.GITHUB_WEBHOOK_SECRET! },
    });
  }
  return app;
}

/**
 * Returns an authenticated Octokit instance scoped to a specific
 * GitHub App installation.
 */
export async function getInstallationOctokit(installationId: number) {
  return getGitHubApp().getInstallationOctokit(installationId);
}
