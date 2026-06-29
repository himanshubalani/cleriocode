"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  RocketLaunch,
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

const mainNavItems = [
  {
    title: "Overview",
    href: "/",
    icon: House,
  },
  {
    title: "Workspaces",
    href: "/workspaces",
    icon: Buildings,
  },
];

const workspaceNavItems = [
  {
    title: "Projects",
    href: "/projects",
    icon: Folder,
  },
  {
    title: "Features",
    href: "/features",
    icon: Lightbulb,
  },
  {
    title: "Tasks",
    href: "/tasks",
    icon: Kanban,
  },
  {
    title: "Pull Requests",
    href: "/pulls",
    icon: GitPullRequest,
  },
  {
    title: "Releases",
    href: "/releases",
    icon: Rocket,
  },
];

const bottomNavItems = [
  {
    title: "Settings",
    href: "/settings",
    icon: Gear,
  },
  {
    title: "Billing",
    href: "/billing",
    icon: CreditCard,
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { workspaceSlug } = useWorkspace();

  function getHref(basePath: string, isWorkspaceScoped: boolean) {
    if (isWorkspaceScoped && workspaceSlug) {
      return `/workspaces/${workspaceSlug}${basePath}`;
    }
    return basePath;
  }

  function isActive(href: string) {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip="ShipFlow AI">
              <Link href="/" className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10">
                  <RocketLaunch className="size-4 text-amber-500" weight="fill" />
                </div>
                <span className="truncate text-sm font-semibold tracking-tight">
                  ShipFlow AI
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Main navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => {
                const href = getHref(item.href, false);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      isActive={isActive(href)}
                      tooltip={item.title}
                    >
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

        {/* Workspace-scoped navigation — visible only when workspace is selected */}
        {workspaceSlug && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Workspace</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {workspaceNavItems.map((item) => {
                    const href = getHref(item.href, true);
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          isActive={isActive(href)}
                          tooltip={item.title}
                        >
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

        {/* Bottom section — settings & billing */}
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {bottomNavItems.map((item) => {
                const href = workspaceSlug
                  ? `/workspaces/${workspaceSlug}${item.href}`
                  : item.href;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      isActive={isActive(href)}
                      tooltip={item.title}
                    >
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
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Sign out">
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
