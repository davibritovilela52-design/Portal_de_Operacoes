import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../persistence/prisma.service.js';
import type { AssetRegistryRecord } from './asset-registry-application.service.js';

export type PersistedAssetRegistryRecord = AssetRegistryRecord & {
  id: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type AssetRegistryWriter = {
  create(tenantId: string, asset: AssetRegistryRecord): Promise<PersistedAssetRegistryRecord>;
  findByAssetId(tenantId: string, assetId: string): Promise<PersistedAssetRegistryRecord | null>;
  listByTenant(tenantId: string): Promise<PersistedAssetRegistryRecord[]>;
  update(
    tenantId: string,
    assetId: string,
    asset: AssetRegistryRecord
  ): Promise<PersistedAssetRegistryRecord>;
};

@Injectable()
export class PrismaAssetRegistryRepository implements AssetRegistryWriter {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: {
      assetRegistryItem: {
        create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>>;
        findFirst(args: { where: Record<string, unknown> }): Promise<Record<string, unknown> | null>;
        findMany(args: {
          where: Record<string, unknown>;
          orderBy: Record<string, unknown>;
        }): Promise<Record<string, unknown>[]>;
        update(args: {
          where: Record<string, unknown>;
          data: Record<string, unknown>;
        }): Promise<Record<string, unknown>>;
      };
    }
  ) {}

  async create(
    tenantId: string,
    asset: AssetRegistryRecord
  ): Promise<PersistedAssetRegistryRecord> {
    const created = await this.prisma.assetRegistryItem.create({
      data: {
        tenantId,
        assetId: asset.assetId,
        displayName: asset.displayName,
        modality: asset.modality,
        legacyAssetId: asset.legacyAssetId,
        timezone: asset.timezone,
        active: asset.active
      }
    });

    return created as PersistedAssetRegistryRecord;
  }

  async findByAssetId(
    tenantId: string,
    assetId: string
  ): Promise<PersistedAssetRegistryRecord | null> {
    const found = await this.prisma.assetRegistryItem.findFirst({
      where: {
        tenantId,
        assetId
      }
    });

    return (found as PersistedAssetRegistryRecord | null) ?? null;
  }

  async listByTenant(tenantId: string): Promise<PersistedAssetRegistryRecord[]> {
    const found = await this.prisma.assetRegistryItem.findMany({
      where: {
        tenantId
      },
      orderBy: {
        displayName: 'asc'
      }
    });

    return found as PersistedAssetRegistryRecord[];
  }

  async update(
    tenantId: string,
    assetId: string,
    asset: AssetRegistryRecord
  ): Promise<PersistedAssetRegistryRecord> {
    const updated = await this.prisma.assetRegistryItem.update({
      where: {
        tenantId_assetId: {
          tenantId,
          assetId
        }
      },
      data: {
        displayName: asset.displayName,
        modality: asset.modality,
        legacyAssetId: asset.legacyAssetId,
        timezone: asset.timezone,
        active: asset.active
      }
    });

    return updated as PersistedAssetRegistryRecord;
  }
}
