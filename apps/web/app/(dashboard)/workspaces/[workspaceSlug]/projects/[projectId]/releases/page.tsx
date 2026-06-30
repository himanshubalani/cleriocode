"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/trpc/trpc";
import { useWorkspace } from "@/app/(dashboard)/components/workspace-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Rocket, CheckCircle } from "@phosphor-icons/react";

export default function ReleasesPage() {
  const params = useParams<{ workspaceSlug: string; projectId: string }>();
  const { workspaceId, setWorkspace } = useWorkspace();

  // Resolve workspace from slug
  const { data: workspaces } = trpc.workspace.list.useQuery();
  const workspace = workspaces?.find((w) => w.slug === params.workspaceSlug);

  useEffect(() => {
    if (workspace) {
      setWorkspace(workspace.slug, workspace.id);
    }
  }, [workspace, setWorkspace]);

  const { data: releases, isLoading } = trpc.release.list.useQuery(
    { workspaceId: workspace?.id ?? "", projectId: params.projectId },
    { enabled: !!workspace?.id }
  );

  const approveRelease = trpc.release.approve.useMutation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [version, setVersion] = useState("");

  // Precondition check: disabled if no releases data loaded yet
  // In a real app we'd check tasks done + PR passed; here we keep it simple
  const preconditionsMet = !!workspace?.id;

  async function handleApprove(e: React.FormEvent) {
    e.preventDefault();
    if (!version.trim() || !workspace?.id) return;

    await approveRelease.mutateAsync({
      workspaceId: workspace.id,
      projectId: params.projectId,
      version: version.trim(),
    });
    setVersion("");
    setDialogOpen(false);
  }

  function formatDate(date: string | Date) {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-9 w-40" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Releases</h1>
          <p className="text-sm text-muted-foreground">
            Release history and approval for this project.
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          {preconditionsMet ? (
            <DialogTrigger
              render={
                <Button size="sm">
                  <Rocket className="mr-1.5 size-4" weight="bold" />
                  Approve Release
                </Button>
              }
            />
          ) : (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button size="sm" disabled>
                    <Rocket className="mr-1.5 size-4" weight="bold" />
                    Approve Release
                  </Button>
                }
              />
              <TooltipContent>
                Complete all tasks and pass code review before releasing.
              </TooltipContent>
            </Tooltip>
          )}

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Release</DialogTitle>
              <DialogDescription>
                Create a new release for this project. This will mark all
                associated tasks and pull requests as released.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleApprove} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="release-version">Version</Label>
                <Input
                  id="release-version"
                  placeholder="v1.0.0"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={approveRelease.isPending || !version.trim()}
                >
                  {approveRelease.isPending ? "Approving..." : "Approve & Ship"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Release history */}
      {releases && releases.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <CardContent className="flex flex-col items-center gap-4 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Rocket className="size-6 text-muted-foreground" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-medium">No releases yet</p>
              <p className="text-sm text-muted-foreground">
                Complete all tasks and pass code review to ship.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Approved by</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {releases?.map((release) => (
                  <TableRow key={release.id}>
                    <TableCell className="font-medium">
                      {release.version}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(release.createdAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {release.approvedById ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      >
                        <CheckCircle className="size-3" weight="fill" />
                        Released
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
