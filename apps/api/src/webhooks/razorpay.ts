import type { Request, Response } from "express";
import crypto from "crypto";
import {
  handlePaymentSuccess,
  handlePaymentFailure,
  handleSubscriptionCancelled,
} from "@cleriocode/services";

/** Events we actively handle. Everything else gets acknowledged without processing. */
const HANDLED_EVENTS = new Set([
  "subscription.activated",
  "subscription.charged",
  "subscription.cancelled",
  "payment.failed",
]);

/**
 * In-memory set of processed event IDs for replay protection.
 * In production, replace with a persistent store (e.g. Redis or DB) so
 * dedup survives restarts and works across multiple instances.
 */
const processedEventIds = new Set<string>();

/**
 * Extracts the subscription entity from a Razorpay webhook payload.
 */
function getSubscriptionEntity(event: Record<string, any>) {
  return event.payload?.subscription?.entity ?? null;
}

/**
 * Verifies the Razorpay webhook HMAC-SHA256 signature.
 * Uses timing-safe comparison to prevent timing attacks.
 */
function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");

  if (expected.length !== signature.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

/**
 * Routes a verified Razorpay event to the appropriate billing service handler.
 */
async function routeEvent(event: Record<string, any>) {
  const entity = getSubscriptionEntity(event);
  const subscriptionId: string | undefined = entity?.id;

  if (!subscriptionId) {
    return;
  }

  const eventName: string = event.event;

  if (eventName === "subscription.activated" || eventName === "subscription.charged") {
    const successPayload: Parameters<typeof handlePaymentSuccess>[0] = { subscriptionId };
    if (entity.current_start) {
      successPayload.currentPeriodStart = new Date(entity.current_start * 1000).toISOString();
    }
    if (entity.current_end) {
      successPayload.currentPeriodEnd = new Date(entity.current_end * 1000).toISOString();
    }
    await handlePaymentSuccess(successPayload);
    return;
  }

  if (eventName === "subscription.cancelled") {
    await handleSubscriptionCancelled({
      subscriptionId,
      cancelledAt: new Date().toISOString(),
    });
    return;
  }

  if (eventName === "payment.failed") {
    await handlePaymentFailure({
      subscriptionId,
      reason: eventName,
    });
  }
}

/**
 * Razorpay webhook handler.
 * Verifies signature using HMAC SHA-256, deduplicates on event ID,
 * then routes event to billing service.
 *
 * Environment variable required:
 * - RAZORPAY_WEBHOOK_SECRET
 */
export async function razorpayWebhookHandler(req: Request, res: Response) {
  const signature = req.headers["x-razorpay-signature"] as string | undefined;

  if (!signature) {
    return res.status(401).json({ error: "Missing signature" });
  }

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("RAZORPAY_WEBHOOK_SECRET not configured");
    return res.status(500).json({ error: "Webhook secret not configured" });
  }

  const payload = JSON.stringify(req.body);

  if (!verifySignature(payload, signature, webhookSecret)) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  // Replay protection: deduplicate on x-razorpay-event-id
  const eventId = req.headers["x-razorpay-event-id"] as string | undefined;
  if (eventId) {
    if (processedEventIds.has(eventId)) {
      return res.status(200).json({ received: true, deduplicated: true });
    }
  }

  const event = req.body;

  if (!HANDLED_EVENTS.has(event.event)) {
    return res.status(200).json({ received: true });
  }

  try {
    await routeEvent(event);
    // Mark as processed only after successful handling
    if (eventId) {
      processedEventIds.add(eventId);
    }
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Razorpay webhook processing error:", error);
    // Return 500 so Razorpay retries the delivery for transient failures.
    // The event-id dedup above prevents double-processing on successful retries.
    return res.status(500).json({ error: "Processing failed" });
  }
}
