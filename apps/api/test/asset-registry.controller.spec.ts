import { describe, expect, it } from 'vitest';

import {
  AssetRegistryApplicationService,
  CreateAssetCommand,
  ListAssetsCommand,
  UpdateAssetCommand
} from '../src/modules/asset-registry/asset-registry-application.service.js';
import { AssetRegistryController } from '../src/modules/asset-registry/asset-registry.controller.js';

describe('AssetRegistryController', () => {
  const portalSessionService = {
    resolveActor: (actor: unknown) => actor
  };
  const controller = new AssetRegistryController({
    getCatalog: () => ({
      modalities: ['yachts']
    }),
    createAsset: async (request: CreateAssetCommand) => request,
    listAssets: async (request: ListAssetsCommand) => request,
    updateAsset: async (request: UpdateAssetCommand) => request
  } as unknown as AssetRegistryApplicationService, portalSessionService as any);

  it('returns the asset registry catalog', () => {
    expect(controller.getCatalog()).toEqual({
      modalities: ['yachts']
    });
  });

  it('delegates create asset requests to the application service', async () => {
    const request = {
      actor: {
        userId: 'admin-1',
        tenantId: 'tenant-a',
        role: 'portal_admin' as const,
        assetIds: []
      },
      tenantId: 'tenant-a',
      input: {
        assetId: 'asset-1',
        displayName: 'MY Prime',
        modality: 'yachts' as const,
        legacyAssetId: 'legacy-y-001',
        timezone: 'America/Sao_Paulo',
        active: true
      }
    };

    await expect(controller.createAsset(undefined, request)).resolves.toStrictEqual(request);
  });

  it('delegates list asset requests to the application service', async () => {
    const request = {
      actor: {
        userId: 'central-1',
        tenantId: 'tenant-a',
        role: 'central_operations' as const,
        assetIds: []
      },
      tenantId: 'tenant-a',
      filters: {
        modality: 'yachts' as const
      }
    };

    await expect(controller.listAssets(undefined, request)).resolves.toStrictEqual(request);
  });

  it('delegates update asset requests to the application service', async () => {
    const request = {
      actor: {
        userId: 'admin-1',
        tenantId: 'tenant-a',
        role: 'portal_admin' as const,
        assetIds: []
      },
      tenantId: 'tenant-a',
      assetId: 'asset-1',
      input: {
        displayName: 'MY Prime Updated',
        active: false
      }
    };

    await expect(controller.updateAsset(request.assetId, undefined, request)).resolves.toStrictEqual(request);
  });
});
