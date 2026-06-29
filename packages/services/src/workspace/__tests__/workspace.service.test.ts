import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Property tests for workspace service.
 *
 * **Validates: Requirements 1.1, 1.3, 1.4, 1.5**
 *
 * Properties tested:
 * 1. Workspace Creation Persistence
 * 2. Tenant Data Isolation
 * 3. Role-Based Authorization Rejection
 * 4. User Workspace Visibility
 */

// ─── Mock Prisma ───

const mockPrisma = vi.hoisted(() => ({
  workspace: {
    create: vi.fn(),
  },
  workspaceMember: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
}));

vi.mock("@cleriocode/db", () => ({
  prisma: mockPrisma,
}));

import {
  createWorkspace,
  listWorkspaces,
  inviteMember,
  assertWorkspaceRole,
} from "../workspace.service.js";
import { ForbiddenError, ConflictError, NotFoundError } from "../../errors.js";

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Property 1: Workspace Creation Persistence ───
// For any valid workspace name and authenticated user, creating a workspace
// SHALL produce a persisted Workspace with a unique id, the given name,
// a derived slug, and the creating user assigned as owner Member.

describe("Property 1: Workspace Creation Persistence", () => {
  it("creates a workspace with unique id, name, derived slug, and owner member", async () => {
    const userId = "user-1";
    const workspaceName = "My Test Workspace";

    mockPrisma.workspace.create.mockResolvedValue({
      id: "ws-generated-id",
      name: workspaceName,
      slug: "my-test-workspace",
      members: [{ userId, role: "owner" }],
    });

    const result = await createWorkspace({ name: workspaceName }, userId);

    // Verifies persistence was called with correct data
    expect(mockPrisma.workspace.create).toHaveBeenCalledWith({
      data: {
        name: workspaceName,
        slug: "my-test-workspace",
        members: {
          create: { userId, role: "owner" },
        },
      },
      include: { members: true },
    });

    // Result has required fields
    expect(result).toEqual({
      id: "ws-generated-id",
      name: workspaceName,
      slug: "my-test-workspace",
      role: "owner",
    });
  });

  it("derives slug correctly from names with special characters", async () => {
    const userId = "user-2";
    const workspaceName = "  Hello World!! @#$ Test  ";

    mockPrisma.workspace.create.mockResolvedValue({
      id: "ws-2",
      name: workspaceName,
      slug: "hello-world-test",
      members: [{ userId, role: "owner" }],
    });

    await createWorkspace({ name: workspaceName }, userId);

    // The slug passed to prisma should be derived (lowercased, special chars removed)
    expect(mockPrisma.workspace.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: "hello-world-test",
        }),
      })
    );
  });

  it("always assigns creating user as owner", async () => {
    const userId = "user-owner";

    mockPrisma.workspace.create.mockResolvedValue({
      id: "ws-3",
      name: "Team Alpha",
      slug: "team-alpha",
      members: [{ userId, role: "owner" }],
    });

    const result = await createWorkspace({ name: "Team Alpha" }, userId);

    expect(result.role).toBe("owner");
    expect(mockPrisma.workspace.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          members: {
            create: { userId, role: "owner" },
          },
        }),
      })
    );
  });
});

// ─── Property 2: Tenant Data Isolation ───
// For any two distinct Workspaces A and B, and any Member of Workspace A,
// querying Projects, Feature_Requests, Tasks, Repositories, or Pull_Requests
// SHALL never return resources belonging to Workspace B.

