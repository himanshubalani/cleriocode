import type { Request, Response } from "express";
import crypto from "crypto";
import { handlePaymentSuccess, handlePaymentFailure } from "@cleriocode/services";

/** Events we actively handle. Everything else gets acknowledged without processing. */
const HANDLED_EVENTS = new Set([
  "subscription.activated",
  "subscription.charged",
  "subscription.cancelled",
  "payment.failed",
]);

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
    await handlePaymentSuccess({
      subscriptionId,
      currentPeriodStart: entity.current_start?.toString(),
      currentPeriodEnd: entity.current_end?.toString(),
    });
    return;
  }

  if (eventName === "subscription.cancelled" || eventName === "payment.failed") {
    await handlePaymentFailure({
      subscriptionId,
      reason: eventName,
    });
  }
}

/**
 * Razorpay webhook handler.
 * Verifies signature using HMAC SHA-256, then routes event to billing service.
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

  const event = req.body;

  if (!HANDLED_EVENTS.has(event.event)) {
    return res.status(200).json({ received: true });
  }

  try {
    await routeEvent(event);
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Razorpay webhook processing error:", error);
    // Always return 200 to acknowledge receipt (prevents Razorpay retries)
    return res.status(200).json({ received: true, error: "Processing failed" });
  }
}
