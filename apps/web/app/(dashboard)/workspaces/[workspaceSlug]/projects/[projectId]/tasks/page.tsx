"use client";

import type React from "react";
import { useState, useCallback, useEffect, DragEvent } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/trpc/trpc";
import { useWorkspace } from "../../../../../components/workspace-context";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Kanban,
  CircleDashed,
  Spinner,
  Eye,
  CheckCircle,
} from "@phosphor-icons/react";

// --- Types ---

type TaskStatus = "todo" | "in_progress" | "in_review" | "done";

interface TaskItem {
  id: string;
  title: string;
  description: string;
  status: string;
  complexity: string;
  order: number;
  prdId: string;
  featureTitle: string;
}

// --- Column Config ---

const COLUMNS: {
  id: TaskStatus;
  label: string;
  icon: React.ElementType;
  badgeClass: string;
  headerClass: string;
}[] = [
  {
    id: "todo",
    label: "Todo",
    icon: CircleDashed,
    badgeClass: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    headerClass: "text-zinc-400",
  },
  {
    id: "in_progress",
    label: "In Progress",
    icon: Spinner,
    badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    headerClass: "text-blue-400",
  },
  {
    id: "in_review",
    label: "In Review",
    icon: Eye,
    badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    headerClass: "text-amber-400",
  },
  {
    id: "done",
    label: "Done",
    icon: CheckCircle,
    badgeClass: "bg-green-500/10 text-green-400 border-green-500/20",
    headerClass: "text-green-400",
  },
];

const COMPLEXITY_COLORS: Record<string, string> = {
  low: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  high: "bg-red-500/10 text-red-400 border-red-500/20",
};

// --- Component ---

export default function TasksKanbanPage() {
  const params = useParams<{ workspaceSlug: string; projectId: string }>();
  const { workspaceId } = useWorkspace();

  const {
    data: tasks,
    isLoading,
    refetch,
  } = trpc.task.listByProject.useQuery(
    { workspaceId: workspaceId ?? "", projectId: params.projectId },
    { enabled: !!workspaceId }
  );

  const updateStatus = trpc.task.updateStatus.useMutation({
    onSuccess: () => refetch(),
  });

  // Optimistic local state for drag-and-drop
  const [localTasks, setLocalTasks] = useState<TaskItem[]>([]);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<TaskStatus | null>(null);

  useEffect(() => {
    if (tasks) {
      setLocalTasks(tasks as TaskItem[]);
    }
  }, [tasks]);

  const getColumnTasks = useCallback(
    (status: TaskStatus) =>
      localTasks.filter((t) => t.status === status),
    [localTasks]
  );

  // --- Drag Handlers ---

  const handleDragStart = (e: DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", taskId);
  };

  const handleDragOver = (e: DragEvent, columnId: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget(columnId);
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = (e: DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setDropTarget(null);

    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId || !workspaceId) return;

    const task = localTasks.find((t) => t.id === taskId);
    if (!task || task.status === targetStatus) {
      setDraggedTaskId(null);
      return;
    }

    // Optimistic update
    setLocalTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: targetStatus } : t
      )
    );
    setDraggedTaskId(null);

    // Persist via tRPC
    updateStatus.mutate(
      { workspaceId, taskId, status: targetStatus },
      {
        onError: () => {
          // Revert on error
          setLocalTasks((prev) =>
            prev.map((t) =>
              t.id === taskId ? { ...t, status: task.status } : t
            )
          );
        },
      }
    );
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDropTarget(null);
  };

  // --- Loading State ---

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10">
          <Kanban className="size-5 text-amber-500" weight="duotone" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            Drag and drop tasks between columns to update their status
          </p>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 flex-1 min-h-0">
        {COLUMNS.map((column) => {
          const columnTasks = getColumnTasks(column.id);
          const isOver = dropTarget === column.id;

          return (
            <div
              key={column.id}
              className={`flex flex-col rounded-xl border transition-colors ${
                isOver
                  ? "border-primary/50 bg-primary/5"
                  : "border-border bg-muted/30"
              }`}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <column.icon
                    className={`size-4 ${column.headerClass}`}
                    weight="bold"
                  />
                  <span className="text-sm font-medium">{column.label}</span>
                </div>
                <Badge
                  variant="outline"
                  className={`text-xs tabular-nums ${column.badgeClass}`}
                >
                  {columnTasks.length}
                </Badge>
              </div>

              {/* Column Body */}
              <ScrollArea className="flex-1 p-2 min-h-[200px] max-h-[calc(100vh-280px)]">
                <div className="flex flex-col gap-2">
                  {columnTasks.length === 0 && (
                    <div className="flex items-center justify-center py-8 text-xs text-muted-foreground/60">
                      No tasks
                    </div>
                  )}
                  {columnTasks.map((task, index) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      index={index}
                      isDragging={draggedTaskId === task.id}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Task Card Component ---

function TaskCard({
  task,
  index,
  isDragging,
  onDragStart,
  onDragEnd,
}: {
  task: TaskItem;
  index: number;
  isDragging: boolean;
  onDragStart: (e: DragEvent, taskId: string) => void;
  onDragEnd: () => void;
}) {
  const complexityClass =
    COMPLEXITY_COLORS[task.complexity] ?? COMPLEXITY_COLORS.medium;

  return (
    <Card
      size="sm"
      draggable
      onDragStart={(e) => onDragStart(e as unknown as DragEvent, task.id)}
      onDragEnd={onDragEnd}
      className={`cursor-grab active:cursor-grabbing transition-all animate-in fade-in slide-in-from-bottom-2 ${
        isDragging ? "opacity-50 scale-95 rotate-1" : "hover:ring-2 hover:ring-primary/20"
      }`}
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: "both" }}
    >
      <CardHeader className="pb-1">
        <CardTitle className="text-sm leading-snug line-clamp-2">
          {task.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className={`text-[10px] capitalize ${complexityClass}`}
          >
            {task.complexity}
          </Badge>
          {task.featureTitle && (
            <span className="text-[10px] text-muted-foreground/70 truncate max-w-[120px]">
              {task.featureTitle}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
