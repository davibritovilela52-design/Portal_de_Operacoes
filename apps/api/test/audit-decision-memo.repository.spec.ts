import { describe, expect, it, vi } from 'vitest';

import { PrismaAuditDecisionMemoRepository } from '../src/modules/audit/audit-decision-memo.repository.js';

describe('PrismaAuditDecisionMemoRepository', () => {
  it('maps a confirmed decision memo into the Prisma create payload with aggregate linkage', async () => {
    const create = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'memo-1',
      ...data,
      createdAt: new Date('2026-05-13T18:00:00.000Z')
    }));

    const repository = new PrismaAuditDecisionMemoRepository({
      auditDecisionMemo: {
        create,
        findMany: vi.fn()
      }
    });

    const memo = {
      context: 'Two overlapping events were escalated by central operations.',
      decision: 'Keep the operational block and move utilization to the next safe slot.',
      decidedBy: 'central-1',
      alternativesConsidered: ['Cancel maintenance', 'Swap the asset allocation'],
      expectedImpact: 'Avoids unsafe overlap and preserves compliance.',
      status: 'confirmed' as const
    };

    const result = await repository.create(
      'tenant-a',
      'agenda.conflict.override',
      'agenda_event',
      'event-1',
      'asset-1',
      memo
    );

    expect(create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-a',
        action: 'agenda.conflict.override',
        aggregateType: 'agenda_event',
        aggregateId: 'event-1',
        assetId: 'asset-1',
        context: 'Two overlapping events were escalated by central operations.',
        decision: 'Keep the operational block and move utilization to the next safe slot.',
        decidedBy: 'central-1',
        alternativesConsidered: ['Cancel maintenance', 'Swap the asset allocation'],
        expectedImpact: 'Avoids unsafe overlap and preserves compliance.',
        status: 'confirmed'
      }
    });
    expect(result).toEqual({
      id: 'memo-1',
      tenantId: 'tenant-a',
      action: 'agenda.conflict.override',
      aggregateType: 'agenda_event',
      aggregateId: 'event-1',
      assetId: 'asset-1',
      context: 'Two overlapping events were escalated by central operations.',
      decision: 'Keep the operational block and move utilization to the next safe slot.',
      decidedBy: 'central-1',
      alternativesConsidered: ['Cancel maintenance', 'Swap the asset allocation'],
      expectedImpact: 'Avoids unsafe overlap and preserves compliance.',
      status: 'confirmed',
      createdAt: new Date('2026-05-13T18:00:00.000Z')
    });
  });

  it('lists persisted decision memos in tenant scope ordered by creation date', async () => {
    const findMany = vi.fn(async ({ where }: { where: Record<string, unknown> }) => [
      {
        id: 'memo-2',
        tenantId: where.tenantId,
        action: 'maintenance.asset.release',
        aggregateType: 'maintenance_ticket',
        aggregateId: 'mt-1',
        assetId: 'asset-1',
        context: 'Release was escalated after quality evidence review.',
        decision: 'Release the asset for use.',
        decidedBy: 'central-1',
        alternativesConsidered: ['Keep frozen'],
        expectedImpact: 'Avoids unnecessary idle window.',
        status: 'confirmed',
        createdAt: new Date('2026-05-14T09:30:00.000Z')
      }
    ]);

    const repository = new PrismaAuditDecisionMemoRepository({
      auditDecisionMemo: {
        create: vi.fn(),
        findMany
      }
    });

    const result = await repository.listByTenant('tenant-a');

    expect(findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-a'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    expect(result).toEqual([
      {
        id: 'memo-2',
        tenantId: 'tenant-a',
        action: 'maintenance.asset.release',
        aggregateType: 'maintenance_ticket',
        aggregateId: 'mt-1',
        assetId: 'asset-1',
        context: 'Release was escalated after quality evidence review.',
        decision: 'Release the asset for use.',
        decidedBy: 'central-1',
        alternativesConsidered: ['Keep frozen'],
        expectedImpact: 'Avoids unnecessary idle window.',
        status: 'confirmed',
        createdAt: new Date('2026-05-14T09:30:00.000Z')
      }
    ]);
  });
});
