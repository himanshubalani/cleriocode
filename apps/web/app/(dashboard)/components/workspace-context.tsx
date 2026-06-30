"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface WorkspaceContextType {
  workspaceSlug: string | null;
  workspaceId: string | null;
  setWorkspace: (slug: string, id: string) => void;
  clearWorkspace: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  workspaceSlug: null,
  workspaceId: null,
  setWorkspace: () => {},
  clearWorkspace: () => {},
});

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaceSlug, setWorkspaceSlug] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  const setWorkspace = (slug: string, id: string) => {
    setWorkspaceSlug(slug);
    setWorkspaceId(id);
  };

  const clearWorkspace = () => {
    setWorkspaceSlug(null);
    setWorkspaceId(null);
  };

  return (
    <WorkspaceContext.Provider
      value={{ workspaceSlug, workspaceId, setWorkspace, clearWorkspace }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
