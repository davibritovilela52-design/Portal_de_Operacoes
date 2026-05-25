import { Injectable } from '@nestjs/common';
import { readFile, utils } from 'xlsx';

import {
  AgendaEventType
} from '../agenda/agenda-scheduling.service.js';
import {
  MaintenanceCategory,
  MaintenanceOrigin,
  MaintenancePriority,
  MaintenanceStatus
} from '../maintenance/maintenance-workflow.service.js';
import { MaintenanceSystem } from '../maintenance/maintenance-application.service.js';

type LegacyMaintenanceRow = {
  id: string | null;
  id_chamado: string | null;
  date_time: string | null;
  user_name: string | null;
  user_email: string | null;
  ativo_name: string | null;
  categoria_urgencia: string | null;
  categoria_manutencao: string | null;
  descricao: string | null;
  titulo: string | null;
  status: string | null;
  observacoes: string | null;
  sistema: string | null;
  atribuido: string | null;
  field_1: string | null;
  field_2: string | null;
  field_3: string | null;
  field_4: string | null;
  field_5: string | null;
  field_6: string | null;
  field_7: string | null;
  field_8: string | null;
  Substatus: string | null;
};

type LegacyAgendaRow = {
  ei_evento: string | null;
  nome_evento: string | null;
  descricao_evento: string | null;
  link_evento: string | null;
  ref_evento: string | null;
  field_1: string | null;
  field_2: string | null;
  field_3: string | null;
  field_4: string | null;
  field_5: string | null;
  field_6: string | null;
  Modal: string | null;
  Ativo: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  status_evento: string | null;
};

export type LegacyYachtsImportAsset = {
  assetId: string;
  displayName: string;
  legacyAssetId: string;
  modality: 'yachts';
  timezone: string;
};

export type LegacyNormalizedMaintenanceTicket = {
  id: string;
  legacyRowId: string;
  legacyTicketCode: string;
  assetId: string;
  assetDisplayName: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  maintenanceSystem?: MaintenanceSystem;
  origin: MaintenanceOrigin;
  openedBy: string;
  openedAt: Date;
  title: string;
  description: string;
  notes?: string;
  thirdPartyHint: boolean;
  legacySnapshot: Record<string, unknown>;
  criticalAttachmentReferences: string[];
};

export type LegacyNormalizedAgendaEvent = {
  id: string;
  legacyRowId: string;
  assetId: string;
  assetDisplayName: string;
  type: AgendaEventType;
  startsAt: Date;
  endsAt: Date;
  title: string;
  notes?: string;
  safeMinimumBreached: boolean;
  provisional: boolean;
  legacySnapshot: Record<string, unknown>;
};

export type LegacyYachtsImportDryRunReport = {
  source: {
    maintenanceRows: number;
    maintenanceRowsInScope: number;
    maintenanceRowsExcluded: number;
    agendaRows: number;
    criticalAttachmentReferences: number;
    futureAgendaDays: number;
  };
  assets: {
    discovered: LegacyYachtsImportAsset[];
    aliasesUsed: Array<{
      from: string;
      to: string;
      count: number;
    }>;
  };
  maintenance: {
    normalizedTickets: LegacyNormalizedMaintenanceTicket[];
    unmappedValues: {
      statuses: string[];
      categories: string[];
      priorities: string[];
    };
  };
  agenda: {
    normalizedEvents: LegacyNormalizedAgendaEvent[];
    unmappedValues: {
      eventNames: string[];
    };
  };
  validation: {
    outOfScopeRows: Array<{
      modality: string;
      count: number;
    }>;
    unknownAssets: string[];
  };
};

export type LegacyYachtsImportRepository = {
  upsertAsset(
    tenantId: string,
    asset: LegacyYachtsImportAsset
  ): Promise<{
    action: 'created' | 'updated';
  }>;
  upsertMaintenanceTicket(
    tenantId: string,
    ticket: LegacyNormalizedMaintenanceTicket
  ): Promise<{
    action: 'created' | 'updated';
  }>;
  upsertAgendaEvent(
    tenantId: string,
    event: LegacyNormalizedAgendaEvent
  ): Promise<{
    action: 'created' | 'updated';
  }>;
};

type BuildDryRunInput = {
  maintenanceWorkbookPath: string;
  agendaWorkbookPath: string;
  assetAliases?: Record<string, string>;
  referenceNow: Date;
};

