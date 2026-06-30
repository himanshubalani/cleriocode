import { prisma } from "@cleriocode/db";
import { ForbiddenError, NotFoundError, ConflictError } from "../errors.js";

// ─── Helpers ───

/**
 * Converts a workspace name into a URL-safe slug.
 * Lowercases, replaces spaces/special chars with hyphens, removes duplicates and trailing hyphens.
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Role hierarchy: owner > admin > member.
 * Returns a numeric level for comparison.
 */
const ROLE_LEVELS: Record<string, number> = {
  owner: 3,
  admin: 2,
  member: 1,
};

function getRoleLevel(role: string): number {
  return ROLE_LEVELS[role] ?? 0;
}

// ─── Authorization ───

/**
 * Asserts that a user has at least the required role level in a workspace.
 * Throws ForbiddenError if the user doesn't have sufficient permissions.
 * Throws NotFoundError if the user is not a member of the workspace.
 */
export async function assertWorkspaceRole(
  workspaceId: string,
  userId: string,
  requiredRole: "owner" | "admin" | "member"
): Promise<void> {
  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId },
    },
  });

  if (!member) {
    throw new ForbiddenError("You are not a member of this workspace");
  }

  if (getRoleLevel(member.role) < getRoleLevel(requiredRole)) {
    throw new ForbiddenError(
      `Requires ${requiredRole} role or higher. You have: ${member.role}`
    );
  }
}

// ─── Workspace CRUD ───

/**
 * Creates a new workspace and assigns the creating user as the owner member.
 * Requirements: 1.1
 */
export async function createWorkspace(
  input: { name: string },
  userId: string
) {
  const workspace = await prisma.workspace.create({
    data: {
      name: input.name,
      slug: slugify(input.name),
      members: {
        create: { userId, role: "owner" },
      },
    },
    include: { members: true },
  });

  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    role: "owner" as const,
  };
}

/**
 * Lists all workspaces where the user has active membership (tenant isolation).
 * Requirements: 1.3, 1.5
 */
export async function listWorkspaces(userId: string) {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  return memberships.map((m) => ({
    id: m.workspace.id,
    name: m.workspace.name,
    slug: m.workspace.slug,
    role: m.role,
  }));
}

/**
 * Invites a user to a workspace by email.
 * Validates that the inviter has admin or owner role.
 * Throws NotFoundError if the target user doesn't exist.
 * Throws ConflictError if the user is already a member.
 * Requirements: 1.2, 1.4
 */
export async function inviteMember(
  workspaceId: string,
  email: string,
  role: "admin" | "member",
  inviterUserId: string
) {
  // Validate inviter has admin or owner role
  await assertWorkspaceRole(workspaceId, inviterUserId, "admin");

  // Find the user being invited by email
  const targetUser = await prisma.user.findUnique({
    where: { email },
  });

  if (!targetUser) {
    throw new NotFoundError("User", email);
  }

  // Check if user is already a member
  const existingMember = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId: targetUser.id },
    },
  });

  if (existingMember) {
    throw new ConflictError(
      `User ${email} is already a member of this workspace`
    );
  }

  // Create the membership
  const membership = await prisma.workspaceMember.create({
    data: {
      workspaceId,
      userId: targetUser.id,
      role,
    },
  });

  return { memberId: membership.id };
}
