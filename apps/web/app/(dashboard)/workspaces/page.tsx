"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trpc } from "@/trpc/trpc";
import { useWorkspace } from "../components/workspace-context";
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
  Buildings,
  Users,
  ArrowRight,
} from "@phosphor-icons/react";

export default function WorkspacesPage() {
  const router = useRouter();
  const { data: workspaces, isLoading, refetch } = trpc.workspace.list.useQuery();
  const ensureDefault = trpc.workspace.ensureDefault.useMutation({
    onSuccess: (data) => {
      if (data && data.length === 1) {
        // Auto-redirect to the default workspace
        setWorkspace(data[0].slug, data[0].id);
        router.push(`/workspaces/${data[0].slug}`);
      } else {
        refetch();
      }
    },
  });
  const createWorkspace = trpc.workspace.create.useMutation({
    onSuccess: () => {
      refetch();
      setName("");
      setDialogOpen(false);
    },
  });
  const { setWorkspace } = useWorkspace();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");

  // Auto-create default workspace for new users
  useEffect(() => {
    if (!isLoading && workspaces && workspaces.length === 0) {
      ensureDefault.mutate();
    }
  }, [isLoading, workspaces]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createWorkspace.mutateAsync({ name: name.trim() });
    } catch (err) {
      // Error is surfaced via createWorkspace.error — no uncaught rejection
      console.error("Failed to create workspace:", err);
    }
  }

  function handleWorkspaceClick(slug: string, id: string) {
    setWorkspace(slug, id);
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Workspaces</h1>
          <p className="text-sm text-muted-foreground">
            Manage your team workspaces and collaborate on projects.
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <Button size="sm">
                <Plus className="mr-1.5 size-4" weight="bold" />
                New Workspace
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Workspace</DialogTitle>
              <DialogDescription>
                A workspace groups your projects, team members, and billing in one place.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="workspace-name">Workspace name</Label>
                <Input
                  id="workspace-name"
                  placeholder="My Team"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={createWorkspace.isPending || !name.trim()}
                >
                  {createWorkspace.isPending ? "Creating..." : "Create Workspace"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {workspaces && workspaces.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <CardContent className="flex flex-col items-center gap-4 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Buildings className="size-6 text-muted-foreground" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-medium">No workspaces yet</p>
              <p className="text-sm text-muted-foreground">
                Create your first workspace to start organizing projects.
              </p>
            </div>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-1.5 size-4" weight="bold" />
              Create Workspace
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces?.map((workspace) => (
            <Link
              key={workspace.id}
              href={`/workspaces/${workspace.slug}`}
              onClick={() => handleWorkspaceClick(workspace.slug, workspace.id)}
            >
              <Card className="group cursor-pointer transition-colors hover:bg-accent/50">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                        <Buildings className="size-5 text-primary" weight="duotone" />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <CardTitle className="text-sm">{workspace.name}</CardTitle>
                        <CardDescription className="text-xs">
                          /{workspace.slug}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {workspace.role}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="size-3.5" />
                      <span>Team workspace</span>
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
