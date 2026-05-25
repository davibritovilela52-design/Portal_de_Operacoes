import { describe, expect, it } from 'vitest';

import { AccessPolicyService } from '../src/modules/access/access-policy.service.js';
import {
  AssetRegistryApplicationService,
  AssetRegistryRecord
} from '../src/modules/asset-registry/asset-registry-application.service.js';
import {
  AssetRegistryWriter,
  PersistedAssetRegistryRecord
} from '../src/modules/asset-registry/asset-registry.repository.js';
import { ObservabilityEventLogService } from '../src/modules/observability/observability-event-log.service.js';

describe('AssetRegistryApplicationService', () => {
  const actorAdmin = {
    userId: 'admin-1',
    tenantId: 'tenant-a',
    role: 'portal_admin' as const,
    assetIds: []
  };

  const actorField = {
    userId: 'field-1',
    tenantId: 'tenant-a',
    role: 'asset_field_team' as const,
    assetIds: ['asset-1']
  };

  const baseAsset: AssetRegistryRecord = {
    assetId: 'asset-1',
    displayName: 'MY Prime',
    modality: 'yachts' as const,
    legacyAssetId: 'legacy-y-001',
    timezone: 'America/Sao_Paulo',
    active: true
  };

  it('creates structural assets only for portal admin users and records an audit event', async () => {
    const events = new ObservabilityEventLogService();
    const repository = createRepository();
    const service = new AssetRegistryApplicationService(
      new AccessPolicyService(),
      repository,
      events
    );

    const result = await service.createAsset({
      actor: actorAdmin,
      tenantId: 'tenant-a',
      input: baseAsset
    });

    expect(result).toMatchObject({
      created: true,
      reason: 'CREATED',
      asset: baseAsset
    });
    expect(repository.records).toHaveLength(1);
    expect(events.listRecentEvents()).toEqual([
      expect.objectContaining({
        domain: 'asset_registry',
        action: 'asset_create',
        entityId: 'asset-1',
        outcome: 'success'
      })
    ]);
  });

  it('denies asset creation for non-admin users', async () => {
    const repository = createRepository();
    const service = new AssetRegistryApplicationService(
      new AccessPolicyService(),
      repository,
      new ObservabilityEventLogService()
    );

    await expect(
      service.createAsset({
        actor: actorField,
        tenantId: 'tenant-a',
        input: baseAsset
      })
    ).resolves.toEqual({
      created: false,
      reason: 'FORBIDDEN',
      accessReason: 'ROLE_NOT_ALLOWED'
    });
  });

  it('returns only scoped assets for field teams and all tenant assets for central roles', async () => {
    const repository = createRepository([
      {
        ...baseAsset,
        id: 'reg-1',
        tenantId: 'tenant-a',
        createdAt: new Date('2026-05-14T12:00:00.000Z'),
        updatedAt: new Date('2026-05-14T12:00:00.000Z')
      },
      {
        ...baseAsset,
        id: 'reg-2',
        assetId: 'asset-2',
        displayName: 'MY Ocean',
        tenantId: 'tenant-a',
        createdAt: new Date('2026-05-14T12:05:00.000Z'),
        updatedAt: new Date('2026-05-14T12:05:00.000Z')
      }
    ]);
    const service = new AssetRegistryApplicationService(
      new AccessPolicyService(),
      repository,
      new ObservabilityEventLogService()
    );

    await expect(
      service.listAssets({
        actor: actorField,
        tenantId: 'tenant-a'
      })
    ).resolves.toEqual({
      assets: [
        expect.objectContaining({
          assetId: 'asset-1'
        })
      ]
    });

    await expect(
      service.listAssets({
        actor: {
          userId: 'central-1',
          tenantId: 'tenant-a',
          role: 'central_operations',
          assetIds: []
        },
        tenantId: 'tenant-a'
      })
    ).resolves.toEqual({
      assets: [
        expect.objectContaining({
          assetId: 'asset-1'
        }),
        expect.objectContaining({
          assetId: 'asset-2'
        })
      ]
    });
  });
});

function createRepository(records: PersistedAssetRegistryRecord[] = []) {
  const state = [...records];

  return {
    records: state,
    async create(
      tenantId: string,
      asset: AssetRegistryRecord
    ): Promise<PersistedAssetRegistryRecord> {
      const persisted: PersistedAssetRegistryRecord = {
        id: `reg-${state.length + 1}`,
        tenantId,
        createdAt: new Date('2026-05-14T12:00:00.000Z'),
        updatedAt: new Date('2026-05-14T12:00:00.000Z'),
        ...asset
      };
      state.push(persisted);

      return persisted;
    },
    async findByAssetId(
      tenantId: string,
      assetId: string
    ): Promise<PersistedAssetRegistryRecord | null> {
      return (
        state.find((record) => record.tenantId === tenantId && record.assetId === assetId) ?? null
      );
    },
    async listByTenant(tenantId: string): Promise<PersistedAssetRegistryRecord[]> {
      return state.filter((record) => record.tenantId === tenantId);
    },
    async update(
      tenantId: string,
      assetId: string,
      asset: AssetRegistryRecord
    ): Promise<PersistedAssetRegistryRecord> {
      const index = state.findIndex(
        (record) => record.tenantId === tenantId && record.assetId === assetId
      );

      if (index === -1) {
        throw new Error('not found');
      }

      const updated: PersistedAssetRegistryRecord = {
        ...state[index],
        ...asset,
        updatedAt: new Date('2026-05-14T12:10:00.000Z')
      };
      state[index] = updated;

      return updated;
    }
  } satisfies AssetRegistryWriter & { records: Array<Record<string, unknown>> };
}
