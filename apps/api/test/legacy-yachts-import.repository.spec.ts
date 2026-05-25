import { describe, expect, it } from 'vitest';

import {
  LegacyNormalizedAgendaEvent,
  LegacyNormalizedMaintenanceTicket
} from '../src/modules/cutover/legacy-yachts-import.service.js';
import { PrismaLegacyYachtsImportRepository } from '../src/modules/cutover/legacy-yachts-import.repository.js';

describe('PrismaLegacyYachtsImportRepository', () => {
  it('upserts structural assets by deterministic assetId', async () => {
    const repository = new PrismaLegacyYachtsImportRepository(createPrismaDouble());

    await expect(
      repository.upsertAsset('prime-you', {
        assetId: 'yacht-alcazar',
        displayName: 'Alcazar',
        legacyAssetId: 'Alcazar',
        modality: 'yachts',
        timezone: 'America/Sao_Paulo'
      })
    ).resolves.toEqual({
      action: 'created'
    });

    await expect(
      repository.upsertAsset('prime-you', {
        assetId: 'yacht-alcazar',
        displayName: 'Alcazar',
        legacyAssetId: 'Alcazar',
        modality: 'yachts',
        timezone: 'America/Sao_Paulo'
      })
    ).resolves.toEqual({
      action: 'updated'
    });
  });

  it('upserts maintenance tickets by deterministic legacy id while preserving migration metadata', async () => {
    const prisma = createPrismaDouble();
    const repository = new PrismaLegacyYachtsImportRepository(prisma);
    const ticket: LegacyNormalizedMaintenanceTicket = {
      id: 'legacy-maintenance-4',
      legacyRowId: '4',
      legacyTicketCode: 'M-4',
      assetId: 'yacht-alcazar',
      assetDisplayName: 'Alcazar',
      category: 'corrective',
      priority: 'P3',
      status: 'completed',
      maintenanceSystem: 'electrical',
      origin: 'asset_field_team',
      openedBy: 'alcazar@primeyou.com.br',
      openedAt: new Date('2025-06-05T09:51:03.000Z'),
      title: 'Revisão guincho',
      description:
        'Conforme orientado pelo Sr. Vittorio, há necessidade de uma revisão geral do guincho de proa, para a subida em agosto',
      notes: 'guincho substituido pelo um novo',
      thirdPartyHint: true,
      legacySnapshot: {
        sistema: 'Elétrica',
        atribuido: 'Fornecedores'
      },
      criticalAttachmentReferences: ['https://storage.googleapis.com/example.jpg']
    };

    await expect(repository.upsertMaintenanceTicket('prime-you', ticket)).resolves.toEqual({
      action: 'created'
    });
    expect(prisma.__tickets.get('prime-you:prime-you__legacy-maintenance-4')).toEqual(
      expect.objectContaining({
        title: expect.stringContaining('guincho'),
        notes: 'guincho substituido pelo um novo',
        legacyTicketCode: 'M-4',
        legacyMetadata: expect.objectContaining({
          legacyRowId: '4',
          assetDisplayName: 'Alcazar',
          maintenanceSystem: 'electrical',
          thirdPartyHint: true,
          criticalAttachmentReferences: ['https://storage.googleapis.com/example.jpg'],
          snapshot: expect.objectContaining({
            atribuido: 'Fornecedores',
            sistema: expect.any(String)
          })
        })
      })
    );
    await expect(repository.upsertMaintenanceTicket('prime-you', ticket)).resolves.toEqual({
      action: 'updated'
    });
  });

  it('upserts agenda events by deterministic legacy id while preserving event notes', async () => {
    const prisma = createPrismaDouble();
    const repository = new PrismaLegacyYachtsImportRepository(prisma);
    const event: LegacyNormalizedAgendaEvent = {
      id: 'legacy-agenda-30',
      legacyRowId: '30',
      assetId: 'yacht-sapphire',
      assetDisplayName: 'Sapphire',
      type: 'utilization',
      startsAt: new Date('2025-11-13T13:00:00.000Z'),
      endsAt: new Date('2025-11-16T14:00:00.000Z'),
      title: 'Utilização da embarcação',
      notes: '*ANGRA DOS REIS',
      safeMinimumBreached: false,
      provisional: false,
      legacySnapshot: {
        modal: 'Yachts',
        status: 'Confirmado',
        reference: 'ref-30',
        link: 'https://primeyou.test/events/30'
      }
    };

    await expect(repository.upsertAgendaEvent('prime-you', event)).resolves.toEqual({
      action: 'created'
    });
    expect(prisma.__events.get('prime-you:prime-you__legacy-agenda-30')).toEqual(
      expect.objectContaining({
        title: expect.stringContaining('embarca'),
        description: '*ANGRA DOS REIS',
        legacyMetadata: expect.objectContaining({
          legacyRowId: '30',
          assetDisplayName: 'Sapphire',
          snapshot: expect.objectContaining({
            modal: 'Yachts',
            reference: 'ref-30'
          })
        })
      })
    );
    await expect(repository.upsertAgendaEvent('prime-you', event)).resolves.toEqual({
      action: 'updated'
    });
  });

  it('isolates imported maintenance and agenda records per tenant even when the legacy ids match', async () => {
    const prisma = createPrismaDouble();
    const repository = new PrismaLegacyYachtsImportRepository(prisma);
    const maintenanceTicket: LegacyNormalizedMaintenanceTicket = {
      id: 'legacy-maintenance-4',
      legacyRowId: '4',
      legacyTicketCode: 'M-4',
      assetId: 'yacht-alcazar',
      assetDisplayName: 'Alcazar',
      category: 'corrective',
      priority: 'P3',
      status: 'completed',
      maintenanceSystem: 'electrical',
      origin: 'asset_field_team',
      openedBy: 'alcazar@primeyou.com.br',
      openedAt: new Date('2025-06-05T09:51:03.000Z'),
      title: 'Revisao guincho',
      description: 'Descricao legado',
      notes: 'Observacao legado',
      thirdPartyHint: true,
      legacySnapshot: {
        sistema: 'Eletrica'
      },
      criticalAttachmentReferences: []
    };
    const agendaEvent: LegacyNormalizedAgendaEvent = {
      id: 'legacy-agenda-30',
      legacyRowId: '30',
      assetId: 'yacht-sapphire',
      assetDisplayName: 'Sapphire',
      type: 'utilization',
      startsAt: new Date('2025-11-13T13:00:00.000Z'),
      endsAt: new Date('2025-11-16T14:00:00.000Z'),
      title: 'Utilizacao da embarcacao',
      notes: 'Angra',
      safeMinimumBreached: false,
      provisional: false,
      legacySnapshot: {
        modal: 'Yachts'
      }
    };

    await repository.upsertMaintenanceTicket('prime-you-legacy-smoke', maintenanceTicket);
    await repository.upsertMaintenanceTicket('prime-you', maintenanceTicket);
    await repository.upsertAgendaEvent('prime-you-legacy-smoke', agendaEvent);
    await repository.upsertAgendaEvent('prime-you', agendaEvent);

    expect([...prisma.__tickets.keys()].sort()).toEqual([
      'prime-you-legacy-smoke:prime-you-legacy-smoke__legacy-maintenance-4',
      'prime-you:prime-you__legacy-maintenance-4'
    ]);
    expect([...prisma.__events.keys()].sort()).toEqual([
      'prime-you-legacy-smoke:prime-you-legacy-smoke__legacy-agenda-30',
      'prime-you:prime-you__legacy-agenda-30'
    ]);
  });
});

