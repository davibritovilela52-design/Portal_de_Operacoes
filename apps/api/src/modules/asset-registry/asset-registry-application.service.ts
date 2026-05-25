import { Inject, Injectable, Optional } from '@nestjs/common';

import {
  AccessActor,
  AccessDecisionReason,
  AccessPolicyService
} from '../access/access-policy.service.js';
import { ObservabilityEventLogService } from '../observability/observability-event-log.service.js';
import {
  AssetRegistryWriter,
  PersistedAssetRegistryRecord,
  PrismaAssetRegistryRepository
} from './asset-registry.repository.js';

export type AssetModality = 'yachts' | 'aviation' | 'real_estate' | 'cars';

export type AssetRegistryRecord = {
  assetId: string;
  displayName: string;
  modality: AssetModality;
  legacyAssetId?: string;
  timezone: string;
  active: boolean;
};

export type CreateAssetCommand = {
  actor: AccessActor;
  tenantId: string;
  input: AssetRegistryRecord;
};

export type CreateAssetCommandResult =
  | {
      created: true;
      reason: 'CREATED';
      asset: PersistedAssetRegistryRecord;
    }
  | {
      created: false;
      reason: 'FORBIDDEN';
      accessReason: AccessDecisionReason;
    }
  | {
      created: false;
      reason: 'DUPLICATE_ASSET_ID';
    };

export type ListAssetsCommand = {
  actor: AccessActor;
  tenantId: string;
  filters?: {
    modality?: AssetModality;
    active?: boolean;
  };
};

export type ListAssetsCommandResult =
  | {
      assets: PersistedAssetRegistryRecord[];
    }
  | {
      assets: [];
      reason: 'FORBIDDEN';
    };

export type UpdateAssetCommand = {
  actor: AccessActor;
  tenantId: string;
  assetId: string;
  input: Partial<Omit<AssetRegistryRecord, 'assetId'>>;
};

export type UpdateAssetCommandResult =
  | {
      updated: true;
      reason: 'UPDATED';
      asset: PersistedAssetRegistryRecord;
    }
  | {
      updated: false;
      reason: 'FORBIDDEN';
      accessReason: AccessDecisionReason;
    }
  | {
      updated: false;
      reason: 'NOT_FOUND';
    };

const assetModalities: AssetModality[] = ['yachts', 'aviation', 'real_estate', 'cars'];

@Injectable()
export class AssetRegistryApplicationService {
  constructor(
    private readonly accessPolicyService: AccessPolicyService,
    @Inject(PrismaAssetRegistryRepository)
    private readonly assetRegistryRepository: AssetRegistryWriter,
    @Optional()
    private readonly observabilityEventLogService?: ObservabilityEventLogService
  ) {}

  getCatalog(): {
    modalities: AssetModality[];
  } {
    return {
      modalities: [...assetModalities]
    };
  }

  async createAsset(command: CreateAssetCommand): Promise<CreateAssetCommandResult> {
    const accessDecision = this.accessPolicyService.authorize({
      actor: command.actor,
      action: 'structural_registry.manage',
      subject: {
        tenantId: command.tenantId
      }
    });

    if (!accessDecision.allowed) {
      return {
        created: false,
        reason: 'FORBIDDEN',
        accessReason: accessDecision.reason
      };
    }

    const existingAsset = await this.assetRegistryRepository.findByAssetId(
      command.tenantId,
      command.input.assetId
    );

    if (existingAsset) {
      return {
        created: false,
        reason: 'DUPLICATE_ASSET_ID'
      };
    }

    const asset = await this.assetRegistryRepository.create(command.tenantId, command.input);
    this.observabilityEventLogService?.record({
      domain: 'asset_registry',
      action: 'asset_create',
      entityId: asset.assetId,
      outcome: 'success',
      metadata: {
        tenantId: command.tenantId,
        modality: asset.modality
      }
    });

    return {
      created: true,
      reason: 'CREATED',
      asset
    };
  }

  async listAssets(command: ListAssetsCommand): Promise<ListAssetsCommandResult> {
    if (command.actor.tenantId !== command.tenantId) {
      return {
        assets: [],
        reason: 'FORBIDDEN'
      };
    }

    const assets = await this.assetRegistryRepository.listByTenant(command.tenantId);
    const scopedAssets =
      command.actor.role === 'asset_field_team'
        ? assets.filter((asset) => command.actor.assetIds.includes(asset.assetId))
        : assets;

    return {
      assets: scopedAssets.filter((asset) => {
        if (command.filters?.modality && asset.modality !== command.filters.modality) {
          return false;
        }

        if (typeof command.filters?.active === 'boolean' && asset.active !== command.filters.active) {
          return false;
        }

        return true;
      })
    };
  }

  async updateAsset(command: UpdateAssetCommand): Promise<UpdateAssetCommandResult> {
    const accessDecision = this.accessPolicyService.authorize({
      actor: command.actor,
      action: 'structural_registry.manage',
      subject: {
        tenantId: command.tenantId
      }
    });

    if (!accessDecision.allowed) {
      return {
        updated: false,
        reason: 'FORBIDDEN',
        accessReason: accessDecision.reason
      };
    }

    const currentAsset = await this.assetRegistryRepository.findByAssetId(
      command.tenantId,
      command.assetId
    );

    if (!currentAsset) {
      return {
        updated: false,
        reason: 'NOT_FOUND'
      };
    }

    const updated = await this.assetRegistryRepository.update(command.tenantId, command.assetId, {
      assetId: currentAsset.assetId,
      displayName: command.input.displayName ?? currentAsset.displayName,
      modality: command.input.modality ?? currentAsset.modality,
      legacyAssetId: command.input.legacyAssetId ?? currentAsset.legacyAssetId ?? undefined,
      timezone: command.input.timezone ?? currentAsset.timezone,
      active: command.input.active ?? currentAsset.active
    });

    this.observabilityEventLogService?.record({
      domain: 'asset_registry',
      action: 'asset_update',
      entityId: updated.assetId,
      outcome: 'success',
      metadata: {
        tenantId: command.tenantId
      }
    });

    return {
      updated: true,
      reason: 'UPDATED',
      asset: updated
    };
  }
}
