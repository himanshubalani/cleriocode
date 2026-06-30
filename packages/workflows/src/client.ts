import { Inngest } from "inngest";

/**
 * Typed event map for all ShipFlow AI workflows.
 * Each event triggers a specific Inngest function.
 */
export type InngestEvents = {
  "prd/generation.requested": {
    data: {
      featureRequestId: string;
      workspaceId: string;
    };
  };
  "task/generation.requested": {
    data: {
      prdId: string;
      workspaceId: string;
    };
  };
  "pr/review.requested": {
    data: {
      pullRequestId: string;
      installationId: number;
      owner: string;
      repo: string;
      prNumber: number;
      workspaceId: string;
    };
  };
  "pr/re-review.requested": {
    data: {
      pullRequestId: string;
      previousReviewId: string;
      installationId: number;
      owner: string;
      repo: string;
      prNumber: number;
      baseSha: string;
      headSha: string;
      workspaceId: string;
    };
  };
  "release/check.requested": {
    data: {
      projectId: string;
      workspaceId: string;
    };
  };
  "repo/sync.requested": {
    data: {
      repoSyncId: string;
    };
  };
};

/**
 * Inngest client instance for ShipFlow AI.
 * All workflow functions use this client.
 */
export const inngest = new Inngest({
  id: "cleriocode",
});
