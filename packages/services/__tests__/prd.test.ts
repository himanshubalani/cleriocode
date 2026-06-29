import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictError } from '../src/errors';

vi.mock('@cleriocode/db', () => ({
  prisma: {
    pRD: { findUnique: vi.fn(), update: vi.fn() },
    featureRequest: { update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { prisma } from '@cleriocode/db';
import { updatePRD, finalizePRD } from '../src/prd/prd.service';

const mockedPrisma = prisma as unknown as {
  pRD: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  featureRequest: { update: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

/**
 * Property 10: PRD Status Controls Editability
 * - For any PRD in "draft" status, update operations SHALL succeed
 * - For any PRD in "approved" status, update operations SHALL be rejected and content remains unchanged
 *
 * **Validates: Requirements 4.5, 4.6**
 */
describe('Property 10: PRD Status Controls Editability', () => {
  const workspaceId = 'ws-1';
  const prdId = 'prd-1';
  const content = {
    goals: ['Build feature X'],
    requirements: ['Must handle Y'],
    acceptanceCriteria: ['When Z happens, then W'],
    technicalNotes: ['Use library Q'],
  };

  const basePRD = {
    id: prdId,
    featureRequestId: 'fr-1',
    content: { goals: ['Old goal'], requirements: [], acceptanceCriteria: [], technicalNotes: [] },
    createdAt: new Date(),
    updatedAt: new Date(),
    featureRequest: {
      id: 'fr-1',
      project: { id: 'proj-1', workspaceId },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updatePRD succeeds when PRD status is "draft" — returns updated content', async () => {
    const draftPRD = { ...basePRD, status: 'draft' };
    mockedPrisma.pRD.findUnique.mockResolvedValue(draftPRD);

    const updatedRecord = {
      id: prdId,
      content,
      status: 'draft',
      featureRequestId: 'fr-1',
      createdAt: draftPRD.createdAt,
      updatedAt: new Date(),
    };
    mockedPrisma.pRD.update.mockResolvedValue(updatedRecord);

    const result = await updatePRD(prdId, workspaceId, content);

    expect(result.id).toBe(prdId);
    expect(result.content).toEqual(content);
    expect(result.status).toBe('draft');
    expect(mockedPrisma.pRD.update).toHaveBeenCalledWith({
      where: { id: prdId },
      data: { content },
    });
  });

  it('updatePRD throws ConflictError when PRD status is "approved"', async () => {
    const approvedPRD = { ...basePRD, status: 'approved' };
    mockedPrisma.pRD.findUnique.mockResolvedValue(approvedPRD);

    await expect(updatePRD(prdId, workspaceId, content)).rejects.toThrow(ConflictError);
    await expect(updatePRD(prdId, workspaceId, content)).rejects.toThrow('Cannot edit an approved PRD');
    expect(mockedPrisma.pRD.update).not.toHaveBeenCalled();
  });

  it('finalizePRD transitions status from "draft" to "approved"', async () => {
    const draftPRD = { ...basePRD, status: 'draft' };
    mockedPrisma.pRD.findUnique.mockResolvedValue(draftPRD);
    mockedPrisma.$transaction.mockResolvedValue(undefined);

    const result = await finalizePRD(prdId, workspaceId);

    expect(result.id).toBe(prdId);
    expect(result.status).toBe('approved');
    expect(mockedPrisma.$transaction).toHaveBeenCalledWith([
      expect.anything(), // prisma.pRD.update
      expect.anything(), // prisma.featureRequest.update
    ]);
  });

  it('finalizePRD throws ConflictError when status is already "approved"', async () => {
    const approvedPRD = { ...basePRD, status: 'approved' };
    mockedPrisma.pRD.findUnique.mockResolvedValue(approvedPRD);

    await expect(finalizePRD(prdId, workspaceId)).rejects.toThrow(ConflictError);
    await expect(finalizePRD(prdId, workspaceId)).rejects.toThrow('PRD is already approved');
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
  });
});