function createPrismaDouble() {
  const assets = new Map<string, Record<string, unknown>>();
  const tickets = new Map<string, Record<string, unknown>>();
  const events = new Map<string, Record<string, unknown>>();

  return {
    __tickets: tickets,
    __events: events,
    assetRegistryItem: {
      async findFirst(args: { where: Record<string, unknown> }) {
        const key = `${args.where['tenantId']}:${args.where['assetId']}`;

        return assets.get(key) ?? null;
      },
      async upsert(args: {
        where: {
          tenantId_assetId: {
            tenantId: string;
            assetId: string;
          };
        };
        create: Record<string, unknown>;
        update: Record<string, unknown>;
      }) {
        const key = `${args.where.tenantId_assetId.tenantId}:${args.where.tenantId_assetId.assetId}`;
        const existing = assets.get(key);
        const nextValue = existing
          ? {
              ...existing,
              ...args.update
            }
          : args.create;
        assets.set(key, nextValue);

        return nextValue;
      }
    },
    maintenanceTicket: {
      async findFirst(args: { where: Record<string, unknown> }) {
        const key = `${args.where['tenantId']}:${args.where['id']}`;

        return tickets.get(key) ?? null;
      },
      async upsert(args: {
        where: {
          id: string;
        };
        create: Record<string, unknown>;
        update: Record<string, unknown>;
      }) {
        const key = `${args.create['tenantId']}:${args.where.id}`;
        const existing = tickets.get(key);
        const nextValue = existing
          ? {
              ...existing,
              ...args.update
            }
          : args.create;
        tickets.set(key, nextValue);

        return nextValue;
      }
    },
    agendaEvent: {
      async findFirst(args: { where: Record<string, unknown> }) {
        const key = `${args.where['tenantId']}:${args.where['id']}`;

        return events.get(key) ?? null;
      },
      async upsert(args: {
        where: {
          id: string;
        };
        create: Record<string, unknown>;
        update: Record<string, unknown>;
      }) {
        const key = `${args.create['tenantId']}:${args.where.id}`;
        const existing = events.get(key);
        const nextValue = existing
          ? {
              ...existing,
              ...args.update
            }
          : args.create;
        events.set(key, nextValue);

        return nextValue;
      }
    }
  };
}
