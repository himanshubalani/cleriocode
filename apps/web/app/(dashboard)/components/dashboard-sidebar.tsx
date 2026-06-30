"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useParams } from "next/navigation";
import {
  House,
  Buildings,
  Folder,
  Lightbulb,
  Kanban,
  GitPullRequest,
  Rocket,
  Gear,
  CreditCard,
  SignOut,
} from "@phosphor-icons/react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { useWorkspace } from "./workspace-context";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export function DashboardSidebar() {
  const pathname = usePathname();
  const params = useParams<{ workspaceSlug?: string; projectId?: string }>();
  const { workspaceSlug, clearWorkspace } = useWorkspace();
  const router = useRouter();

  const projectId = params.projectId ?? null;

  async function handleSignOut() {
    clearWorkspace();
    await authClient.signOut();
    router.push("/login");
  }

  function isActive(href: string) {
    if (href === pathname) return true;
    // Don't match parent paths for exact items like /workspaces
    if (href === "/workspaces") return pathname === "/workspaces";
    if (workspaceSlug && href === `/workspaces/${workspaceSlug}`) {
      return pathname === `/workspaces/${workspaceSlug}`;
    }
    return pathname.startsWith(href + "/");
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip="ClerioCode" render={
              <Link href="/workspaces" className="flex items-center gap-2">
                {/* Light mode logo */}
                <Image
                  src="/cleriocode_header_light_mode.svg"
                  alt="ClerioCode"
                  width={120}
                  height={32}
                  priority
                  className="block dark:hidden"
                />
                {/* Dark mode logo */}
                <Image
                  src="/cleriocode_header_dark_mode.svg"
                  alt="ClerioCode"
                  width={120}
                  height={32}
                  priority
                  className="hidden dark:block"
                />
              </Link>
            } />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Main navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={isActive("/workspaces")} tooltip="Workspaces">
                  <Link href="/workspaces" className="flex items-center gap-2">
                    <Buildings className="size-4" weight={isActive("/workspaces") ? "fill" : "regular"} />
                    <span>Workspaces</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Workspace-scoped navigation */}
        {workspaceSlug && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Workspace</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton isActive={isActive(`/workspaces/${workspaceSlug}`)} tooltip="Overview">
                      <Link href={`/workspaces/${workspaceSlug}`} className="flex items-center gap-2">
                        <House className="size-4" weight={isActive(`/workspaces/${workspaceSlug}`) ? "fill" : "regular"} />
                        <span>Overview</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton isActive={isActive(`/workspaces/${workspaceSlug}/projects`)} tooltip="Projects">
                      <Link href={`/workspaces/${workspaceSlug}/projects`} className="flex items-center gap-2">
                        <Folder className="size-4" weight={isActive(`/workspaces/${workspaceSlug}/projects`) ? "fill" : "regular"} />
                        <span>Projects</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {/* Project-scoped navigation — visible when inside a project */}
        {workspaceSlug && projectId && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Project</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {[
                    { title: "Features", href: "features", icon: Lightbulb },
                    { title: "Tasks", href: "tasks", icon: Kanban },
                    { title: "Pull Requests", href: "pulls", icon: GitPullRequest },
                    { title: "Releases", href: "releases", icon: Rocket },
                  ].map((item) => {
                    const href = `/workspaces/${workspaceSlug}/projects/${projectId}/${item.href}`;
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton isActive={isActive(href)} tooltip={item.title}>
                          <Link href={href} className="flex items-center gap-2">
                            <item.icon className="size-4" weight={isActive(href) ? "fill" : "regular"} />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {/* Settings & Billing */}
        {workspaceSlug && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton isActive={isActive(`/workspaces/${workspaceSlug}/settings`)} tooltip="Settings">
                      <Link href={`/workspaces/${workspaceSlug}/settings`} className="flex items-center gap-2">
                        <Gear className="size-4" weight={isActive(`/workspaces/${workspaceSlug}/settings`) ? "fill" : "regular"} />
                        <span>Settings</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton isActive={isActive(`/workspaces/${workspaceSlug}/billing`)} tooltip="Billing">
                      <Link href={`/workspaces/${workspaceSlug}/billing`} className="flex items-center gap-2">
                        <CreditCard className="size-4" weight={isActive(`/workspaces/${workspaceSlug}/billing`) ? "fill" : "regular"} />
                        <span>Billing</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Sign out" onClick={handleSignOut}>
              <SignOut className="size-4" />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
