import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../persistence/prisma.service.js';
import {
  LegacyNormalizedAgendaEvent,
  LegacyNormalizedMaintenanceTicket,
  LegacyYachtsImportAsset,
  LegacyYachtsImportRepository
} from './legacy-yachts-import.service.js';

@Injectable()
export class PrismaLegacyYachtsImportRepository implements LegacyYachtsImportRepository {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: {
      assetRegistryItem: {
        findFirst(args: { where: Record<string, unknown> }): Promise<Record<string, unknown> | null>;
        upsert(args: {
          where: {
            tenantId_assetId: {
              tenantId: string;
              assetId: string;
            };
          };
          create: Record<string, unknown>;
          update: Record<string, unknown>;
        }): Promise<Record<string, unknown>>;
      };
      maintenanceTicket: {
        findFirst(args: { where: Record<string, unknown> }): Promise<Record<string, unknown> | null>;
        upsert(args: {
          where: {
            id: string;
          };
          create: Record<string, unknown>;
          update: Record<string, unknown>;
        }): Promise<Record<string, unknown>>;
      };
      agendaEvent: {
        findFirst(args: { where: Record<string, unknown> }): Promise<Record<string, unknown> | null>;
        upsert(args: {
          where: {
            id: string;
          };
          create: Record<string, unknown>;
          update: Record<string, unknown>;
        }): Promise<Record<string, unknown>>;
      };
    }
  ) {}

  async upsertAsset(
    tenantId: string,
    asset: LegacyYachtsImportAsset
  ): Promise<{
    action: 'created' | 'updated';
  }> {
    const existing = await this.prisma.assetRegistryItem.findFirst({
      where: {
        tenantId,
        assetId: asset.assetId
      }
    });

    await this.prisma.assetRegistryItem.upsert({
      where: {
        tenantId_assetId: {
          tenantId,
          assetId: asset.assetId
        }
      },
      create: {
        tenantId,
        assetId: asset.assetId,
        displayName: asset.displayName,
        legacyAssetId: asset.legacyAssetId,
        modality: asset.modality,
        timezone: asset.timezone,
        active: true
      },
      update: {
        displayName: asset.displayName,
        legacyAssetId: asset.legacyAssetId,
        modality: asset.modality,
        timezone: asset.timezone,
        active: true
      }
    });

    return {
      action: existing ? 'updated' : 'created'
    };
  }

  async upsertMaintenanceTicket(
    tenantId: string,
    ticket: LegacyNormalizedMaintenanceTicket
  ): Promise<{
    action: 'created' | 'updated';
  }> {
    const persistedId = this.buildTenantScopedId(tenantId, ticket.id);
    const existing = await this.prisma.maintenanceTicket.findFirst({
      where: {
        tenantId,
        id: persistedId
      }
    });

    await this.prisma.maintenanceTicket.upsert({
      where: {
        id: persistedId
      },
      create: {
        id: persistedId,
        tenantId,
        assetId: ticket.assetId,
        title: ticket.title,
        category: ticket.category,
        priority: ticket.priority,
        description: ticket.description,
        notes: ticket.notes ?? null,
        legacyTicketCode: ticket.legacyTicketCode,
        legacyMetadata: {
          legacyRowId: ticket.legacyRowId,
          assetDisplayName: ticket.assetDisplayName,
          maintenanceSystem: ticket.maintenanceSystem ?? null,
          thirdPartyHint: ticket.thirdPartyHint,
          criticalAttachmentReferences: ticket.criticalAttachmentReferences,
          snapshot: ticket.legacySnapshot
        },
        origin: ticket.origin,
        openedBy: ticket.openedBy,
        openedAt: ticket.openedAt,
        status: ticket.status,
        freezeCount: ticket.status === 'frozen' ? 1 : 0
      },
      update: {
        assetId: ticket.assetId,
        title: ticket.title,
        category: ticket.category,
        priority: ticket.priority,
        description: ticket.description,
        notes: ticket.notes ?? null,
        legacyTicketCode: ticket.legacyTicketCode,
        legacyMetadata: {
          legacyRowId: ticket.legacyRowId,
          assetDisplayName: ticket.assetDisplayName,
          maintenanceSystem: ticket.maintenanceSystem ?? null,
          thirdPartyHint: ticket.thirdPartyHint,
          criticalAttachmentReferences: ticket.criticalAttachmentReferences,
          snapshot: ticket.legacySnapshot
        },
        origin: ticket.origin,
        openedBy: ticket.openedBy,
        openedAt: ticket.openedAt,
        status: ticket.status,
        freezeCount: ticket.status === 'frozen' ? 1 : 0
      }
    });

    return {
      action: existing ? 'updated' : 'created'
    };
  }

  async upsertAgendaEvent(
    tenantId: string,
    event: LegacyNormalizedAgendaEvent
  ): Promise<{
    action: 'created' | 'updated';
  }> {
    const persistedId = this.buildTenantScopedId(tenantId, event.id);
    const existing = await this.prisma.agendaEvent.findFirst({
      where: {
        tenantId,
        id: persistedId
      }
    });

    await this.prisma.agendaEvent.upsert({
      where: {
        id: persistedId
      },
      create: {
        id: persistedId,
        tenantId,
        assetId: event.assetId,
        type: event.type,
        title: event.title,
        description: event.notes ?? null,
        legacyMetadata: {
          legacyRowId: event.legacyRowId,
          assetDisplayName: event.assetDisplayName,
          snapshot: event.legacySnapshot
        },
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        safeMinimumBreached: event.safeMinimumBreached,
        provisional: event.provisional
      },
      update: {
        assetId: event.assetId,
        type: event.type,
        title: event.title,
        description: event.notes ?? null,
        legacyMetadata: {
          legacyRowId: event.legacyRowId,
          assetDisplayName: event.assetDisplayName,
          snapshot: event.legacySnapshot
        },
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        safeMinimumBreached: event.safeMinimumBreached,
        provisional: event.provisional
      }
    });

    return {
      action: existing ? 'updated' : 'created'
    };
  }

  private buildTenantScopedId(tenantId: string, legacyId: string): string {
    return `${tenantId}__${legacyId}`;
  }
}
