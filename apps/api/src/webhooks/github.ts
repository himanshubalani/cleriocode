import type { Request, Response } from "express";
import { verifyWebhookSignature } from "@cleriocode/github";
import { handlePullRequestWebhook } from "@cleriocode/services";

export async function githubWebhookHandler(req: Request, res: Response) {
  const signature = req.headers["x-hub-signature-256"] as string | undefined;
  const event = req.headers["x-github-event"] as string | undefined;

  if (!signature) {
    return res.status(401).json({ error: "Missing signature" });
  }

  // Get raw body for signature verification
  const payload = typeof req.body === "string" ? req.body : JSON.stringify(req.body);

  const isValid = await verifyWebhookSignature(payload, signature);
  if (!isValid) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

  // Only handle pull_request events
  if (event !== "pull_request") {
    return res.status(200).json({ received: true });
  }

  try {
    const result = await handlePullRequestWebhook(body);
    return res.status(200).json({ received: true, ...result });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return res.status(500).json({ received: false, error: "Processing failed" });
  }
}
