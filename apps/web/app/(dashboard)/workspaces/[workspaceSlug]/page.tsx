"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Folder,
  Users,
  ArrowRight,
  Rocket,
  Lightning,
} from "@phosphor-icons/react";

export default function WorkspaceOverviewPage() {
  const params = useParams<{ workspaceSlug: string }>();
  const { workspaceId, setWorkspace } = useWorkspace();

  const { data: workspaces, isLoading: isLoadingWorkspaces } =
    trpc.workspace.list.useQuery();

  // Resolve workspace from slug
  const workspace = workspaces?.find((w) => w.slug === params.workspaceSlug);

  useEffect(() => {
    if (workspace) {
      setWorkspace(workspace.slug, workspace.id);
    }
  }, [workspace, setWorkspace]);

  const { data: projects, isLoading: isLoadingProjects } =
    trpc.project.list.useQuery(
      { workspaceId: workspace?.id ?? "" },
      { enabled: !!workspace?.id }
    );

  const isLoading = isLoadingWorkspaces || isLoadingProjects;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <p className="text-sm text-muted-foreground">Workspace not found.</p>
        <Link href="/workspaces">
          <Button variant="outline" size="sm">
            Back to Workspaces
          </Button>
        </Link>
      </div>
    );
  }

  const projectCount = projects?.length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {workspace.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Workspace overview and recent activity
          </p>
        </div>
        <Badge variant="secondary">{workspace.role}</Badge>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card size="sm">
          <CardContent className="flex items-center gap-3 pt-4">
            <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10">
              <Folder className="size-5 text-blue-500" weight="duotone" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-semibold tabular-nums">
                {projectCount}
              </span>
              <span className="text-xs text-muted-foreground">Projects</span>
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent className="flex items-center gap-3 pt-4">
            <div className="flex size-9 items-center justify-center rounded-lg bg-green-500/10">
              <Users className="size-5 text-green-500" weight="duotone" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-semibold tabular-nums">1</span>
              <span className="text-xs text-muted-foreground">Members</span>
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent className="flex items-center gap-3 pt-4">
            <div className="flex size-9 items-center justify-center rounded-lg bg-purple-500/10">
              <Lightning className="size-5 text-purple-500" weight="duotone" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-semibold tabular-nums">5</span>
              <span className="text-xs text-muted-foreground">
                Review Credits
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Jump into your workspace</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Link href={`/workspaces/${params.workspaceSlug}/projects`}>
            <div className="group flex items-center justify-between rounded-xl border p-4 transition-colors hover:bg-accent/50">
              <div className="flex items-center gap-3">
                <Folder className="size-5 text-muted-foreground" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">View Projects</span>
                  <span className="text-xs text-muted-foreground">
                    {projectCount} project{projectCount !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          </Link>

          <Link href={`/workspaces/${params.workspaceSlug}/projects`}>
            <div className="group flex items-center justify-between rounded-xl border p-4 transition-colors hover:bg-accent/50">
              <div className="flex items-center gap-3">
                <Rocket className="size-5 text-muted-foreground" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">Create Project</span>
                  <span className="text-xs text-muted-foreground">
                    Start a new project
                  </span>
                </div>
              </div>
              <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          </Link>
        </CardContent>
      </Card>

      {/* Recent projects */}
      {projects && projects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Projects</CardTitle>
            <CardDescription>
              Your most recently updated projects
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {projects.slice(0, 5).map((project) => (
              <Link
                key={project.id}
                href={`/workspaces/${params.workspaceSlug}/projects/${project.id}`}
              >
                <div className="group flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent/50">
                  <div className="flex items-center gap-3">
                    <Folder className="size-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{project.name}</span>
                  </div>
                  <ArrowRight className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
