"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { trpc } from "@/trpc/trpc";
import { useWorkspace } from "@/app/(dashboard)/components/workspace-context";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  GitPullRequest,
  CheckCircle,
  XCircle,
  Warning,
  ArrowLeft,
  GitBranch,
  Clock,
  ChatText,
} from "@phosphor-icons/react";

interface ReviewItem {
  id: string;
  status: string;
  comments: unknown;
  summary: string | null;
  previousReviewId: string | null;
  reviewedCommitSha: string | null;
  createdAt: string;
}

type ReviewStatus = "pending" | "in_progress" | "completed" | "passed" | "failed";
type CommentSeverity = "critical" | "warning" | "suggestion";

interface ReviewComment {
  file?: string;
  line?: number;
  severity: CommentSeverity;
  message: string;
}

function getReviewStatusBadge(status: string) {
  const config: Record<string, { label: string; className: string }> = {
    pending: {
      label: "Pending",
      className: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    },
    in_progress: {
      label: "In Progress",
      className: "bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse",
    },
    completed: {
      label: "Completed",
      className: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    },
    passed: {
      label: "Passed",
      className: "bg-green-500/10 text-green-500 border-green-500/20",
    },
    failed: {
      label: "Failed",
      className: "bg-red-500/10 text-red-500 border-red-500/20",
    },
  };

  const c = config[status] ?? config.pending;

  return (
    <Badge variant="outline" className={c.className}>
      {c.label}
    </Badge>
  );
}

function getSeverityIcon(severity: CommentSeverity) {
  switch (severity) {
    case "critical":
      return <XCircle className="size-4 text-red-500" weight="fill" />;
    case "warning":
      return <Warning className="size-4 text-amber-500" weight="fill" />;
    case "suggestion":
      return <CheckCircle className="size-4 text-blue-400" weight="fill" />;
    default:
      return <ChatText className="size-4 text-muted-foreground" />;
  }
}

function getSeverityBgClass(severity: CommentSeverity) {
  switch (severity) {
    case "critical":
      return "bg-red-500/5 border-red-500/20";
    case "warning":
      return "bg-amber-500/5 border-amber-500/20";
    case "suggestion":
      return "bg-blue-500/5 border-blue-500/20";
    default:
      return "bg-muted/50 border-border";
  }
}

