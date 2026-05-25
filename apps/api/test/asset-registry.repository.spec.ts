import { describe, expect, it } from 'vitest';

import { AssetRegistryRecord } from '../src/modules/asset-registry/asset-registry-application.service.js';
import { PrismaAssetRegistryRepository } from '../src/modules/asset-registry/asset-registry.repository.js';

describe('PrismaAssetRegistryRepository', () => {
  const asset: AssetRegistryRecord = {
    assetId: 'asset-1',
    displayName: 'MY Prime',
    modality: 'yachts' as const,
    legacyAssetId: 'legacy-y-001',
    timezone: 'America/Sao_Paulo',
    active: true
  };

  it('persists and lists structural assets by tenant', async () => {
    const repository = new PrismaAssetRegistryRepository({
      assetRegistryItem: {
        create: async ({ data }: { data: Record<string, unknown> }) => ({
          id: 'reg-1',
          createdAt: new Date('2026-05-14T12:00:00.000Z'),
          updatedAt: new Date('2026-05-14T12:00:00.000Z'),
          ...data
        }),
        findFirst: async ({ where }: { where: Record<string, unknown> }) =>
          where.assetId === 'asset-1'
            ? {
                id: 'reg-1',
                tenantId: 'tenant-a',
                createdAt: new Date('2026-05-14T12:00:00.000Z'),
                updatedAt: new Date('2026-05-14T12:00:00.000Z'),
                ...asset
              }
            : null,
        findMany: async () => [
          {
            id: 'reg-1',
            tenantId: 'tenant-a',
            createdAt: new Date('2026-05-14T12:00:00.000Z'),
            updatedAt: new Date('2026-05-14T12:00:00.000Z'),
            ...asset
          }
        ],
        update: async ({ data }: { data: Record<string, unknown> }) => ({
          id: 'reg-1',
          tenantId: 'tenant-a',
          createdAt: new Date('2026-05-14T12:00:00.000Z'),
          updatedAt: new Date('2026-05-14T12:10:00.000Z'),
          ...asset,
          ...data
        })
      }
    });

    await expect(repository.create('tenant-a', asset)).resolves.toEqual({
      id: 'reg-1',
      tenantId: 'tenant-a',
      createdAt: new Date('2026-05-14T12:00:00.000Z'),
      updatedAt: new Date('2026-05-14T12:00:00.000Z'),
      ...asset
    });

    await expect(repository.findByAssetId('tenant-a', 'asset-1')).resolves.toEqual({
      id: 'reg-1',
      tenantId: 'tenant-a',
      createdAt: new Date('2026-05-14T12:00:00.000Z'),
      updatedAt: new Date('2026-05-14T12:00:00.000Z'),
      ...asset
    });

    await expect(repository.listByTenant('tenant-a')).resolves.toEqual([
      {
        id: 'reg-1',
        tenantId: 'tenant-a',
        createdAt: new Date('2026-05-14T12:00:00.000Z'),
        updatedAt: new Date('2026-05-14T12:00:00.000Z'),
        ...asset
      }
    ]);

    await expect(
      repository.update('tenant-a', 'asset-1', {
        ...asset,
        active: false
      })
    ).resolves.toEqual({
      id: 'reg-1',
      tenantId: 'tenant-a',
      createdAt: new Date('2026-05-14T12:00:00.000Z'),
      updatedAt: new Date('2026-05-14T12:10:00.000Z'),
      ...asset,
      active: false
    });
  });
});
