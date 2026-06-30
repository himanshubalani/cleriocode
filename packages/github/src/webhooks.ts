import { getGitHubApp } from "./client.js";

export async function verifyWebhookSignature(
  payload: string,
  signature: string
): Promise<boolean> {
  try {
    await getGitHubApp().webhooks.verify(payload, signature);
    return true;
  } catch {
    return false;
  }
}

export interface PullRequestWebhookPayload {
  action: string;
  installation: { id: number };
  repository: { full_name: string; owner: { login: string }; name: string };
  pull_request: {
    number: number;
    title: string;
    user: { login: string } | null;
    head: { sha: string };
    base: { ref: string };
  };
}

export const REVIEWABLE_ACTIONS = ["opened", "synchronize", "reopened"] as const;
