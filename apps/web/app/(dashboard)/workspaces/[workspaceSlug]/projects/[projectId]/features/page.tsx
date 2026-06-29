"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/trpc/trpc";
import { useWorkspace } from "../../../../../components/workspace-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Lightning,
  ArrowRight,
  CircleNotch,
  Lightbulb,
} from "@phosphor-icons/react";

type FeatureStatus = "open" | "prd_generating" | "prd_ready" | "closed";

function StatusBadge({ status }: { status: FeatureStatus }) {
  switch (status) {
    case "open":
      return (
        <Badge variant="secondary">
          <span className="mr-1 inline-block size-1.5 rounded-full bg-muted-foreground" />
          Open
        </Badge>
      );
    case "prd_generating":
      return (
        <Badge variant="secondary" className="text-amber-600 dark:text-amber-400">
          <span className="mr-1 inline-block size-1.5 animate-pulse rounded-full bg-amber-500" />
          Generating PRD
        </Badge>
      );
    case "prd_ready":
      return (
        <Badge variant="secondary" className="text-green-600 dark:text-green-400">
          <span className="mr-1 inline-block size-1.5 rounded-full bg-green-500" />
          PRD Ready
        </Badge>
      );
    case "closed":
      return (
        <Badge variant="secondary" className="text-muted-foreground">
          <span className="mr-1 inline-block size-1.5 rounded-full bg-muted-foreground/50" />
          Closed
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export default function FeaturesPage() {
  const params = useParams<{ workspaceSlug: string; projectId: string }>();
  const { workspaceId } = useWorkspace();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const {
    data: features,
    isLoading,
    refetch,
  } = trpc.featureRequest.list.useQuery(
    { workspaceId: workspaceId ?? "", projectId: params.projectId },
    { enabled: !!workspaceId }
  );

  const createFeature = trpc.featureRequest.create.useMutation({
    onSuccess: () => {
      setDialogOpen(false);
      setTitle("");
      setDescription("");
      refetch();
    },
  });

  const generatePRD = trpc.featureRequest.generatePRD.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleCreate = () => {
    if (!workspaceId || !title.trim() || !description.trim()) return;
    createFeature.mutate({
      workspaceId,
      projectId: params.projectId,
      title: title.trim(),
      description: description.trim(),
    });
  };

  const handleGeneratePRD = (featureRequestId: string) => {
    if (!workspaceId) return;
    generatePRD.mutate({ workspaceId, featureRequestId });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Feature Requests
          </h1>
          <p className="text-sm text-muted-foreground">
            Submit ideas and generate AI-powered PRDs
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <Button>
                <Plus data-icon="inline-start" weight="bold" />
                New Feature
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Feature Request</DialogTitle>
              <DialogDescription>
                Describe the feature you want to build. AI will generate a
                structured PRD from your description.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="feature-title"
                  className="text-sm font-medium"
                >
                  Title
                </label>
                <Input
                  id="feature-title"
                  placeholder="e.g., User notification preferences"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="feature-description"
                  className="text-sm font-medium"
                >
                  Description
                </label>
                <Textarea
                  id="feature-description"
                  placeholder="Describe the feature, the problem it solves, and any context..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-28"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreate}
                disabled={
                  createFeature.isPending || !title.trim() || !description.trim()
                }
              >
                {createFeature.isPending && (
                  <CircleNotch
                    data-icon="inline-start"
                    className="animate-spin"
                  />
                )}
                Create Feature
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Feature list */}
      {features && features.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
            <Lightbulb className="size-10 text-muted-foreground" weight="duotone" />
            <p className="text-sm text-muted-foreground">
              No feature requests yet. Create one to get started.
            </p>
          </CardContent>
        </Card>
      )}

      {features && features.length > 0 && (
        <div className="grid gap-3">
          {features.map((feature) => (
            <Card key={feature.id} size="sm">
              <CardContent className="flex items-center justify-between gap-4 pt-4">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {feature.title}
                    </span>
                    <StatusBadge status={feature.status as FeatureStatus} />
                  </div>
                  <p className="line-clamp-1 text-xs text-muted-foreground">
                    {feature.description}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {feature.status === "open" && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleGeneratePRD(feature.id)}
                      disabled={generatePRD.isPending}
                    >
                      {generatePRD.isPending &&
                      generatePRD.variables?.featureRequestId ===
                        feature.id ? (
                        <CircleNotch
                          data-icon="inline-start"
                          className="animate-spin"
                        />
                      ) : (
                        <Lightning data-icon="inline-start" weight="bold" />
                      )}
                      Generate PRD
                    </Button>
                  )}

                  {feature.status === "prd_generating" && (
                    <Button variant="secondary" size="sm" disabled>
                      <CircleNotch
                        data-icon="inline-start"
                        className="animate-spin"
                      />
                      Processing
                    </Button>
                  )}

                  {feature.status === "prd_ready" && (
                    <Link
                      href={`/workspaces/${params.workspaceSlug}/projects/${params.projectId}/prd/${feature.id}`}
                    >
                      <Button variant="outline" size="sm">
                        View PRD
                        <ArrowRight data-icon="inline-end" />
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
