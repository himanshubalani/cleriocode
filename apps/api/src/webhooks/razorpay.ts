import type { Request, Response } from "express";
import crypto from "crypto";
import { handlePaymentSuccess, handlePaymentFailure } from "@cleriocode/services";

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

  // Verify webhook signature
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("RAZORPAY_WEBHOOK_SECRET not configured");
    return res.status(500).json({ error: "Webhook secret not configured" });
  }

  const payload = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(payload)
    .digest("hex");

  // Use timing-safe comparison to prevent timing attacks
  if (signature.length !== expectedSignature.length) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );

  if (!isValid) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  // Route event to appropriate billing service handler
  const event = req.body;

  try {
    switch (event.event) {
      case "subscription.activated":
      case "subscription.charged": {
        const subscriptionId =
          event.payload?.subscription?.entity?.id;
        if (subscriptionId) {
          await handlePaymentSuccess({
            subscriptionId,
            currentPeriodStart:
              event.payload?.subscription?.entity?.current_start?.toString(),
            currentPeriodEnd:
              event.payload?.subscription?.entity?.current_end?.toString(),
          });
        }
        break;
      }

      case "subscription.cancelled":
      case "payment.failed": {
        const subscriptionId =
          event.payload?.subscription?.entity?.id;
        if (subscriptionId) {
          await handlePaymentFailure({
            subscriptionId,
            reason: event.event,
          });
        }
        break;
      }

      default:
        // Unknown event type — acknowledge receipt without processing
        break;
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Razorpay webhook processing error:", error);
    // Always return 200 to acknowledge receipt (prevents Razorpay retries)
    return res.status(200).json({ received: true, error: "Processing failed" });
  }
}
