import { createHmac, timingSafeEqual } from "node:crypto";
import { getGitHubApp } from "./client.js";

/**
 * Payload structure for a parsed pull_request webhook event.
 */
export interface PullRequestWebhookPayload {
  action: string;
  number: number;
  pullRequest: {
    id: number;
    title: string;
    state: string;
    headSha: string;
    baseSha: string;
    headRef: string;
    baseRef: string;
    htmlUrl: string;
  };
  repository: {
    id: number;
    fullName: string;
    owner: string;
    name: string;
  };
  installation: {
    id: number;
  };
  sender: {
    login: string;
    id: number;
  };
}

/**
 * Verifies the webhook signature (x-hub-signature-256) against the raw payload.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export async function verifyWebhookSignature(
  payload: string,
  signature: string
): Promise<boolean> {
  const secret = process.env.GITHUB_WEBHOOK_SECRET!;

  const expectedSignature =
    "sha256=" +
    createHmac("sha256", secret).update(payload, "utf8").digest("hex");

  if (signature.length !== expectedSignature.length) {
    return false;
  }

  return timingSafeEqual(
    Buffer.from(signature, "utf8"),
    Buffer.from(expectedSignature, "utf8")
  );
}

/**
 * Parses a raw pull_request webhook event payload into a typed structure.
 * Returns null if the payload is not a valid pull_request event.
 */
export function parsePullRequestEvent(
  payload: any
): PullRequestWebhookPayload | null {
  if (!payload || !payload.pull_request || !payload.repository) {
    return null;
  }

  const pr = payload.pull_request;
  const repo = payload.repository;

  return {
    action: payload.action,
    number: pr.number,
    pullRequest: {
      id: pr.id,
      title: pr.title,
      state: pr.state,
      headSha: pr.head?.sha ?? "",
      baseSha: pr.base?.sha ?? "",
      headRef: pr.head?.ref ?? "",
      baseRef: pr.base?.ref ?? "",
      htmlUrl: pr.html_url ?? "",
    },
    repository: {
      id: repo.id,
      fullName: repo.full_name,
      owner: repo.owner?.login ?? "",
      name: repo.name,
    },
    installation: {
      id: payload.installation?.id ?? 0,
    },
    sender: {
      login: payload.sender?.login ?? "",
      id: payload.sender?.id ?? 0,
    },
  };
}