export default function PullRequestDetailPage() {
  const params = useParams<{
    workspaceSlug: string;
    projectId: string;
    pullRequestId: string;
  }>();
  const { workspaceId } = useWorkspace();

  // Get first repository to validate workspace access
  const { data: repositories } = trpc.repository.list.useQuery(
    { workspaceId: workspaceId!, projectId: params.projectId },
    { enabled: !!workspaceId && !!params.projectId }
  );

  const repositoryId = repositories?.[0]?.id;

  // Fetch pull requests to get current PR info
  const { data: pullRequests, isLoading: prLoading } =
    trpc.pullRequest.list.useQuery(
      { workspaceId: workspaceId!, repositoryId: repositoryId! },
      { enabled: !!workspaceId && !!repositoryId }
    );

  const pullRequest = pullRequests?.find((pr) => pr.id === params.pullRequestId);

  // Fetch reviews for this PR
  const { data: reviews, isLoading: reviewsLoading } =
    trpc.review.list.useQuery(
      {
        workspaceId: workspaceId!,
        pullRequestId: params.pullRequestId,
      },
      { enabled: !!params.pullRequestId && !!workspaceId }
    );

  const isLoading = prLoading || reviewsLoading;
  const reviewItems = (reviews ?? []) as unknown as ReviewItem[];
  const latestReview = reviewItems[0];

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-96" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  if (!pullRequest) {
    return (
      <div className="flex flex-col gap-6">
        <Link
          href={`/workspaces/${params.workspaceSlug}/projects/${params.projectId}/pulls`}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="size-4" />
          Back to Pull Requests
        </Link>
        <Card className="flex flex-col items-center justify-center py-16">
          <CardContent className="flex flex-col items-center gap-4 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <GitPullRequest className="size-6 text-muted-foreground" />
            </div>
            <p className="font-medium">Pull request not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Parse comments from latest review
  const rawComments = latestReview?.comments;
  const comments: ReviewComment[] = Array.isArray(rawComments)
    ? rawComments
    : [];

  return (
    <div className="flex flex-col gap-6">
      {/* Back link */}
      <Link
        href={`/workspaces/${params.workspaceSlug}/projects/${params.projectId}/pulls`}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="size-4" />
        Back to Pull Requests
      </Link>

      {/* PR Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <GitPullRequest className="size-6 text-muted-foreground" weight="duotone" />
          <h1 className="text-2xl font-semibold tracking-tight">
            {pullRequest.title}
          </h1>
          <span className="font-mono text-sm text-muted-foreground">
            #{pullRequest.prNumber}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            by <span className="font-medium text-foreground">{pullRequest.authorLogin ?? "Unknown"}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <GitBranch className="size-3.5" />
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              {pullRequest.baseBranch}
            </code>
          </span>
          <span className="flex items-center gap-1.5">
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              {pullRequest.headSha?.slice(0, 7)}
            </code>
          </span>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: AI Review section */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Review summary */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">AI Review</CardTitle>
                {latestReview && getReviewStatusBadge(latestReview.status)}
              </div>
              {latestReview?.summary && (
                <CardDescription className="mt-2 leading-relaxed">
                  {latestReview.summary}
                </CardDescription>
              )}
            </CardHeader>
            {!latestReview && (
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  No AI review has been performed yet.
                </p>
              </CardContent>
            )}
          </Card>

          {/* Review comments */}
          {comments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Review Comments ({comments.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="max-h-[500px]">
                  <div className="flex flex-col gap-2 p-4 pt-0">
                    {comments.map((comment, idx) => (
                      <div
                        key={idx}
                        className={`flex flex-col gap-2 rounded-lg border p-3 ${getSeverityBgClass(comment.severity)}`}
                      >
                        <div className="flex items-center gap-2">
                          {getSeverityIcon(comment.severity)}
                          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {comment.severity}
                          </span>
                          {comment.file && (
                            <code className="ml-auto rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                              {comment.file}
                              {comment.line != null && `:${comment.line}`}
                            </code>
                          )}
                        </div>
                        <p className="text-sm font-[var(--font-mono)] leading-relaxed">
                          {comment.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Review history timeline */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Review History</CardTitle>
              <CardDescription>
                {reviewItems.length} review{reviewItems.length !== 1 ? "s" : ""} performed
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!reviewItems || reviewItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No reviews yet.
                </p>
              ) : (
                <div className="relative flex flex-col gap-0">
                  {reviewItems.map((review, idx) => {
                    const rc = review.comments;
                    const reviewComments: ReviewComment[] = Array.isArray(rc)
                      ? rc
                      : [];
                    const isLatest = idx === 0;
                    const isLast = idx === reviewItems.length - 1;
                    const reviewLabel = review.previousReviewId
                      ? `Re-review ${reviewItems.length - idx - 1}`
                      : "Initial Review";

                    return (
                      <div key={review.id} className="relative flex gap-3">
                        {/* Timeline connector */}
                        <div className="flex flex-col items-center">
                          <div
                            className={`flex size-8 items-center justify-center rounded-full border-2 ${
                              isLatest
                                ? "border-primary bg-primary/10"
                                : "border-border bg-muted"
                            }`}
                          >
                            {review.status === "passed" ? (
                              <CheckCircle
                                className={`size-4 ${isLatest ? "text-primary" : "text-muted-foreground"}`}
                                weight="fill"
                              />
                            ) : review.status === "failed" ? (
                              <XCircle
                                className="size-4 text-red-500"
                                weight="fill"
                              />
                            ) : (
                              <Clock
                                className={`size-4 ${isLatest ? "text-primary" : "text-muted-foreground"}`}
                              />
                            )}
                          </div>
                          {!isLast && (
                            <div className="w-px flex-1 bg-border min-h-4" />
                          )}
                        </div>

                        {/* Timeline content */}
                        <div className="flex flex-col gap-1 pb-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {reviewLabel}
                            </span>
                            {getReviewStatusBadge(review.status)}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" />
                              {format(new Date(review.createdAt), "MMM d, HH:mm")}
                            </span>
                            <span className="flex items-center gap-1">
                              <ChatText className="size-3" />
                              {reviewComments.length} comment{reviewComments.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                          {review.reviewedCommitSha && (
                            <code className="text-xs font-mono text-muted-foreground">
                              {review.reviewedCommitSha.slice(0, 7)}
                            </code>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
