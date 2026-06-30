"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/trpc/trpc";
import { useWorkspace } from "@/app/(dashboard)/components/workspace-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  GithubLogo,
  Link as LinkIcon,
  CheckCircle,
  GitBranch,
  CircleNotch,
  WarningCircle,
  ArrowsClockwise,
} from "@phosphor-icons/react";

const GITHUB_APP_INSTALL_URL =
  process.env.NEXT_PUBLIC_GITHUB_PUBLIC_LINK ?? "https://github.com/apps/clerio-code";

export default function SettingsPage() {
  const params = useParams<{ workspaceSlug: string; projectId: string }>();
  const { workspaceId } = useWorkspace();

  // Form state
  const [owner, setOwner] = useState("");
  const [repoName, setRepoName] = useState("");
  const [installationId, setInstallationId] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Fetch connected repositories
  const {
    data: repositories,
    isLoading,
    refetch,
  } = trpc.repository.list.useQuery(
    { workspaceId: workspaceId!, projectId: params.projectId },
    { enabled: !!workspaceId && !!params.projectId }
  );

  // Fetch sync statuses for connected repositories
  const repoFullNames = repositories?.map((r) => r.fullName) ?? [];
  const { data: syncStatuses, refetch: refetchSyncStatuses } =
    trpc.repository.getSyncStatuses.useQuery(
      { workspaceId: workspaceId!, repoFullNames },
      {
        enabled: !!workspaceId && repoFullNames.length > 0,
      }
    );

  // Sync codebase mutation
  const syncMutation = trpc.repository.syncCodebase.useMutation({
    onSuccess: () => {
      refetchSyncStatuses();
    },
  });

  // Connect repository mutation
  const connectMutation = trpc.repository.connect.useMutation({
    onSuccess: () => {
      setOwner("");
      setRepoName("");
      setInstallationId("");
      setError(null);
      refetch();
    },
    onError: (err) => {
      setError(err.message ?? "Failed to connect repository. Please verify the details and try again.");
    },
  });

  const handleConnect = () => {
    setError(null);

    if (!owner.trim() || !repoName.trim() || !installationId.trim()) {
      setError("All fields are required.");
      return;
    }

    const parsedInstallationId = parseInt(installationId, 10);
    if (isNaN(parsedInstallationId) || parsedInstallationId <= 0) {
      setError("Installation ID must be a positive number.");
      return;
    }

    connectMutation.mutate({
      workspaceId: workspaceId!,
      projectId: params.projectId,
      owner: owner.trim(),
      name: repoName.trim(),
      installationId: parsedInstallationId,
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          GitHub Integration
        </h1>
        <p className="text-sm text-muted-foreground">
          Connect GitHub repositories to enable AI code reviews on pull requests.
        </p>
      </div>

      {/* Connected Repositories Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <GitBranch className="size-4" weight="duotone" />
            Connected Repositories
          </CardTitle>
          <CardDescription>
            Repositories linked to this project for webhook events and AI reviews.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {repositories && repositories.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Repository</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Installation ID</TableHead>
                  <TableHead>Connected</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {repositories.map((repo) => {
                  const status = syncStatuses?.find(
                    (s: { repoFullName: string; status: string }) =>
                      s.repoFullName === repo.fullName
                  );
                  const syncStatus = status?.status as
                    | "synced"
                    | "syncing"
                    | "error"
                    | undefined;

                  return (
                    <TableRow key={repo.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <GithubLogo className="size-4 text-muted-foreground" />
                          {repo.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {repo.fullName}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {repo.installationId}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {new Date(repo.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {syncStatus === "synced" ? (
                          <Badge
                            variant="outline"
                            className="bg-green-500/10 text-green-500 border-green-500/20"
                          >
                            <CheckCircle className="mr-1 size-3" weight="fill" />
                            Synced
                          </Badge>
                        ) : syncStatus === "syncing" ? (
                          <Badge
                            variant="outline"
                            className="bg-amber-500/10 text-amber-500 border-amber-500/20"
                          >
                            <CircleNotch className="mr-1 size-3 animate-spin" />
                            Syncing
                          </Badge>
                        ) : syncStatus === "error" ? (
                          <Badge
                            variant="outline"
                            className="bg-red-500/10 text-red-500 border-red-500/20"
                          >
                            <WarningCircle className="mr-1 size-3" weight="fill" />
                            Error
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-green-500/10 text-green-500 border-green-500/20"
                          >
                            <CheckCircle className="mr-1 size-3" weight="fill" />
                            Active
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={
                            syncMutation.isPending &&
                            syncMutation.variables?.repoFullName === repo.fullName
                          }
                          onClick={() =>
                            syncMutation.mutate({
                              workspaceId: workspaceId!,
                              repoFullName: repo.fullName,
                              installationId: repo.installationId,
                              branch: "main",
                            })
                          }
                        >
                          {syncMutation.isPending &&
                          syncMutation.variables?.repoFullName === repo.fullName ? (
                            <>
                              <CircleNotch className="mr-1 size-3 animate-spin" />
                              Syncing...
                            </>
                          ) : (
                            <>
                              <ArrowsClockwise className="mr-1 size-3" />
                              Sync Now
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <GitBranch className="size-6 text-muted-foreground" />
              </div>
              <p className="mt-4 font-medium">No repositories connected</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Connect a GitHub repository below to get started.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connect New Repository Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <LinkIcon className="size-4" weight="duotone" />
            Connect Repository
          </CardTitle>
          <CardDescription>
            Link a GitHub repository to this project for pull request tracking
            and AI code reviews.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-5">
            {/* Step 1: Install GitHub App */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="size-5 items-center justify-center rounded-full p-0 text-[10px] font-semibold"
                >
                  1
                </Badge>
                <span className="text-sm font-medium">
                  Install the GitHub App
                </span>
              </div>
              <p className="ml-7 text-sm text-muted-foreground">
                Install the GitHub App on your organization or personal account
                to grant repository access. After installation, note the
                installation ID from the URL.
              </p>
              <div className="ml-7">
                <a
                  href={GITHUB_APP_INSTALL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center justify-center gap-1 rounded-4xl border border-border bg-background px-3 text-sm font-medium transition-all hover:bg-muted hover:text-foreground"
                >
                  <GithubLogo className="size-4" weight="fill" />
                  Install GitHub App
                </a>
              </div>
            </div>

            {/* Step 2: Enter repo details */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="size-5 items-center justify-center rounded-full p-0 text-[10px] font-semibold"
                >
                  2
                </Badge>
                <span className="text-sm font-medium">
                  Enter repository details
                </span>
              </div>
              <div className="ml-7 flex flex-col gap-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="owner"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Owner
                    </label>
                    <Input
                      id="owner"
                      placeholder="my-org"
                      value={owner}
                      onChange={(e) => setOwner(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="repoName"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Repository Name
                    </label>
                    <Input
                      id="repoName"
                      placeholder="my-repo"
                      value={repoName}
                      onChange={(e) => setRepoName(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="installationId"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Installation ID
                    </label>
                    <Input
                      id="installationId"
                      type="number"
                      placeholder="12345678"
                      value={installationId}
                      onChange={(e) => setInstallationId(e.target.value)}
                    />
                  </div>
                </div>

                {/* Error message */}
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                {/* Connect button */}
                <div>
                  <Button
                    onClick={handleConnect}
                    disabled={connectMutation.isPending}
                  >
                    {connectMutation.isPending ? (
                      <>Connecting...</>
                    ) : (
                      <>
                        <LinkIcon className="mr-2 size-4" />
                        Connect Repository
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
