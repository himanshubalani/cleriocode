import { prisma } from "@cleriocode/db";
import { NotFoundError } from "../errors.js";
import crypto from "crypto";

const FREE_CREDITS = 5;
const PRO_CREDITS = 100;

/**
 * Subscription status result with explicit plan, status, credits, and renewal info.
 */
export interface SubscriptionStatus {
  plan: "free" | "pro";
  status: "active" | "canceled" | "created" | "pending" | null;
  reviewCredits: number;
  renewsAt: Date | null;
}

/**
 * Returns the full subscription status for a workspace using explicit early-return
 * logic for every edge case.
 *
 * Follows the same pattern as pr-reviewer's getUserSubscription:
 * - No subscription → free/active
 * - Subscription created but not yet active → free/pending
 * - Subscription active → pro/active with credits
 * - Subscription canceled but within billing period → pro/active (still accessible)
 * - Subscription canceled and expired → free/canceled
 */
export async function getSubscriptionStatus(workspaceId: string): Promise<SubscriptionStatus> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: { subscription: true },
  });
  if (!workspace) throw new NotFoundError("Workspace", workspaceId);

  const subscription = workspace.subscription;
  const reviewCredits = workspace.reviewCredits;

  // No subscription record at all — workspace is on the free plan
  if (!subscription) {
    return { plan: "free", status: null, reviewCredits, renewsAt: null };
  }

  const renewsAt = subscription.currentPeriodEnd ?? null;

  // Subscription was created but never activated (awaiting first payment)
  if (subscription.status === "created") {
    return { plan: "free", status: "created", reviewCredits, renewsAt };
  }

  // Subscription is active — workspace is on pro
  if (subscription.status === "active") {
    return { plan: "pro", status: "active", reviewCredits, renewsAt };
  }

  // Subscription was canceled — check if still within the paid period
  if (subscription.status === "canceled") {
    const stillActive = renewsAt !== null && renewsAt > new Date();

    if (stillActive) {
      return { plan: "pro", status: "active", reviewCredits, renewsAt };
    }

    return { plan: "free", status: "canceled", reviewCredits, renewsAt };
  }

  // Fallback for any unexpected status
  return { plan: "free", status: subscription.status as SubscriptionStatus["status"], reviewCredits, renewsAt };
}

/**
 * Returns the billing status for a workspace including plan, credits,
 * and subscription info.
 */
export async function getBillingStatus(workspaceId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: { subscription: true },
  });
  if (!workspace) throw new NotFoundError("Workspace", workspaceId);

  return {
    plan: workspace.plan,
    reviewCredits: workspace.reviewCredits,
    subscriptionStatus: workspace.subscription?.status ?? null,
    renewsAt: workspace.subscription?.currentPeriodEnd ?? null,
  };
}

/**
 * Creates a Razorpay subscription in sandbox mode and persists the reference.
 * In production, this would call Razorpay API with RAZORPAY_KEY_ID/SECRET.
 *
 * Environment variables needed:
 * - RAZORPAY_KEY_ID
 * - RAZORPAY_KEY_SECRET
 * - RAZORPAY_PLAN_ID (the plan identifier in Razorpay dashboard)
 */
export async function createSubscription(workspaceId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: { subscription: true },
  });
  if (!workspace) throw new NotFoundError("Workspace", workspaceId);

  // In sandbox mode, simulate creating a Razorpay subscription.
  // In production, replace with actual Razorpay API call:
  //   const razorpay = new Razorpay({ key_id, key_secret });
  //   const sub = await razorpay.subscriptions.create({ plan_id, total_count: 12 });
  const razorpaySubscriptionId = `sub_${crypto.randomBytes(12).toString("hex")}`;
  const razorpayPlanId = process.env.RAZORPAY_PLAN_ID ?? "plan_pro_monthly";

  // Persist subscription reference (upsert handles re-subscription)
  const subscription = await prisma.subscription.upsert({
    where: { workspaceId },
    create: {
      workspaceId,
      razorpaySubscriptionId,
      razorpayPlanId,
      status: "created",
    },
    update: {
      razorpaySubscriptionId,
      razorpayPlanId,
      status: "created",
    },
  });

  return {
    razorpaySubscriptionId: subscription.razorpaySubscriptionId,
    subscriptionId: subscription.id,
  };
}

/**
 * Handles a successful payment webhook from Razorpay.
 *
 * Uses explicit early-return logic:
 * - If subscription is already active → this is a renewal → replenish credits
 * - If subscription is not yet active → this is first activation → upgrade to pro
 */
export async function handlePaymentSuccess(payload: {
  subscriptionId: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
}) {
  const subscription = await prisma.subscription.findFirst({
    where: { razorpaySubscriptionId: payload.subscriptionId },
  });
  if (!subscription) return { processed: false, reason: "subscription_not_found" };

  // Update subscription period regardless of activation vs renewal
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: "active",
      currentPeriodStart: payload.currentPeriodStart
        ? new Date(payload.currentPeriodStart)
        : new Date(),
      currentPeriodEnd: payload.currentPeriodEnd
        ? new Date(payload.currentPeriodEnd)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  // Renewal: subscription was already active → just replenish credits
  if (subscription.status === "active") {
    await replenishCredits(subscription.workspaceId);
    return { processed: true, action: "renewal", workspaceId: subscription.workspaceId };
  }

  // First activation: upgrade workspace to pro + allocate credits
  await prisma.workspace.update({
    where: { id: subscription.workspaceId },
    data: {
      plan: "pro",
      reviewCredits: PRO_CREDITS,
    },
  });

  await prisma.reviewCreditLedger.create({
    data: {
      workspaceId: subscription.workspaceId,
      amount: PRO_CREDITS,
      reason: "plan_upgrade",
      referenceId: subscription.id,
    },
  });

  return { processed: true, action: "activation", workspaceId: subscription.workspaceId };
}

/**
 * Handles a payment failure webhook from Razorpay.
 * Logs the failure but preserves the current plan (no downgrade on failure).
 */
export async function handlePaymentFailure(payload: {
  subscriptionId: string;
  reason?: string;
}) {
  const subscription = await prisma.subscription.findFirst({
    where: { razorpaySubscriptionId: payload.subscriptionId },
  });
  if (!subscription) return { processed: false, reason: "subscription_not_found" };

  // Log failure — do NOT change the plan or credits
  console.error(
    `Payment failed for subscription ${payload.subscriptionId}: ${payload.reason ?? "unknown"}`
  );

  return { processed: true, action: "no_change", workspaceId: subscription.workspaceId };
}

/**
 * Replenishes review credits based on the workspace's current plan.
 * Called on billing cycle renewal.
 */
export async function replenishCredits(workspaceId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  });
  if (!workspace) throw new NotFoundError("Workspace", workspaceId);

  const credits = workspace.plan === "pro" ? PRO_CREDITS : FREE_CREDITS;

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { reviewCredits: credits },
  });

  await prisma.reviewCreditLedger.create({
    data: {
      workspaceId,
      amount: credits,
      reason: "monthly_allocation",
    },
  });

  return { workspaceId, credits };
}
