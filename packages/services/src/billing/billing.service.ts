import { prisma } from "@cleriocode/db";
import { NotFoundError } from "../errors.js";
import crypto from "crypto";

const FREE_CREDITS = 5;
const PRO_CREDITS = 100;

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
 * On first activation: upgrades to pro and allocates credits.
 * On renewal: replenishes credits for the new billing cycle.
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

  const isRenewal = subscription.status === "active";

  // Activate/renew subscription
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

  if (isRenewal) {
    // Renewal: replenish credits for the new billing cycle
    await replenishCredits(subscription.workspaceId);
  } else {
    // First activation: upgrade workspace to pro + allocate credits
    await prisma.workspace.update({
      where: { id: subscription.workspaceId },
      data: {
        plan: "pro",
        reviewCredits: PRO_CREDITS,
      },
    });

    // Record credit allocation in ledger
    await prisma.reviewCreditLedger.create({
      data: {
        workspaceId: subscription.workspaceId,
        amount: PRO_CREDITS,
        reason: "plan_upgrade",
        referenceId: subscription.id,
      },
    });
  }

  return { processed: true, workspaceId: subscription.workspaceId };
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
