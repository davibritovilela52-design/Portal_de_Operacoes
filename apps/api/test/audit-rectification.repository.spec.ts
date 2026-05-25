import { describe, expect, it, vi } from 'vitest';

import { PrismaAuditRectificationRepository } from '../src/modules/audit/audit-rectification.repository.js';

describe('PrismaAuditRectificationRepository', () => {
  it('maps a rectification into the Prisma create payload with tenant scope', async () => {
    const create = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'rect-1',
      ...data,
      createdAt: new Date('2026-05-13T16:01:00.000Z')
    }));

    const repository = new PrismaAuditRectificationRepository({
      auditRectification: {
        create,
        findMany: vi.fn()
      }
    });

    const rectification = {
      recordId: 'maintenance-1',
      sourceVersion: 3,
      targetVersion: 4,
      changedBy: 'central-1',
      reason: 'Correct invoice reference.',
      afterSnapshot: {
        supplierInvoiceNumber: 'INV-055'
      }
    };

    const result = await repository.create('tenant-a', rectification);

    expect(create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-a',
        recordId: 'maintenance-1',
        sourceVersion: 3,
        targetVersion: 4,
        changedBy: 'central-1',
        reason: 'Correct invoice reference.',
        afterSnapshot: {
          supplierInvoiceNumber: 'INV-055'
        }
      }
    });
    expect(result).toEqual({
      id: 'rect-1',
      tenantId: 'tenant-a',
      recordId: 'maintenance-1',
      sourceVersion: 3,
      targetVersion: 4,
      changedBy: 'central-1',
      reason: 'Correct invoice reference.',
      afterSnapshot: {
        supplierInvoiceNumber: 'INV-055'
      },
      createdAt: new Date('2026-05-13T16:01:00.000Z')
    });
  });

  it('lists persisted rectifications in tenant scope ordered by creation date', async () => {
    const findMany = vi.fn(async ({ where }: { where: Record<string, unknown> }) => [
      {
        id: 'rect-2',
        tenantId: where.tenantId,
        recordId: 'maintenance-9',
        sourceVersion: 1,
        targetVersion: 2,
        changedBy: 'central-1',
        reason: 'Correct supplier invoice reference.',
        afterSnapshot: {
          supplierInvoiceNumber: 'INV-999'
        },
        createdAt: new Date('2026-05-14T08:00:00.000Z')
      }
    ]);

    const repository = new PrismaAuditRectificationRepository({
      auditRectification: {
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
        id: 'rect-2',
        tenantId: 'tenant-a',
        recordId: 'maintenance-9',
        sourceVersion: 1,
        targetVersion: 2,
        changedBy: 'central-1',
        reason: 'Correct supplier invoice reference.',
        afterSnapshot: {
          supplierInvoiceNumber: 'INV-999'
        },
        createdAt: new Date('2026-05-14T08:00:00.000Z')
      }
    ]);
  });
});
