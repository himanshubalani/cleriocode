"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";
import { trpc } from "@/trpc/trpc";
import { useWorkspace } from "../../../../components/workspace-context";
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
  GitBranch,
  ListChecks,
  Lightbulb,
  GitPullRequest,
  Rocket,
  ArrowRight,
  Gear,
} from "@phosphor-icons/react";

export default function ProjectDashboardPage() {
  const params = useParams<{ workspaceSlug: string; projectId: string }>();
  const { workspaceId, setWorkspace } = useWorkspace();

  const { data: workspaces } = trpc.workspace.list.useQuery();
  const workspace = workspaces?.find((w) => w.slug === params.workspaceSlug);

  useEffect(() => {
    if (workspace) {
      setWorkspace(workspace.slug, workspace.id);
    }
  }, [workspace, setWorkspace]);

  const { data: projects, isLoading } = trpc.project.list.useQuery(
    { workspaceId: workspace?.id ?? "" },
    { enabled: !!workspace?.id }
  );

  const project = projects?.find((p) => p.id === params.projectId);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <p className="text-sm text-muted-foreground">Project not found.</p>
        <Link href={`/workspaces/${params.workspaceSlug}/projects`}>
          <Button variant="outline" size="sm">
            Back to Projects
          </Button>
        </Link>
      </div>
    );
  }

  const basePath = `/workspaces/${params.workspaceSlug}/projects/${params.projectId}`;

  const navigationItems = [
    {
      label: "Features",
      description: "Feature requests and PRD generation",
      href: `${basePath}/features`,
      icon: Lightbulb,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      label: "Tasks",
      description: "Kanban board for task management",
      href: `${basePath}/tasks`,
      icon: ListChecks,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Pull Requests",
      description: "PRs with AI code reviews",
      href: `${basePath}/pulls`,
      icon: GitPullRequest,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      label: "Releases",
      description: "Release history and approvals",
      href: `${basePath}/releases`,
      icon: Rocket,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Settings",
      description: "Repository connections and config",
      href: `${basePath}/settings`,
      icon: Gear,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10">
            <Folder className="size-5 text-blue-500" weight="duotone" />
          </div>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-2xl font-semibold tracking-tight">
              {project.name}
            </h1>
            {project.description && (
              <p className="text-sm text-muted-foreground">
                {project.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card size="sm">
          <CardContent className="flex items-center gap-3 pt-4">
            <div className="flex size-8 items-center justify-center rounded-lg bg-purple-500/10">
              <GitBranch className="size-4 text-purple-500" weight="duotone" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-semibold tabular-nums">
                {(project as any).repositoryCount ?? 0}
              </span>
              <span className="text-xs text-muted-foreground">Repositories</span>
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent className="flex items-center gap-3 pt-4">
            <div className="flex size-8 items-center justify-center rounded-lg bg-green-500/10">
              <ListChecks className="size-4 text-green-500" weight="duotone" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-semibold tabular-nums">
                {(project as any).taskCount ?? 0}
              </span>
              <span className="text-xs text-muted-foreground">Tasks</span>
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent className="flex items-center gap-3 pt-4">
            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10">
              <Lightbulb className="size-4 text-amber-500" weight="duotone" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-semibold tabular-nums">0</span>
              <span className="text-xs text-muted-foreground">Features</span>
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent className="flex items-center gap-3 pt-4">
            <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10">
              <Rocket className="size-4 text-blue-500" weight="duotone" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-semibold tabular-nums">0</span>
              <span className="text-xs text-muted-foreground">Releases</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation cards */}
      <Card>
        <CardHeader>
          <CardTitle>Project Sections</CardTitle>
          <CardDescription>Navigate to different areas of this project</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          {navigationItems.map((item) => (
            <Link key={item.label} href={item.href}>
              <div className="group flex items-center justify-between rounded-xl border p-4 transition-colors hover:bg-accent/50">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex size-8 items-center justify-center rounded-lg ${item.bgColor}`}
                  >
                    <item.icon className={`size-4 ${item.color}`} weight="duotone" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </div>
                </div>
                <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
