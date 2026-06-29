import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConflictError, NotFoundError } from "../../errors.js";

/**
 * Property 10: PRD Status Controls Editability
 *
 * For any PRD in "draft" status, update operations SHALL succeed;
 * for any PRD in "approved" status, update operations SHALL be rejected
 * and the PRD content SHALL remain unchanged.
 *
 * **Validates: Requirements 4.5, 4.6**
 */

// Mock the @cleriocode/db module
vi.mock("@cleriocode/db", () => {
  return {
    prisma: {
      pRD: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      featureRequest: {
        update: vi.fn(),
      },
      $transaction: vi.fn(),
    },
  };
});

import { prisma } from "@cleriocode/db";
import { updatePRD, finalizePRD, type PRDContent } from "../prd.service.js";

const mockedPrisma = vi.mocked(prisma);

const WORKSPACE_ID = "workspace-1";
const PRD_ID = "prd-1";
const FEATURE_REQUEST_ID = "fr-1";

const sampleContent: PRDContent = {
  goals: ["Build a dashboard"],
  requirements: ["Must load in under 2s"],
  acceptanceCriteria: ["Dashboard renders correctly"],
  technicalNotes: ["Use React Server Components"],
};

const updatedContent: PRDContent = {
  goals: ["Build a dashboard", "Support mobile"],
  requirements: ["Must load in under 2s", "Responsive layout"],
  acceptanceCriteria: ["Dashboard renders correctly on all viewports"],
  technicalNotes: ["Use React Server Components", "Add media queries"],
};

function makePRDRecord(status: "draft" | "approved") {
  return {
    id: PRD_ID,
    content: sampleContent,
    status,
    featureRequestId: FEATURE_REQUEST_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    featureRequest: {
      id: FEATURE_REQUEST_ID,
      project: {
        id: "project-1",
        workspaceId: WORKSPACE_ID,
      },
    },
  };
}

describe("Property 10: PRD Status Controls Editability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("updatePRD", () => {
    it("should succeed when PRD status is 'draft'", async () => {
      const draftPRD = makePRDRecord("draft");
      mockedPrisma.pRD.findUnique.mockResolvedValue(draftPRD as any);
      mockedPrisma.pRD.update.mockResolvedValue({
        id: PRD_ID,
        content: updatedContent,
        status: "draft",
        featureRequestId: FEATURE_REQUEST_ID,
        createdAt: draftPRD.createdAt,
        updatedAt: new Date(),
      } as any);

      const result = await updatePRD(PRD_ID, WORKSPACE_ID, updatedContent);

      expect(result.id).toBe(PRD_ID);
      expect(result.content).toEqual(updatedContent);
      expect(result.status).toBe("draft");
      expect(mockedPrisma.pRD.update).toHaveBeenCalledWith({
        where: { id: PRD_ID },
        data: { content: updatedContent },
      });
    });

    it("should throw ConflictError when PRD status is 'approved'", async () => {
      const approvedPRD = makePRDRecord("approved");
      mockedPrisma.pRD.findUnique.mockResolvedValue(approvedPRD as any);

      await expect(
        updatePRD(PRD_ID, WORKSPACE_ID, updatedContent)
      ).rejects.toThrow(ConflictError);

      await expect(
        updatePRD(PRD_ID, WORKSPACE_ID, updatedContent)
      ).rejects.toThrow("Cannot edit an approved PRD");

      // Ensure no update was attempted
      expect(mockedPrisma.pRD.update).not.toHaveBeenCalled();
    });

    it("should not modify approved PRD content on rejected update", async () => {
      const approvedPRD = makePRDRecord("approved");
      mockedPrisma.pRD.findUnique.mockResolvedValue(approvedPRD as any);

      try {
        await updatePRD(PRD_ID, WORKSPACE_ID, updatedContent);
      } catch {
        // Expected to throw
      }

      // Prisma update should never be called for approved PRDs
      expect(mockedPrisma.pRD.update).not.toHaveBeenCalled();
    });

    it("should throw NotFoundError when PRD does not exist", async () => {
      mockedPrisma.pRD.findUnique.mockResolvedValue(null);

      await expect(
        updatePRD(PRD_ID, WORKSPACE_ID, updatedContent)
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError when workspace does not match", async () => {
      const prd = makePRDRecord("draft");
      mockedPrisma.pRD.findUnique.mockResolvedValue(prd as any);

      await expect(
        updatePRD(PRD_ID, "different-workspace", updatedContent)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("finalizePRD", () => {
    it("should throw ConflictError when PRD is already 'approved'", async () => {
      const approvedPRD = makePRDRecord("approved");
      mockedPrisma.pRD.findUnique.mockResolvedValue(approvedPRD as any);

      await expect(finalizePRD(PRD_ID, WORKSPACE_ID)).rejects.toThrow(
        ConflictError
      );

      await expect(finalizePRD(PRD_ID, WORKSPACE_ID)).rejects.toThrow(
        "PRD is already approved"
      );

      // No transaction should be attempted
      expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
    });

    it("should succeed when PRD is in 'draft' status", async () => {
      const draftPRD = makePRDRecord("draft");
      mockedPrisma.pRD.findUnique.mockResolvedValue(draftPRD as any);
      mockedPrisma.$transaction.mockResolvedValue([{}, {}] as any);

      const result = await finalizePRD(PRD_ID, WORKSPACE_ID);

      expect(result.id).toBe(PRD_ID);
      expect(result.status).toBe("approved");
      expect(mockedPrisma.$transaction).toHaveBeenCalledWith([
        mockedPrisma.pRD.update({
          where: { id: PRD_ID },
          data: { status: "approved" },
        }),
        mockedPrisma.featureRequest.update({
          where: { id: FEATURE_REQUEST_ID },
          data: { status: "prd_ready" },
        }),
      ]);
    });

    it("after finalize, subsequent update attempts should fail", async () => {
      // First call: PRD is draft, finalize succeeds
      const draftPRD = makePRDRecord("draft");
      mockedPrisma.pRD.findUnique.mockResolvedValue(draftPRD as any);
      mockedPrisma.$transaction.mockResolvedValue([{}, {}] as any);

      await finalizePRD(PRD_ID, WORKSPACE_ID);

      // Now PRD is approved - simulate the status change
      const approvedPRD = makePRDRecord("approved");
      mockedPrisma.pRD.findUnique.mockResolvedValue(approvedPRD as any);

      // Subsequent update should fail
      await expect(
        updatePRD(PRD_ID, WORKSPACE_ID, updatedContent)
      ).rejects.toThrow(ConflictError);

      await expect(
        updatePRD(PRD_ID, WORKSPACE_ID, updatedContent)
      ).rejects.toThrow("Cannot edit an approved PRD");
    });
  });
});