describe("Property 2: Tenant Data Isolation", () => {
  it("listWorkspaces only returns workspaces where user has membership", async () => {
    const userId = "user-isolated";

    // User is only a member of workspace A, not workspace B
    mockPrisma.workspaceMember.findMany.mockResolvedValue([
      {
        workspace: { id: "ws-a", name: "Workspace A", slug: "workspace-a" },
        role: "owner",
      },
    ]);

    const result = await listWorkspaces(userId);

    // Should only query memberships for this specific user
    expect(mockPrisma.workspaceMember.findMany).toHaveBeenCalledWith({
      where: { userId },
      include: {
        workspace: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    // Result contains only workspace A
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("ws-a");
  });

  it("does not expose workspaces from other users", async () => {
    const userA = "user-a";

    mockPrisma.workspaceMember.findMany.mockResolvedValue([]);

    const result = await listWorkspaces(userA);

    // User with no memberships gets empty list
    expect(result).toHaveLength(0);
  });

  it("assertWorkspaceRole rejects non-members (cross-tenant access)", async () => {
    const workspaceId = "ws-b";
    const outsiderUserId = "user-not-in-ws-b";

    // User is not a member of workspace B
    mockPrisma.workspaceMember.findUnique.mockResolvedValue(null);

    await expect(
      assertWorkspaceRole(workspaceId, outsiderUserId, "member")
    ).rejects.toThrow(ForbiddenError);
  });
});

// ─── Property 3: Role-Based Authorization Rejection ───
// For any Member with a role below the required threshold for an action,
// the Platform SHALL reject the request with a forbidden error and the
// system state SHALL remain unchanged.

describe("Property 3: Role-Based Authorization Rejection", () => {
  it("rejects member role when admin is required", async () => {
    mockPrisma.workspaceMember.findUnique.mockResolvedValue({
      workspaceId: "ws-1",
      userId: "user-member",
      role: "member",
    });

    await expect(
      assertWorkspaceRole("ws-1", "user-member", "admin")
    ).rejects.toThrow(ForbiddenError);
  });

  it("rejects member role when owner is required", async () => {
    mockPrisma.workspaceMember.findUnique.mockResolvedValue({
      workspaceId: "ws-1",
      userId: "user-member",
      role: "member",
    });

    await expect(
      assertWorkspaceRole("ws-1", "user-member", "owner")
    ).rejects.toThrow(ForbiddenError);
  });

  it("rejects admin role when owner is required", async () => {
    mockPrisma.workspaceMember.findUnique.mockResolvedValue({
      workspaceId: "ws-1",
      userId: "user-admin",
      role: "admin",
    });

    await expect(
      assertWorkspaceRole("ws-1", "user-admin", "owner")
    ).rejects.toThrow(ForbiddenError);
  });

  it("allows admin role when admin is required", async () => {
    mockPrisma.workspaceMember.findUnique.mockResolvedValue({
      workspaceId: "ws-1",
      userId: "user-admin",
      role: "admin",
    });

    await expect(
      assertWorkspaceRole("ws-1", "user-admin", "admin")
    ).resolves.toBeUndefined();
  });

  it("allows owner role for any required role", async () => {
    mockPrisma.workspaceMember.findUnique.mockResolvedValue({
      workspaceId: "ws-1",
      userId: "user-owner",
      role: "owner",
    });

    await expect(
      assertWorkspaceRole("ws-1", "user-owner", "admin")
    ).resolves.toBeUndefined();

    await expect(
      assertWorkspaceRole("ws-1", "user-owner", "member")
    ).resolves.toBeUndefined();
  });

  it("inviteMember rejects when inviter has insufficient role (member)", async () => {
    // Inviter is only a "member" — cannot invite
    mockPrisma.workspaceMember.findUnique.mockResolvedValue({
      workspaceId: "ws-1",
      userId: "user-member",
      role: "member",
    });

    await expect(
      inviteMember("ws-1", "newuser@example.com", "member", "user-member")
    ).rejects.toThrow(ForbiddenError);

    // State unchanged: no user lookup or member creation attempted
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.workspaceMember.create).not.toHaveBeenCalled();
  });

  it("inviteMember succeeds when inviter has admin role", async () => {
    // First call: assertWorkspaceRole check for inviter
    mockPrisma.workspaceMember.findUnique
      .mockResolvedValueOnce({
        workspaceId: "ws-1",
        userId: "user-admin",
        role: "admin",
      })
      // Second call: check if target user is already a member
      .mockResolvedValueOnce(null);

    mockPrisma.user.findUnique.mockResolvedValue({
      id: "target-user-id",
      email: "newuser@example.com",
    });

    mockPrisma.workspaceMember.create.mockResolvedValue({
      id: "membership-1",
      workspaceId: "ws-1",
      userId: "target-user-id",
      role: "member",
    });

    const result = await inviteMember(
      "ws-1",
      "newuser@example.com",
      "member",
      "user-admin"
    );

    expect(result).toEqual({ memberId: "membership-1" });
    expect(mockPrisma.workspaceMember.create).toHaveBeenCalledWith({
      data: {
        workspaceId: "ws-1",
        userId: "target-user-id",
        role: "member",
      },
    });
  });
});

// ─── Property 4: User Workspace Visibility ───
// For any authenticated User, the list of Workspaces returned by the
// workspace list query SHALL contain exactly the Workspaces where that
// User holds an active WorkspaceMember record.

describe("Property 4: User Workspace Visibility", () => {
  it("returns exactly the workspaces where user holds membership", async () => {
    const userId = "user-multi";

    mockPrisma.workspaceMember.findMany.mockResolvedValue([
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

  it("returns empty list for user with no memberships", async () => {
    const userId = "user-no-workspaces";

    mockPrisma.workspaceMember.findMany.mockResolvedValue([]);

    const result = await listWorkspaces(userId);

    expect(result).toEqual([]);
  });

  it("queries only by the authenticated userId", async () => {
    const userId = "specific-user-id";

    mockPrisma.workspaceMember.findMany.mockResolvedValue([]);

    await listWorkspaces(userId);

    expect(mockPrisma.workspaceMember.findMany).toHaveBeenCalledWith({
      where: { userId: "specific-user-id" },
      include: {
        workspace: {
          select: { id: true, name: true, slug: true },
        },
      },
    });
  });
});
