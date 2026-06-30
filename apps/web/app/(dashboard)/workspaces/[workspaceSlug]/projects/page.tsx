"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/trpc/trpc";
import { useWorkspace } from "../../../components/workspace-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Folder,
  GitBranch,
  ListChecks,
  ArrowRight,
} from "@phosphor-icons/react";

export default function ProjectsPage() {
  const params = useParams<{ workspaceSlug: string }>();
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

  const createProject = trpc.project.create.useMutation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !workspace?.id) return;

    await createProject.mutateAsync({
      workspaceId: workspace.id,
      name: name.trim(),
      description: description.trim() || undefined,
    });
    setName("");
    setDescription("");
    setDialogOpen(false);
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Manage projects within this workspace.
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <Button size="sm">
                <Plus className="mr-1.5 size-4" weight="bold" />
                New Project
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Project</DialogTitle>
              <DialogDescription>
                A project tracks features, PRDs, tasks, and code reviews for a
                single product or service.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="project-name">Project name</Label>
                <Input
                  id="project-name"
                  placeholder="My App"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="project-description">
                  Description{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="project-description"
                  placeholder="A brief description of the project"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={createProject.isPending || !name.trim()}
                >
                  {createProject.isPending ? "Creating..." : "Create Project"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {projects && projects.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <CardContent className="flex flex-col items-center gap-4 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Folder className="size-6 text-muted-foreground" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-medium">No projects yet</p>
              <p className="text-sm text-muted-foreground">
                Create your first project to start building features.
              </p>
            </div>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-1.5 size-4" weight="bold" />
              Create Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects?.map((project) => (
            <Link
              key={project.id}
              href={`/workspaces/${params.workspaceSlug}/projects/${project.id}`}
            >
              <Card className="group cursor-pointer transition-colors hover:bg-accent/50">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10">
                        <Folder
                          className="size-5 text-blue-500"
                          weight="duotone"
                        />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <CardTitle className="text-sm">
                          {project.name}
                        </CardTitle>
                        {project.description && (
                          <CardDescription className="line-clamp-1 text-xs">
                            {project.description}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <GitBranch className="size-3.5" />
                        <span>
                          {(project as any).repositoryCount ?? 0} repo
                          {(project as any).repositoryCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <ListChecks className="size-3.5" />
                        <span>
                          {(project as any).taskCount ?? 0} task
                          {(project as any).taskCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
