import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  LegacyYachtsImportRepository,
  LegacyYachtsImportService,
  LegacyYachtsImportDryRunReport
} from '../src/modules/cutover/legacy-yachts-import.service.js';

const legacyMaintenanceWorkbookPath = resolve(
  process.cwd(),
  '..',
  '..',
  'tb_portal_antigo',
  'SolicitacaoManutencao.xlsx'
);

const legacyAgendaWorkbookPath = resolve(
  process.cwd(),
  '..',
  '..',
  'tb_portal_antigo',
  'Evento.xlsx'
);

describe('LegacyYachtsImportService', () => {
  it('builds a dry-run report from the approved legacy spreadsheets with alias normalization', async () => {
    const service = new LegacyYachtsImportService();

    const report = await service.buildDryRunReport({
      maintenanceWorkbookPath: legacyMaintenanceWorkbookPath,
      agendaWorkbookPath: legacyAgendaWorkbookPath,
      assetAliases: {
        Solar: 'Solar I'
      },
      referenceNow: new Date('2026-05-14T00:00:00.000Z')
    });

    expect(report.source).toEqual({
      maintenanceRows: 661,
      maintenanceRowsInScope: 657,
      maintenanceRowsExcluded: 4,
      agendaRows: 270,
      criticalAttachmentReferences: 8,
      futureAgendaDays: 94
    });
    expect(report.assets.discovered).toEqual([
      expect.objectContaining({
        assetId: 'yacht-alcazar',
        displayName: 'Alcazar',
        legacyAssetId: 'Alcazar'
      }),
      expect.objectContaining({
        assetId: 'yacht-carapituba',
        displayName: 'Carapituba',
        legacyAssetId: 'Carapituba'
      }),
      expect.objectContaining({
        assetId: 'yacht-fratelli',
        displayName: 'Fratelli',
        legacyAssetId: 'Fratelli'
      }),
      expect.objectContaining({
        assetId: 'yacht-mondebleu',
        displayName: 'Mondebleu',
        legacyAssetId: 'Mondebleu'
      }),
      expect.objectContaining({
        assetId: 'yacht-sapphire',
        displayName: 'Sapphire',
        legacyAssetId: 'Sapphire'
      }),
      expect.objectContaining({
        assetId: 'yacht-solar-i',
        displayName: 'Solar I',
        legacyAssetId: 'Solar I'
      }),
      expect.objectContaining({
        assetId: 'yacht-zhou',
        displayName: 'Zhou',
        legacyAssetId: 'Zhou'
      })
    ]);
    expect(report.assets.aliasesUsed).toEqual([
      {
        from: 'Solar',
        to: 'Solar I',
        count: 3
      }
    ]);
    expect(report.validation.outOfScopeRows).toEqual([
      {
        modality: 'Real Estate',
        count: 4
      }
    ]);
  });

  it('normalizes representative maintenance and agenda rows into deterministic import records', async () => {
    const service = new LegacyYachtsImportService();

    const report = await service.buildDryRunReport({
      maintenanceWorkbookPath: legacyMaintenanceWorkbookPath,
      agendaWorkbookPath: legacyAgendaWorkbookPath,
      assetAliases: {
        Solar: 'Solar I'
      },
      referenceNow: new Date('2026-05-14T00:00:00.000Z')
    });

    expect(report.maintenance.normalizedTickets.find((ticket) => ticket.legacyRowId === '4')).toEqual(
      expect.objectContaining({
        id: 'legacy-maintenance-4',
        legacyRowId: '4',
        legacyTicketCode: 'M-4',
        assetId: 'yacht-alcazar',
        assetDisplayName: 'Alcazar',
        category: 'corrective',
        priority: 'P3',
        status: 'completed',
        maintenanceSystem: 'electrical',
        title: 'Revisão guincho',
        thirdPartyHint: true
      })
    );
    expect(
      report.agenda.normalizedEvents.find((event) => event.legacyRowId === '30')
    ).toEqual(
      expect.objectContaining({
        id: 'legacy-agenda-30',
        legacyRowId: '30',
        assetId: 'yacht-sapphire',
        assetDisplayName: 'Sapphire',
        type: 'utilization',
        title: 'Utilização da embarcação'
      })
    );
    expect(
      report.agenda.normalizedEvents.find((event) => event.legacyRowId === '34')
    ).toEqual(
      expect.objectContaining({
        id: 'legacy-agenda-34',
        assetId: 'yacht-zhou',
        type: 'crew_rest',
        safeMinimumBreached: true
      })
    );
  });

  it('repairs invalid agenda rows from the legacy workbook without losing tenant-safe asset mapping', async () => {
    const service = new LegacyYachtsImportService();

    const report = await service.buildDryRunReport({
      maintenanceWorkbookPath: legacyMaintenanceWorkbookPath,
      agendaWorkbookPath: legacyAgendaWorkbookPath,
      assetAliases: {
        Solar: 'Solar I'
      },
      referenceNow: new Date('2026-05-14T00:00:00.000Z')
    });

    expect(
      report.agenda.normalizedEvents.find((event) => event.legacyRowId === '273')
    ).toEqual(
      expect.objectContaining({
        id: 'legacy-agenda-273',
        assetId: 'yacht-sapphire',
        assetDisplayName: 'Sapphire',
        startsAt: new Date('2026-04-14T11:57:00.000Z'),
        endsAt: new Date('2026-04-14T11:58:00.000Z')
      })
    );
    expect(
      report.agenda.normalizedEvents.find((event) => event.legacyRowId === '39')
    ).toEqual(
      expect.objectContaining({
        id: 'legacy-agenda-39',
        startsAt: new Date('2025-11-17T11:00:00.000Z'),
        endsAt: new Date('2025-11-17T11:00:00.000Z')
      })
    );
    expect(
      report.agenda.normalizedEvents.find((event) => event.legacyRowId === '60')
    ).toEqual(
      expect.objectContaining({
        id: 'legacy-agenda-60',
        startsAt: new Date('2025-11-26T11:30:00.000Z'),
        endsAt: new Date('2025-11-26T15:00:00.000Z')
      })
    );
    expect(
      report.agenda.normalizedEvents.find((event) => event.legacyRowId === '278')
    ).toEqual(
      expect.objectContaining({
        id: 'legacy-agenda-278',
        startsAt: new Date('2026-04-14T13:15:00.000Z'),
        endsAt: new Date('2026-04-14T13:15:00.000Z')
      })
    );
    expect(report.validation.unknownAssets).toEqual([]);
  });

  it('imports a normalized dry-run report idempotently through the repository contract', async () => {
    const service = new LegacyYachtsImportService();
    const repository = createImportRepository();
    const report = createDryRunReportFixture();

    await expect(
      service.executeImport({
        tenantId: 'prime-you',
        report,
        repository
      })
    ).resolves.toEqual({
      assetsCreated: 1,
      assetsUpdated: 0,
      maintenanceCreated: 1,
      maintenanceUpdated: 0,
      agendaCreated: 1,
      agendaUpdated: 0
    });

    await expect(
      service.executeImport({
        tenantId: 'prime-you',
        report,
        repository
      })
    ).resolves.toEqual({
      assetsCreated: 0,
      assetsUpdated: 1,
      maintenanceCreated: 0,
      maintenanceUpdated: 1,
      agendaCreated: 0,
      agendaUpdated: 1
    });
  });
});

