"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/trpc/trpc";
import { useWorkspace } from "../../components/workspace-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CreditCard,
  CheckCircle,
  ArrowUp,
} from "@phosphor-icons/react";

const FREE_CREDIT_LIMIT = 5;
const PRO_CREDIT_LIMIT = 100;

const proFeatures = [
  "100 AI code reviews per month",
  "Priority review processing",
  "Advanced review insights",
  "Team analytics dashboard",
  "Unlimited re-reviews",
];

export default function BillingPage() {
  const params = useParams<{ workspaceSlug: string }>();
  const { setWorkspace } = useWorkspace();

  // Resolve workspace from slug
  const { data: workspaces } = trpc.workspace.list.useQuery();
  const workspace = workspaces?.find((w) => w.slug === params.workspaceSlug);

  useEffect(() => {
    if (workspace) {
      setWorkspace(workspace.slug, workspace.id);
    }
  }, [workspace, setWorkspace]);

  const { data: billing, isLoading } = trpc.billing.getStatus.useQuery(
    { workspaceId: workspace?.id ?? "" },
    { enabled: !!workspace?.id }
  );

  const subscribe = trpc.billing.subscribe.useMutation();

  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);

  async function handleUpgrade() {
    if (!workspace?.id) return;
    const result = await subscribe.mutateAsync({
      workspaceId: workspace.id,
      planId: "pro",
    });
    if (result?.razorpaySubscriptionId) {
      setSubscriptionId(result.razorpaySubscriptionId);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-7 w-28" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-60 w-full" />
          <Skeleton className="h-60 w-full" />
        </div>
      </div>
    );
  }

  const plan = billing?.plan ?? "free";
  const isPro = plan === "pro";
  const creditLimit = isPro ? PRO_CREDIT_LIMIT : FREE_CREDIT_LIMIT;
  const creditsRemaining = billing?.reviewCredits ?? 0;
  const creditPercent = Math.round((creditsRemaining / creditLimit) * 100);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Manage your subscription and review credits.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Current Plan Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="size-5 text-muted-foreground" />
                Current Plan
              </CardTitle>
              <Badge
                variant={isPro ? "default" : "secondary"}
                className={
                  isPro
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : ""
                }
              >
                {isPro ? "Pro" : "Free"}
              </Badge>
            </div>
            {isPro && (
              <CardDescription>
                {billing?.subscriptionStatus === "active" && (
                  <span className="flex items-center gap-1">
                    <CheckCircle
                      className="size-3.5 text-emerald-500"
                      weight="fill"
                    />
                    Active
                    {billing?.renewsAt && (
                      <span className="ml-1">
                        · Renews{" "}
                        {new Date(billing.renewsAt).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}
                      </span>
                    )}
                  </span>
                )}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* Credits remaining */}
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">
                  Review credits
                </span>
                <span
                  className="text-sm font-medium"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {creditsRemaining} / {creditLimit}
                </span>
              </div>
              <Progress value={creditPercent}>
                <ProgressLabel className="sr-only">Credits used</ProgressLabel>
                <ProgressValue className="sr-only">
                  {creditPercent}%
                </ProgressValue>
              </Progress>
            </div>

            {subscriptionId && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  Subscription created:{" "}
                  <span className="font-mono text-xs">{subscriptionId}</span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upgrade / Active Plan Card */}
        {isPro ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle
                  className="size-5 text-emerald-500"
                  weight="fill"
                />
                Pro Plan Active
              </CardTitle>
              <CardDescription>
                You have access to all Pro features.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2">
                {proFeatures.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <CheckCircle
                      className="size-4 text-emerald-500"
                      weight="fill"
                    />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-amber-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUp className="size-5 text-amber-500" weight="bold" />
                Upgrade to Pro
              </CardTitle>
              <CardDescription>
                Unlock more AI reviews and advanced features.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <ul className="flex flex-col gap-2">
                {proFeatures.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <CheckCircle
                      className="size-4 text-amber-500"
                      weight="fill"
                    />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                onClick={handleUpgrade}
                disabled={subscribe.isPending}
                className="w-full bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-600"
              >
                {subscribe.isPending ? (
                  "Processing..."
                ) : (
                  <>
                    <ArrowUp className="mr-1.5 size-4" weight="bold" />
                    Upgrade to Pro
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