type ExecuteImportInput = {
  tenantId: string;
  report: LegacyYachtsImportDryRunReport;
  repository: LegacyYachtsImportRepository;
};

const defaultTimezone = 'America/Sao_Paulo';
const technicalAssignments = new Set([
  'Gerente Tecnico',
  'Eletrica',
  'Mecanica',
  'Hidraulica',
  'Estrutural',
  'Rose Zebini',
  'Klayton Souza',
  'Sergio Gomes',
  'Vittorio Biseo'
]);
const centralAssignments = new Set(['Operacoes']);

@Injectable()
export class LegacyYachtsImportService {
  async buildDryRunReport(input: BuildDryRunInput): Promise<LegacyYachtsImportDryRunReport> {
    const maintenanceRows = this.loadRows<LegacyMaintenanceRow>(input.maintenanceWorkbookPath);
    const agendaRows = this.loadRows<LegacyAgendaRow>(input.agendaWorkbookPath);
    const assetAliases = new Map(
      Object.entries(input.assetAliases ?? {}).map(([from, to]) => [this.normalizeKey(from), to.trim()])
    );
    const aliasHits = new Map<string, { from: string; to: string; count: number }>();
    const outOfScopeCounts = new Map<string, number>();

    const maintenanceInScopeRows = maintenanceRows.filter((row) => {
      const modality = this.readText(row.field_1);

      if (modality === 'Yachts') {
        return true;
      }

      if (modality) {
        outOfScopeCounts.set(modality, (outOfScopeCounts.get(modality) ?? 0) + 1);
      }

      return false;
    });

    const assetNames = new Set<string>();

    for (const row of maintenanceInScopeRows) {
      const normalizedAssetName = this.normalizeAssetName(
        this.readText(row.ativo_name),
        assetAliases,
        aliasHits
      );

      if (normalizedAssetName) {
        assetNames.add(normalizedAssetName);
      }
    }

    for (const row of agendaRows) {
      const normalizedAssetName = this.normalizeAssetName(
        this.readText(row.Ativo),
        assetAliases,
        aliasHits
      );

      if (normalizedAssetName) {
        assetNames.add(normalizedAssetName);
      }
    }

    const discoveredAssets = [...assetNames]
      .sort((left, right) => left.localeCompare(right))
      .map((displayName) => ({
        assetId: this.buildAssetId(displayName),
        displayName,
        legacyAssetId: displayName,
        modality: 'yachts' as const,
        timezone: defaultTimezone
      }));
    const knownAssetNames = new Set(discoveredAssets.map((asset) => asset.displayName));
    const maintenanceUnmapped = {
      statuses: new Set<string>(),
      categories: new Set<string>(),
      priorities: new Set<string>()
    };
    const agendaUnmapped = {
      eventNames: new Set<string>()
    };

    const normalizedTickets = maintenanceInScopeRows.map((row) =>
      this.normalizeMaintenanceRow(row, {
        assetAliases,
        knownAssetNames,
        unmapped: maintenanceUnmapped
      })
    );
    const normalizedEvents = agendaRows.map((row) =>
      this.normalizeAgendaRow(row, {
        assetAliases,
        knownAssetNames,
        unmapped: agendaUnmapped
      })
    );
    const unknownAssets = [
      ...new Set(
        normalizedEvents
          .filter((event) => event.assetDisplayName === 'Unknown')
          .map((event) => event.legacyRowId)
      )
    ].sort((left, right) => left.localeCompare(right));
    const futureAgendaDays = normalizedEvents.reduce((maxDays, event) => {
      const days = Math.max(
        0,
        Math.floor(
          (event.endsAt.getTime() - input.referenceNow.getTime()) / (24 * 60 * 60 * 1000)
        )
      );

      return Math.max(maxDays, days);
    }, 0);

    return {
      source: {
        maintenanceRows: maintenanceRows.length,
        maintenanceRowsInScope: maintenanceInScopeRows.length,
        maintenanceRowsExcluded: maintenanceRows.length - maintenanceInScopeRows.length,
        agendaRows: agendaRows.length,
        criticalAttachmentReferences: normalizedTickets.reduce(
          (total, ticket) => total + ticket.criticalAttachmentReferences.length,
          0
        ),
        futureAgendaDays
      },
      assets: {
        discovered: discoveredAssets,
        aliasesUsed: [...aliasHits.values()].sort((left, right) => left.from.localeCompare(right.from))
      },
      maintenance: {
        normalizedTickets,
        unmappedValues: {
          statuses: [...maintenanceUnmapped.statuses].sort(),
          categories: [...maintenanceUnmapped.categories].sort(),
          priorities: [...maintenanceUnmapped.priorities].sort()
        }
      },
      agenda: {
        normalizedEvents,
        unmappedValues: {
          eventNames: [...agendaUnmapped.eventNames].sort()
        }
      },
      validation: {
        outOfScopeRows: [...outOfScopeCounts.entries()]
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([modality, count]) => ({
            modality,
            count
          })),
        unknownAssets
      }
    };
  }

  async executeImport(
    input: ExecuteImportInput
  ): Promise<{
    assetsCreated: number;
    assetsUpdated: number;
    maintenanceCreated: number;
    maintenanceUpdated: number;
    agendaCreated: number;
    agendaUpdated: number;
  }> {
    let assetsCreated = 0;
    let assetsUpdated = 0;
    let maintenanceCreated = 0;
    let maintenanceUpdated = 0;
    let agendaCreated = 0;
    let agendaUpdated = 0;

    for (const asset of input.report.assets.discovered) {
      const result = await input.repository.upsertAsset(input.tenantId, asset);

      if (result.action === 'created') {
        assetsCreated += 1;
      } else {
        assetsUpdated += 1;
      }
    }

    for (const ticket of input.report.maintenance.normalizedTickets) {
      const result = await input.repository.upsertMaintenanceTicket(input.tenantId, ticket);

      if (result.action === 'created') {
        maintenanceCreated += 1;
      } else {
        maintenanceUpdated += 1;
      }
    }

    for (const event of input.report.agenda.normalizedEvents) {
      const result = await input.repository.upsertAgendaEvent(input.tenantId, event);

      if (result.action === 'created') {
        agendaCreated += 1;
      } else {
        agendaUpdated += 1;
      }
    }

    return {
      assetsCreated,
      assetsUpdated,
      maintenanceCreated,
      maintenanceUpdated,
      agendaCreated,
      agendaUpdated
    };
  }

  private loadRows<TRow extends Record<string, unknown>>(workbookPath: string): TRow[] {
    const workbook = readFile(workbookPath, {
      cellDates: false
    });
    const firstSheetName = workbook.SheetNames[0];
    const firstSheet = workbook.Sheets[firstSheetName];

    return utils.sheet_to_json<TRow>(firstSheet, {
      raw: false,
      defval: null
    });
  }

  private normalizeMaintenanceRow(
    row: LegacyMaintenanceRow,
    context: {
      assetAliases: Map<string, string>;
      knownAssetNames: Set<string>;
      unmapped: {
        statuses: Set<string>;
        categories: Set<string>;
        priorities: Set<string>;
      };
    }
  ): LegacyNormalizedMaintenanceTicket {
    const assetDisplayName =
      this.normalizeAssetName(this.readText(row.ativo_name), context.assetAliases) ??
      'Unknown';
    const category = this.mapMaintenanceCategory(this.readText(row.categoria_manutencao), context.unmapped.categories);
    const priority = this.mapMaintenancePriority(this.readText(row.categoria_urgencia), context.unmapped.priorities);
    const status = this.mapMaintenanceStatus(this.readText(row.status), context.unmapped.statuses);
    const maintenanceSystem = this.mapLegacyMaintenanceSystem(this.readText(row.sistema));
    const openedBy = this.readText(row.user_email) ?? this.readText(row.user_name) ?? 'legacy-import';
    const title = this.readText(row.titulo) ?? this.readText(row.id_chamado) ?? 'Chamado legado';
    const description = this.readText(row.descricao) ?? title;
    const notes = this.readText(row.observacoes) ?? undefined;
    const assignedTo = this.readText(row.atribuido);

    return {
      id: `legacy-maintenance-${this.readText(row.id)}`,
      legacyRowId: this.readText(row.id) ?? '',
      legacyTicketCode: this.readText(row.id_chamado) ?? '',
      assetId: this.buildAssetId(assetDisplayName),
      assetDisplayName,
      category,
      priority,
      status,
      maintenanceSystem,
      origin: this.resolveMaintenanceOrigin(row),
      openedBy,
      openedAt: this.toDate(this.readText(row.date_time)),
      title,
      description,
      notes,
      thirdPartyHint:
        assignedTo?.toLowerCase().includes('fornecedor') === true ||
        assignedTo?.toLowerCase().includes('suprimento') === true,
      legacySnapshot: {
        sistema: this.readText(row.sistema),
        atribuido: assignedTo,
        substatus: this.readText(row.Substatus),
        urgencia: this.readText(row.categoria_urgencia),
        categoria: this.readText(row.categoria_manutencao),
        userName: this.readText(row.user_name)
      },
      criticalAttachmentReferences: this.readText(row.field_6) ? [this.readText(row.field_6) as string] : []
    };
  }

  private normalizeAgendaRow(
    row: LegacyAgendaRow,
    context: {
      assetAliases: Map<string, string>;
      knownAssetNames: Set<string>;
      unmapped: {
        eventNames: Set<string>;
      };
    }
  ): LegacyNormalizedAgendaEvent {
    const assetDisplayName = this.resolveAgendaAssetDisplayName(row, context);
    const eventType = this.mapAgendaEventType(this.readText(row.nome_evento), context.unmapped.eventNames);
    const startsAt = this.toDate(this.readText(row.data_inicio));
    const endsAt = this.normalizeAgendaEndsAt(this.readText(row.data_fim), startsAt);

    return {
      id: `legacy-agenda-${this.readText(row.ei_evento)}`,
      legacyRowId: this.readText(row.ei_evento) ?? '',
      assetId: this.buildAssetId(assetDisplayName),
      assetDisplayName,
      type: eventType,
      startsAt,
      endsAt,
      title: this.readText(row.nome_evento) ?? 'Evento legado',
      notes: this.readText(row.descricao_evento) ?? undefined,
      safeMinimumBreached: eventType === 'crew_rest',
      provisional: false,
      legacySnapshot: {
        modal: this.readText(row.Modal),
        status: this.readText(row.status_evento),
        reference: this.readText(row.ref_evento),
        link: this.readText(row.link_evento)
      }
    };
  }

  private resolveAgendaAssetDisplayName(
    row: LegacyAgendaRow,
    context: {
      assetAliases: Map<string, string>;
      knownAssetNames: Set<string>;
      unmapped: {
        eventNames: Set<string>;
      };
    }
  ): string {
    const explicitAssetName = this.normalizeAssetName(this.readText(row.Ativo), context.assetAliases);

    if (explicitAssetName) {
      return explicitAssetName;
    }

    const fallbackAssetName = this.normalizeAssetName(this.readText(row.field_2), context.assetAliases);

    if (fallbackAssetName && context.knownAssetNames.has(fallbackAssetName)) {
      return fallbackAssetName;
    }

    return 'Unknown';
  }

  private normalizeAssetName(
    input: string | null | undefined,
    assetAliases: Map<string, string>,
    aliasHits?: Map<string, { from: string; to: string; count: number }>
  ): string | undefined {
    const value = this.readText(input);

    if (!value) {
      return undefined;
    }

    const aliased = assetAliases.get(this.normalizeKey(value));

    if (!aliased) {
      return value;
    }

    if (aliasHits) {
      const hitKey = `${value}->${aliased}`;
      const current = aliasHits.get(hitKey);
      aliasHits.set(hitKey, {
        from: value,
        to: aliased,
        count: (current?.count ?? 0) + 1
      });
    }

    return aliased;
  }

  private buildAssetId(displayName: string): string {
    return `yacht-${displayName
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')}`;
  }

  private readText(value: unknown): string | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }

    const text = String(value).trim();

    return text.length > 0 ? text : undefined;
  }

  private normalizeKey(value: string): string {
    return value
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .trim();
  }

  private mapMaintenanceStatus(
    value: string | undefined,
    unmapped: Set<string>
  ): MaintenanceStatus {
    switch (value) {
      case 'Concluído':
      case 'Concluido':
        return 'completed';
      case 'Em andamento':
        return 'in_progress';
      case 'Pagamento':
        return 'payment';
      case 'Pendente':
        return 'pending';
      case 'Congelado':
        return 'frozen';
      case 'Cancelado':
        return 'cancelled';
      case 'Reaberto':
        return 'reopened';
      default:
        if (value) {
          unmapped.add(value);
        }

        return 'pending';
    }
  }

  private mapMaintenanceCategory(
    value: string | undefined,
    unmapped: Set<string>
  ): MaintenanceCategory {
    switch (value) {
      case 'Preventiva':
        return 'preventive';
      case 'Corretiva':
        return 'corrective';
      case 'Melhorias':
        return 'improvement';
      case 'Garantia':
        return 'corrective';
      case 'Inspeção':
      case 'Inspecao':
        return 'inspection';
      default:
        if (value) {
          unmapped.add(value);
        }

        return 'inspection';
    }
  }

  private mapMaintenancePriority(
    value: string | undefined,
    unmapped: Set<string>
  ): MaintenancePriority {
    switch (value) {
      case 'Altíssimo':
      case 'Altissimo':
      case 'Alta':
        return 'P1';
      case 'Alto':
        return 'P2';
      case 'Médio':
      case 'Medio':
      case 'Média':
      case 'Media':
        return 'P3';
      case 'Baixo':
      case 'Baixíssimo':
      case 'Baixissimo':
        return 'P4';
      default:
        if (value) {
          unmapped.add(value);
        }

        return 'P3';
    }
  }

  private mapLegacyMaintenanceSystem(value: string | undefined): MaintenanceSystem | undefined {
    if (!value) {
      return undefined;
    }

    switch (this.normalizeKey(value)) {
      case 'automacao':
        return 'automation';
      case 'eletrica':
        return 'electrical';
      case 'eletronicos navegacao':
        return 'electronics';
      case 'equipamentos':
        return 'equipment';
      case 'hidraulica':
        return 'hydraulic';
      case 'imagem som':
        return 'image_sound';
      case 'mecanica motores propulsao':
        return 'mechanical';
      case 'outros':
        return 'other';
      case 'pintura':
        return 'painting';
      case 'serralheria':
        return 'metalwork';
      case 'tapecaria':
        return 'upholstery';
      case 'marcenaria':
        return 'other';
      default:
        return undefined;
    }
  }

  private mapAgendaEventType(
    value: string | undefined,
    unmapped: Set<string>
  ): AgendaEventType {
    switch (value) {
      case 'Utilização da embarcação':
      case 'Utilizacao da embarcação':
      case 'Utilizacao da embarcacao':
        return 'utilization';
      case 'Serviço de manutenção':
      case 'Servico de manutenção':
      case 'Servico de manutencao':
      case 'Serviço de manutenção - no seco':
      case 'Servico de manutenção - no seco':
      case 'Servico de manutencao - no seco':
        return 'planned_maintenance';
      case 'Folga tripulação':
      case 'Folga tripulacao':
        return 'crew_rest';
      default:
        if (value) {
          unmapped.add(value);
        }

        return 'operational_block';
    }
  }

  private resolveMaintenanceOrigin(row: LegacyMaintenanceRow): MaintenanceOrigin {
    const assignedTo = this.readText(row.atribuido);
    const userEmail = this.readText(row.user_email)?.toLowerCase();

    if (assignedTo && centralAssignments.has(assignedTo)) {
      return 'central_operations';
    }

    if (
      userEmail?.includes('manutencao') ||
      (assignedTo ? technicalAssignments.has(assignedTo) : false)
    ) {
      return 'yachts_technical_coordination';
    }

    return 'asset_field_team';
  }

  private toDate(value: string | undefined): Date {
    return this.parseDate(value) ?? new Date(0);
  }

  private parseDate(value: string | undefined): Date | undefined {
    if (!value) {
      return undefined;
    }

    const parsed = new Date(value);

    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  private normalizeAgendaEndsAt(value: string | undefined, startsAt: Date): Date {
    const parsedEnd = this.parseDate(value);

    if (!parsedEnd) {
      return new Date(startsAt);
    }

    if (parsedEnd.getTime() >= startsAt.getTime()) {
      return parsedEnd;
    }

    const repairedSameDayEnd = new Date(startsAt);
    repairedSameDayEnd.setUTCHours(
      parsedEnd.getUTCHours(),
      parsedEnd.getUTCMinutes(),
      parsedEnd.getUTCSeconds(),
      parsedEnd.getUTCMilliseconds()
    );

    if (repairedSameDayEnd.getTime() >= startsAt.getTime()) {
      return repairedSameDayEnd;
    }

    return new Date(startsAt);
  }
}
