import { describe, expect, it } from 'vitest';

import { AccessAssignmentInput } from '../src/modules/access/access-application.service.js';
import { PrismaAccessAssignmentRepository } from '../src/modules/access/access-assignment.repository.js';

describe('PrismaAccessAssignmentRepository', () => {
  const assignment: AccessAssignmentInput = {
    userId: 'central-1',
    displayName: 'Central Ops',
    email: 'central@example.com',
    role: 'central_operations',
    assetIds: [],
    mfaEnabled: true,
    lastReviewedAt: new Date('2026-05-10T00:00:00.000Z'),
    revokedAt: undefined
  };

  it('upserts, lists and revokes access assignments by tenant', async () => {
    const repository = new PrismaAccessAssignmentRepository({
      accessAssignment: {
        upsert: async ({ create }: { create: Record<string, unknown> }) => ({
          id: 'assignment-1',
          createdAt: new Date('2026-05-14T12:00:00.000Z'),
          updatedAt: new Date('2026-05-14T12:10:00.000Z'),
          ...create
        }),
        findMany: async () => [
          {
            id: 'assignment-1',
            tenantId: 'tenant-a',
            createdAt: new Date('2026-05-14T12:00:00.000Z'),
            updatedAt: new Date('2026-05-14T12:10:00.000Z'),
            ...assignment,
            revokedAt: null
          }
        ],
        findFirst: async ({ where }: { where: Record<string, unknown> }) =>
          where.id === 'assignment-1'
            ? {
                id: 'assignment-1',
                tenantId: 'tenant-a',
                createdAt: new Date('2026-05-14T12:00:00.000Z'),
                updatedAt: new Date('2026-05-14T12:10:00.000Z'),
                ...assignment,
                revokedAt: null
              }
            : null,
        update: async ({ data }: { data: Record<string, unknown> }) => ({
          id: 'assignment-1',
          tenantId: 'tenant-a',
          createdAt: new Date('2026-05-14T12:00:00.000Z'),
          updatedAt: new Date('2026-05-14T12:15:00.000Z'),
          ...assignment,
          ...data
        })
      }
    });

    await expect(repository.upsert('tenant-a', assignment)).resolves.toEqual({
      id: 'assignment-1',
          tenantId: 'tenant-a',
          createdAt: new Date('2026-05-14T12:00:00.000Z'),
          updatedAt: new Date('2026-05-14T12:10:00.000Z'),
          ...assignment,
          revokedAt: undefined
        });

    await expect(
      repository.upsert('tenant-a', { ...assignment, displayName: 'Central Operations' }, 'assignment-1')
    ).resolves.toEqual({
      id: 'assignment-1',
      tenantId: 'tenant-a',
      createdAt: new Date('2026-05-14T12:00:00.000Z'),
      updatedAt: new Date('2026-05-14T12:15:00.000Z'),
      ...assignment,
      displayName: 'Central Operations',
      revokedAt: null
    });

    await expect(repository.listByTenant('tenant-a')).resolves.toEqual([
      {
        id: 'assignment-1',
        tenantId: 'tenant-a',
        createdAt: new Date('2026-05-14T12:00:00.000Z'),
        updatedAt: new Date('2026-05-14T12:10:00.000Z'),
        ...assignment,
        revokedAt: null
      }
    ]);

    await expect(repository.findActiveByEmail('tenant-a', 'central@example.com')).resolves.toEqual([
      {
        id: 'assignment-1',
        tenantId: 'tenant-a',
        createdAt: new Date('2026-05-14T12:00:00.000Z'),
        updatedAt: new Date('2026-05-14T12:10:00.000Z'),
        ...assignment,
        revokedAt: null
      }
    ]);

    await expect(repository.findById('tenant-a', 'assignment-1')).resolves.toEqual({
      id: 'assignment-1',
      tenantId: 'tenant-a',
      createdAt: new Date('2026-05-14T12:00:00.000Z'),
      updatedAt: new Date('2026-05-14T12:10:00.000Z'),
      ...assignment,
      revokedAt: null
    });

    await expect(
      repository.revoke('tenant-a', 'assignment-1', new Date('2026-05-14T12:15:00.000Z'))
    ).resolves.toEqual({
      id: 'assignment-1',
      tenantId: 'tenant-a',
      createdAt: new Date('2026-05-14T12:00:00.000Z'),
      updatedAt: new Date('2026-05-14T12:15:00.000Z'),
      ...assignment,
      revokedAt: new Date('2026-05-14T12:15:00.000Z')
    });
  });
});
