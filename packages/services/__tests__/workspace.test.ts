import { describe, it, expect, vi, beforeEach } from "vitest";
import { createWorkspace, listWorkspaces, assertWorkspaceRole } from "../src/workspace/workspace.service.js";

// Mock @cleriocode/db
vi.mock("@cleriocode/db", () => ({
  prisma: {
    workspace: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    workspaceMember: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@cleriocode/db";

const mockedPrisma = prisma as unknown as {
  workspace: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  workspaceMember: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
};

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * **Validates: Requirements 1.1**
 * Property 1: Workspace Creation Persistence
 * For any valid name and user, createWorkspace should persist a workspace
 * with name, slug, and owner member.
 */
describe("Property 1: Workspace Creation Persistence", () => {
  it("should persist a workspace with name, slug, and assign creator as owner", async () => {
    const userId = "user-123";
    const workspaceName = "My Test Workspace";

    mockedPrisma.workspace.create.mockResolvedValue({
      id: "ws-1",
      name: workspaceName,
      slug: "my-test-workspace",
      members: [{ userId, role: "owner" }],
    });

    const result = await createWorkspace({ name: workspaceName }, userId);

    // Verify prisma was called with correct data
    expect(mockedPrisma.workspace.create).toHaveBeenCalledWith({
      data: {
        name: workspaceName,
        slug: "my-test-workspace",
        members: {
          create: { userId, role: "owner" },
        },
      },
      include: { members: true },
    });

    // Verify return shape
    expect(result).toEqual({
      id: "ws-1",
      name: workspaceName,
      slug: "my-test-workspace",
      role: "owner",
    });
  });

  it("should generate a valid slug from workspace name with special characters", async () => {
    const userId = "user-456";
    const workspaceName = "  Hello World! @#$  ";

    mockedPrisma.workspace.create.mockResolvedValue({
      id: "ws-2",
      name: workspaceName,
      slug: "hello-world",
      members: [{ userId, role: "owner" }],
    });

    await createWorkspace({ name: workspaceName }, userId);

    // Verify the slug was properly generated (lowercased, special chars removed, trimmed)
    expect(mockedPrisma.workspace.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: "hello-world",
        }),
      })
    );
  });
});

/**
 * **Validates: Requirements 1.3**
 * Property 2: Tenant Data Isolation
 * listWorkspaces for user A should never include workspaces where A has no membership.
 */
describe("Property 2: Tenant Data Isolation", () => {
  it("should only return workspaces where the user has membership", async () => {
    const userA = "user-a";

    mockedPrisma.workspaceMember.findMany.mockResolvedValue([
      {
        workspace: { id: "ws-1", name: "Workspace 1", slug: "workspace-1" },
        role: "owner",
      },
    ]);

    const result = await listWorkspaces(userA);

    // Verify query filters by userId
    expect(mockedPrisma.workspaceMember.findMany).toHaveBeenCalledWith({
      where: { userId: userA },
      include: {
        workspace: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    // Should only contain workspaces where user has membership
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("ws-1");
  });

  it("should return empty array when user has no memberships", async () => {
    const userB = "user-b";

    mockedPrisma.workspaceMember.findMany.mockResolvedValue([]);

    const result = await listWorkspaces(userB);

    expect(result).toEqual([]);
  });
});

/**
 * **Validates: Requirements 1.4**
 * Property 3: Role-Based Authorization Rejection
 * assertWorkspaceRole should reject users with insufficient role level.
 */
describe("Property 3: Role-Based Authorization Rejection", () => {
  it("should reject a member trying to perform an admin action", async () => {
    mockedPrisma.workspaceMember.findUnique.mockResolvedValue({
      role: "member",
    });

    await expect(
      assertWorkspaceRole("ws-1", "user-1", "admin")
    ).rejects.toThrow("Requires admin role or higher. You have: member");
  });

  it("should reject a member trying to perform an owner action", async () => {
    mockedPrisma.workspaceMember.findUnique.mockResolvedValue({
      role: "member",
    });

    await expect(
      assertWorkspaceRole("ws-1", "user-1", "owner")
    ).rejects.toThrow("Requires owner role or higher. You have: member");
  });

  it("should reject a non-member entirely", async () => {
    mockedPrisma.workspaceMember.findUnique.mockResolvedValue(null);

    await expect(
      assertWorkspaceRole("ws-1", "user-1", "member")
    ).rejects.toThrow("You are not a member of this workspace");
  });

  it("should allow an owner to pass any role check", async () => {
    mockedPrisma.workspaceMember.findUnique.mockResolvedValue({
      role: "owner",
    });

    await expect(
      assertWorkspaceRole("ws-1", "user-1", "admin")
    ).resolves.toBeUndefined();
  });
});

/**
 * **Validates: Requirements 1.5**
 * Property 4: User Workspace Visibility
 * listWorkspaces returns exactly the workspaces where the user has membership.
 */
describe("Property 4: User Workspace Visibility", () => {
  it("should return all workspaces with correct role for the user", async () => {
    const userId = "user-multi";

    mockedPrisma.workspaceMember.findMany.mockResolvedValue([
      {
        workspace: { id: "ws-1", name: "Alpha", slug: "alpha" },
        role: "owner",
      },
      {
        workspace: { id: "ws-2", name: "Beta", slug: "beta" },
        role: "member",
      },
      {
        workspace: { id: "ws-3", name: "Gamma", slug: "gamma" },
        role: "admin",
      },
    ]);

    const result = await listWorkspaces(userId);

    expect(result).toHaveLength(3);
    expect(result).toEqual([
      { id: "ws-1", name: "Alpha", slug: "alpha", role: "owner" },
      { id: "ws-2", name: "Beta", slug: "beta", role: "member" },
      { id: "ws-3", name: "Gamma", slug: "gamma", role: "admin" },
    ]);
  });
});