function createDryRunReportFixture(): LegacyYachtsImportDryRunReport {
  return {
    source: {
      maintenanceRows: 1,
      maintenanceRowsInScope: 1,
      maintenanceRowsExcluded: 0,
      agendaRows: 1,
      criticalAttachmentReferences: 0,
      futureAgendaDays: 90
    },
    assets: {
      discovered: [
        {
          assetId: 'yacht-alcazar',
          displayName: 'Alcazar',
          legacyAssetId: 'Alcazar',
          modality: 'yachts',
          timezone: 'America/Sao_Paulo'
        }
      ],
      aliasesUsed: []
    },
    maintenance: {
      normalizedTickets: [
        {
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
          description: 'Conforme orientado pelo Sr. Vittorio, há necessidade de uma revisão geral do guincho de proa, para a subida em agosto',
          notes: 'guincho substituido pelo um novo',
          thirdPartyHint: true,
          legacySnapshot: {
            sistema: 'Elétrica',
            atribuido: 'Fornecedores',
            substatus: 'Arquivo casos finalizados'
          },
          criticalAttachmentReferences: []
        }
      ],
      unmappedValues: {
        statuses: [],
        categories: [],
        priorities: []
      }
    },
    agenda: {
      normalizedEvents: [
        {
          id: 'legacy-agenda-30',
          legacyRowId: '30',
          assetId: 'yacht-alcazar',
          assetDisplayName: 'Alcazar',
          type: 'utilization',
          startsAt: new Date('2025-11-13T13:00:00.000Z'),
          endsAt: new Date('2025-11-16T14:00:00.000Z'),
          title: 'Utilização da embarcação',
          notes: '*ANGRA DOS REIS',
          safeMinimumBreached: false,
          provisional: false,
          legacySnapshot: {
            modal: 'Yachts',
            status: undefined,
            reference: undefined,
            link: undefined
          }
        }
      ],
      unmappedValues: {
        eventNames: []
      }
    },
    validation: {
      outOfScopeRows: [],
      unknownAssets: []
    }
  };
}

function createImportRepository() {
  const assets = new Map<string, Record<string, unknown>>();
  const maintenance = new Map<string, Record<string, unknown>>();
  const agenda = new Map<string, Record<string, unknown>>();

  return {
    async upsertAsset(tenantId, asset) {
      const key = `${tenantId}:${asset.assetId}`;
      const action = assets.has(key) ? 'updated' : 'created';
      assets.set(key, {
        tenantId,
        ...asset
      });

      return {
        action
      };
    },
    async upsertMaintenanceTicket(tenantId, ticket) {
      const key = `${tenantId}:${ticket.id}`;
      const action = maintenance.has(key) ? 'updated' : 'created';
      maintenance.set(key, {
        tenantId,
        ...ticket
      });

      return {
        action
      };
    },
    async upsertAgendaEvent(tenantId, event) {
      const key = `${tenantId}:${event.id}`;
      const action = agenda.has(key) ? 'updated' : 'created';
      agenda.set(key, {
        tenantId,
        ...event
      });

      return {
        action
      };
    }
  } satisfies LegacyYachtsImportRepository;
}
