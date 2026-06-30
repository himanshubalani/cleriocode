"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  GitPullRequest,
  CheckCircle,
  XCircle,
  Warning,
  ArrowRight,
} from "@phosphor-icons/react";

type PRStatus = "open" | "merged" | "closed" | "released";
type ReviewStatus = "pending" | "in_progress" | "completed" | "passed";

function getPRStatusBadge(status: string) {
  const config: Record<PRStatus, { label: string; className: string }> = {
    open: {
      label: "Open",
      className: "bg-green-500/10 text-green-500 border-green-500/20",
    },
    merged: {
      label: "Merged",
      className: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    },
    closed: {
      label: "Closed",
      className: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    },
    released: {
      label: "Released",
      className: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    },
  };

  const c = config[status as PRStatus] ?? config.open;

  return (
    <Badge variant="outline" className={c.className}>
      {c.label}
    </Badge>
  );
}

function getReviewStatusBadge(status: string | undefined) {
  if (!status) {
    return (
      <Badge variant="outline" className="bg-gray-500/10 text-gray-400 border-gray-500/20">
        No Review
      </Badge>
    );
  }

  const config: Record<ReviewStatus, { label: string; className: string; pulse?: boolean }> = {
    pending: {
      label: "Pending",
      className: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    },
    in_progress: {
      label: "In Progress",
      className: "bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse",
      pulse: true,
    },
    completed: {
      label: "Completed",
      className: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    },
    passed: {
      label: "Passed",
      className: "bg-green-500/10 text-green-500 border-green-500/20",
    },
  };

  const c = config[status as ReviewStatus] ?? config.pending;

  return (
    <Badge variant="outline" className={c.className}>
      {c.label}
    </Badge>
  );
}

export default function PullRequestsPage() {
  const params = useParams<{ workspaceSlug: string; projectId: string }>();
  const { workspaceId } = useWorkspace();

  // Get first repository connected to the project
  const { data: repositories, isLoading: reposLoading } =
    trpc.repository.list.useQuery(
      { workspaceId: workspaceId!, projectId: params.projectId },
      { enabled: !!workspaceId && !!params.projectId }
    );

  const repositoryId = repositories?.[0]?.id;

  const { data: pullRequests, isLoading: prsLoading } =
    trpc.pullRequest.list.useQuery(
      { workspaceId: workspaceId!, repositoryId: repositoryId! },
      { enabled: !!workspaceId && !!repositoryId }
    );

  const isLoading = reposLoading || prsLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Card>
          <CardContent className="p-0">
            <div className="flex flex-col gap-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!repositoryId) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Pull Requests</h1>
          <p className="text-sm text-muted-foreground">
            AI-powered code reviews for your pull requests.
          </p>
        </div>
        <Card className="flex flex-col items-center justify-center py-16">
          <CardContent className="flex flex-col items-center gap-4 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <GitPullRequest className="size-6 text-muted-foreground" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-medium">No repository connected</p>
              <p className="text-sm text-muted-foreground">
                Connect a GitHub repository in project settings to see pull requests.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Pull Requests</h1>
        <p className="text-sm text-muted-foreground">
          AI-powered code reviews for your pull requests.
        </p>
      </div>

      {pullRequests && pullRequests.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <CardContent className="flex flex-col items-center gap-4 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <GitPullRequest className="size-6 text-muted-foreground" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-medium">No pull requests yet</p>
              <p className="text-sm text-muted-foreground">
                Pull requests will appear here when they are created on your connected repository.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">All Pull Requests</CardTitle>
            <CardDescription>
              {pullRequests?.length ?? 0} pull request{(pullRequests?.length ?? 0) !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Review</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pullRequests?.map((pr) => {
                  const latestReview = pr.reviews?.[0];
                  return (
                    <TableRow key={pr.id} className="group">
                      <TableCell>
                        <Link
                          href={`/workspaces/${params.workspaceSlug}/projects/${params.projectId}/pulls/${pr.id}`}
                          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                        >
                          <GitPullRequest className="size-4" weight="duotone" />
                          <span className="font-mono text-xs">{pr.prNumber}</span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/workspaces/${params.workspaceSlug}/projects/${params.projectId}/pulls/${pr.id}`}
                          className="font-medium hover:underline"
                        >
                          {pr.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {pr.authorLogin ?? "Unknown"}
                      </TableCell>
                      <TableCell>{getPRStatusBadge(pr.status)}</TableCell>
                      <TableCell>{getReviewStatusBadge(latestReview?.status)}</TableCell>
                      <TableCell>
                        <Link
                          href={`/workspaces/${params.workspaceSlug}/projects/${params.projectId}/pulls/${pr.id}`}
                        >
                          <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
