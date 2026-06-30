"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/trpc/trpc";
import { useWorkspace } from "../../../../../../components/workspace-context";
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
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  CircleNotch,
  Target,
  ListChecks,
  ClipboardText,
  Code,
  Lightning,
} from "@phosphor-icons/react";

function PRDStatusBadge({ status }: { status: string }) {
  if (status === "approved") {
    return (
      <Badge variant="secondary" className="text-green-600 dark:text-green-400">
        <CheckCircle data-icon="inline-start" weight="fill" className="size-3" />
        Approved
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-amber-600 dark:text-amber-400">
      <span className="mr-1 inline-block size-1.5 rounded-full bg-amber-500" />
      Draft
    </Badge>
  );
}

interface PRDContent {
  goals?: string[];
  requirements?: string[];
  acceptanceCriteria?: string[];
  technicalNotes?: string[];
}

export default function PRDPage() {
  const params = useParams<{
    workspaceSlug: string;
    projectId: string;
    prdId: string;
  }>();
  const { workspaceId } = useWorkspace();
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);

  const {
    data: prd,
    isLoading,
    refetch,
  } = trpc.prd.get.useQuery(
    { workspaceId: workspaceId ?? "", prdId: params.prdId },
    { enabled: !!workspaceId }
  );

  const finalizePRD = trpc.prd.finalize.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const generateTasks = trpc.task.generate.useMutation({
    onSuccess: () => {
      setIsGeneratingTasks(true);
    },
  });

  // Poll for tasks while generation is in progress, or check once if PRD is approved
  const isApproved = prd?.status === "approved";
  const { data: tasks } = trpc.task.list.useQuery(
    { workspaceId: workspaceId ?? "", prdId: params.prdId },
    {
      enabled: !!workspaceId && (isGeneratingTasks || isApproved),
      refetchInterval: isGeneratingTasks ? 3000 : false,
    }
  );

  // Stop polling once tasks appear
  useEffect(() => {
    if (isGeneratingTasks && tasks && tasks.length > 0) {
      setIsGeneratingTasks(false);
    }
  }, [isGeneratingTasks, tasks]);

  const handleFinalize = () => {
    if (!workspaceId) return;
    finalizePRD.mutate({ workspaceId, prdId: params.prdId });
  };

  const handleGenerateTasks = () => {
    if (!workspaceId) return;
    generateTasks.mutate({ workspaceId, prdId: params.prdId });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-24" />
        <div className="grid gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!prd) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <p className="text-sm text-muted-foreground">PRD not found.</p>
        <Link
          href={`/workspaces/${params.workspaceSlug}/projects/${params.projectId}/features`}
        >
          <Button variant="outline" size="sm">
            <ArrowLeft data-icon="inline-start" />
            Back to Features
          </Button>
        </Link>
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content = (prd as any).content as PRDContent;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Link
            href={`/workspaces/${params.workspaceSlug}/projects/${params.projectId}/features`}
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3" />
            Back to Features
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              Product Requirements Document
            </h1>
            <PRDStatusBadge status={prd.status} />
          </div>
        </div>

        {!isApproved && (
          <Button onClick={handleFinalize} disabled={finalizePRD.isPending}>
            {finalizePRD.isPending ? (
              <CircleNotch data-icon="inline-start" className="animate-spin" />
            ) : (
              <CheckCircle data-icon="inline-start" weight="bold" />
            )}
            Finalize PRD
          </Button>
        )}

        {isApproved && (
          <div className="flex items-center gap-2">
            {isGeneratingTasks ? (
              <Button disabled>
                <CircleNotch data-icon="inline-start" className="animate-spin" />
                Generating tasks…
              </Button>
            ) : tasks && tasks.length > 0 ? (
              <Link
                href={`/workspaces/${params.workspaceSlug}/projects/${params.projectId}/tasks`}
              >
                <Button variant="outline">
                  <ListChecks data-icon="inline-start" weight="bold" />
                  View Tasks
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </Link>
            ) : (
              <Button
                onClick={handleGenerateTasks}
                disabled={generateTasks.isPending}
              >
                {generateTasks.isPending ? (
                  <CircleNotch data-icon="inline-start" className="animate-spin" />
                ) : (
                  <Lightning data-icon="inline-start" weight="bold" />
                )}
                Generate Tasks
              </Button>
            )}
          </div>
        )}
      </div>

      {/* PRD Content Sections */}
      <div className="grid gap-4">
        {/* Goals */}
        {content.goals && content.goals.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="size-4 text-blue-500" weight="duotone" />
                Goals
              </CardTitle>
              <CardDescription>
                What this feature aims to achieve
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2">
                {content.goals.map((goal, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm"
                  >
                    <span className="mt-1.5 inline-block size-1.5 shrink-0 rounded-full bg-blue-500" />
                    {goal}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Requirements */}
        {content.requirements && content.requirements.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardText
                  className="size-4 text-purple-500"
                  weight="duotone"
                />
                Requirements
              </CardTitle>
              <CardDescription>
                Functional and non-functional requirements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2">
                {content.requirements.map((req, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm"
                  >
                    <span className="mt-1.5 inline-block size-1.5 shrink-0 rounded-full bg-purple-500" />
                    {req}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Acceptance Criteria */}
        {content.acceptanceCriteria && content.acceptanceCriteria.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListChecks
                  className="size-4 text-green-500"
                  weight="duotone"
                />
                Acceptance Criteria
              </CardTitle>
              <CardDescription>
                Conditions that must be met for completion
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2">
                {content.acceptanceCriteria.map((criteria, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm"
                  >
                    <span className="mt-1.5 inline-block size-1.5 shrink-0 rounded-full bg-green-500" />
                    {criteria}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Technical Notes */}
        {content.technicalNotes && content.technicalNotes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="size-4 text-amber-500" weight="duotone" />
                Technical Notes
              </CardTitle>
              <CardDescription>
                Implementation considerations and technical guidance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2">
                {content.technicalNotes.map((note, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm"
                  >
                    <span className="mt-1.5 inline-block size-1.5 shrink-0 rounded-full bg-amber-500" />
                    {note}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Approved state notice */}
      {isApproved && (
        <Card size="sm">
          <CardContent className="flex items-center gap-3 pt-4">
            <CheckCircle
              className="size-5 text-green-500"
              weight="fill"
            />
            <p className="text-sm text-muted-foreground">
              This PRD has been finalized and approved. No further edits are
              allowed.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
