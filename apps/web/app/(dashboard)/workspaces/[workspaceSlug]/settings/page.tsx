"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Plus, Gear } from "@phosphor-icons/react";

export default function WorkspaceSettingsPage() {
  const params = useParams<{ workspaceSlug: string }>();
  const { workspaceId } = useWorkspace();

  const { data: workspaces, isLoading } = trpc.workspace.list.useQuery();
  const workspace = workspaces?.find((w) => w.slug === params.workspaceSlug);

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");

  const inviteMutation = trpc.workspace.invite.useMutation({
    onSuccess: () => {
      setInviteEmail("");
      setInviteRole("member");
      setInviteDialogOpen(false);
    },
  });

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim() || !workspaceId) return;
    try {
      await inviteMutation.mutateAsync({
        workspaceId,
        email: inviteEmail.trim(),
        role: inviteRole,
      });
    } catch (err) {
      console.error("Failed to invite member:", err);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-muted-foreground">Workspace not found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Gear className="size-6" weight="duotone" />
          Workspace Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage settings for <span className="font-medium">{workspace.name}</span>
        </p>
      </div>

      {/* Workspace Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">General</CardTitle>
          <CardDescription>Workspace name and details</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="workspace-name">Name</Label>
            <Input
              id="workspace-name"
              value={workspace.name}
              disabled
              className="max-w-sm"
            />
            <p className="text-xs text-muted-foreground">
              Workspace renaming is not yet available.
            </p>
          </div>
          <div className="grid gap-2">
            <Label>Slug</Label>
            <p className="text-sm text-muted-foreground">/{workspace.slug}</p>
          </div>
          <div className="grid gap-2">
            <Label>Plan</Label>
            <Badge variant="secondary" className="w-fit">
              {workspace.plan ?? "free"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="size-4" />
                Members
              </CardTitle>
              <CardDescription>
                People with access to this workspace
              </CardDescription>
            </div>
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger
                render={
                  <Button size="sm" variant="outline">
                    <Plus className="mr-1.5 size-4" weight="bold" />
                    Invite
                  </Button>
                }
              />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation to join this workspace.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleInvite} className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="invite-email">Email address</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="teammate@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="invite-role">Role</Label>
                    <Select
                      value={inviteRole}
                      onValueChange={(v) => setInviteRole(v as "admin" | "member")}
                    >
                      <SelectTrigger id="invite-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {inviteMutation.error && (
                    <p className="text-sm text-destructive">
                      {inviteMutation.error.message}
                    </p>
                  )}
                  <DialogFooter>
                    <Button
                      type="submit"
                      disabled={inviteMutation.isPending || !inviteEmail.trim()}
                    >
                      {inviteMutation.isPending ? "Inviting..." : "Send Invite"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Member list will display here once a members query is available.
            For now, use the invite button to add teammates.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
