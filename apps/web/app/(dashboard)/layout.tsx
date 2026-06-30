"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardSidebar } from "./components/dashboard-sidebar";
import { WorkspaceProvider } from "./components/workspace-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WorkspaceProvider>
      <TooltipProvider>
        <SidebarProvider>
          <DashboardSidebar />
          <SidebarInset className="min-h-svh">
            <main className="flex-1 p-6">{children}</main>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </WorkspaceProvider>
  );
}
