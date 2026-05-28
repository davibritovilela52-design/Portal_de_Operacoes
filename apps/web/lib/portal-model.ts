export type MaintenanceStatus =
  | 'pending'
  | 'in_progress'
  | 'frozen'
  | 'payment'
  | 'completed'
  | 'cancelled'
  | 'reopened';

export type MaintenanceCategory =
  | 'preventive'
  | 'corrective'
  | 'emergency'
  | 'improvement'
  | 'inspection'
  | 'warranty';

export type MaintenancePriority = 'P1' | 'P2' | 'P3' | 'P4';

export type MaintenanceUrgency = 'low' | 'medium' | 'high' | 'critical';

export type MaintenanceSystem =
  | 'electrical'
  | 'hydraulic'
  | 'mechanical'
  | 'metalwork'
  | 'upholstery'
  | 'painting'
  | 'equipment'
  | 'electronics'
  | 'automation'
  | 'image_sound'
  | 'other';

export type MaintenanceKanbanSubstatus =
  | 'call_opening'
  | 'ticket_qualification'
  | 'onsite_diagnosis'
  | 'preliminary_quote'
  | 'absorption_strategy'
  | 'date_scheduling'
  | 'technical_approval'
  | 'budget_allocation'
  | 'service_preparation'
  | 'service_execution'
  | 'complementary_quote'
  | 'quality_control'
  | 'accounts_freeze'
  | 'payment_request'
  | 'payment_scheduling'
  | 'payment_receipt'
  | 'closed_files'
  | 'cancelled';

export type AgendaEventType =
  | 'utilization'
  | 'planned_maintenance'
  | 'emergency_maintenance'
  | 'operational_block'
  | 'crew_rest';

export type AssetModality = 'yachts' | 'aviation' | 'real_estate' | 'cars';

export type PortalRole =
  | 'portal_admin'
  | 'central_operations'
  | 'yachts_operations'
  | 'yachts_technical_coordination'
  | 'aviation_operations'
  | 'aviation_technical_coordination'
  | 'asset_field_team';

export type MaintenanceStatusTransitionRecord = {
  fromStatus?: MaintenanceStatus | null;
  toStatus: MaintenanceStatus;
  at: string;
};

export type MaintenanceCostRecord = {
  id: string;
  assetId: string;
  ticketId: string;
  description: string;
  amount: number;
  currency: string;
  supplierId?: string;
  registeredAt: string;
};

export type MaintenanceTicketRecord = {
  id: string;
  ticketNumber: string;
  assetId: string;
  assetName: string;
  title: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  maintenanceSystem?: MaintenanceSystem;
  status: MaintenanceStatus;
  owner: string;
  openedBy?: string;
  openedAt: string;
  urgency?: MaintenanceUrgency;
  updatedAt?: string;
  completedAt?: string | null;
  firstInProgressAt?: string | null;
  statusHistory?: MaintenanceStatusTransitionRecord[];
  frozenCount: number;
  thirdParty: boolean;
  evidenceCompleteness: number;
  slaProgress: number;
  kanbanSubstatus?: MaintenanceKanbanSubstatus;
};

export type AgendaEventRecord = {
  id: string;
  assetId: string;
  assetName: string;
  type: AgendaEventType;
  title: string;
  description?: string;
  owner: string;
  startsAt: string;
  endsAt: string;
  provisional?: boolean;
  validatedAt?: string | null;
  safeMinimumBreached?: boolean;
};

export type AccessUserRecord = {
  id: string;
  userId?: string;
  displayName: string;
  email: string;
  role: PortalRole;
  assetScopes: string[];
  mfaEnabled: boolean;
  status: 'active' | 'blocked' | 'revoked';
  lastReviewedAt: string;
};

export const maintenanceStatusOrder: MaintenanceStatus[] = [
  'pending',
  'in_progress',
  'frozen',
  'payment',
  'completed',
  'cancelled',
  'reopened'
];

export const maintenanceStatusLabels: Record<MaintenanceStatus, string> = {
  pending: 'Pendente',
  in_progress: 'Em andamento',
  frozen: 'Congelado',
  payment: 'Pagamento',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  reopened: 'Reaberto'
};

type MaintenanceKanbanSubstatusDefinition = {
  key: MaintenanceKanbanSubstatus;
  label: string;
  status: MaintenanceStatus;
  phaseLabel: string;
};

export const maintenanceKanbanSubstatusDefinitions: MaintenanceKanbanSubstatusDefinition[] = [
  { key: 'call_opening', label: 'Abertura do chamado', status: 'pending', phaseLabel: 'Pendente' },
  {
    key: 'ticket_qualification',
    label: 'Qualificação do chamado',
    status: 'in_progress',
    phaseLabel: 'Em andamento'
  },
  {
    key: 'onsite_diagnosis',
    label: 'Diagnóstico presencial',
    status: 'in_progress',
    phaseLabel: 'Em andamento'
  },
  {
    key: 'preliminary_quote',
    label: 'Orçamento preliminar',
    status: 'in_progress',
    phaseLabel: 'Em andamento'
  },
  {
    key: 'absorption_strategy',
    label: 'Estratégia de absorção',
    status: 'in_progress',
    phaseLabel: 'Em andamento'
  },
  {
    key: 'date_scheduling',
    label: 'Programação de datas',
    status: 'in_progress',
    phaseLabel: 'Em andamento'
  },
  {
    key: 'technical_approval',
    label: 'Aprovação técnica',
    status: 'in_progress',
    phaseLabel: 'Em andamento'
  },
  {
    key: 'budget_allocation',
    label: 'Alocação de budget',
    status: 'in_progress',
    phaseLabel: 'Em andamento'
  },
  {
    key: 'service_preparation',
    label: 'Preparação para atendimento',
    status: 'in_progress',
    phaseLabel: 'Em andamento'
  },
  {
    key: 'service_execution',
    label: 'Realização do serviço',
    status: 'in_progress',
    phaseLabel: 'Em andamento'
  },
  {
    key: 'complementary_quote',
    label: 'Orçamento complementar',
    status: 'in_progress',
    phaseLabel: 'Em andamento'
  },
  {
    key: 'quality_control',
    label: 'Controle de qualidade',
    status: 'in_progress',
    phaseLabel: 'Em andamento'
  },
  {
    key: 'accounts_freeze',
    label: 'Prestação de contas',
    status: 'frozen',
    phaseLabel: 'Congelado'
  },
  {
    key: 'payment_request',
    label: 'Solicitação de pagamento',
    status: 'payment',
    phaseLabel: 'Pagamento'
  },
  {
    key: 'payment_scheduling',
    label: 'Programação de pagamento',
    status: 'payment',
    phaseLabel: 'Pagamento'
  },
  {
    key: 'payment_receipt',
    label: 'Comprovante de pagamento',
    status: 'payment',
    phaseLabel: 'Pagamento'
  },
  {
    key: 'closed_files',
    label: 'Arquivos finalizados',
    status: 'completed',
    phaseLabel: 'Concluído'
  },
  {
    key: 'cancelled',
    label: 'Cancelado',
    status: 'cancelled',
    phaseLabel: 'Cancelado'
  }
];

export const maintenanceCategoryLabels: Record<MaintenanceCategory, string> = {
  preventive: 'Preventiva',
  corrective: 'Corretiva',
  emergency: 'Emergencial',
  improvement: 'Melhoria',
  inspection: 'Inspeção',
  warranty: 'Garantia'
};

export const maintenanceUrgencyLabels: Record<MaintenanceUrgency, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica'
};

export const maintenanceSystemLabels: Record<MaintenanceSystem, string> = {
  electrical: 'Elétrica',
  hydraulic: 'Hidráulica',
  mechanical: 'Mecânica',
  metalwork: 'Serralheria',
  upholstery: 'Tapeçaria',
  painting: 'Pintura',
  equipment: 'Equipamentos',
  electronics: 'Eletrônicos',
  automation: 'Automação',
  image_sound: 'Imagem/Som',
  other: 'Outros'
};

export const agendaEventLabels: Record<AgendaEventType, string> = {
  utilization: 'Utilização',
  planned_maintenance: 'Manutenção planejada',
  emergency_maintenance: 'Manutenção emergencial',
  operational_block: 'Bloqueio operacional',
  crew_rest: 'Folga da tripulação'
};

export const assetModalityLabels: Record<AssetModality, string> = {
  yachts: 'Yachts',
  aviation: 'Aviação',
  real_estate: 'Imóveis',
  cars: 'Carros'
};

export const portalRoleLabels: Record<PortalRole, string> = {
  portal_admin: 'Admin do portal',
  central_operations: 'Operações Centrais',
  yachts_operations: 'Operações - Yachts',
  yachts_technical_coordination: 'Coordenação técnica - Embarcações',
  aviation_operations: 'Operações - Aviation',
  aviation_technical_coordination: 'Coordenação técnica - Aviation',
  asset_field_team: 'Equipe de campo - Embarcações'
};

const criticalRoles = new Set<PortalRole>([
  'portal_admin',
  'central_operations',
  'yachts_operations',
  'yachts_technical_coordination'
]);

const globalDashboardRoles = new Set<PortalRole>([
  'portal_admin',
  'central_operations',
  'yachts_operations',
  'yachts_technical_coordination'
]);

const accessModuleViewerRoles = new Set<PortalRole>(['portal_admin', 'central_operations']);

const accessModuleManagerRoles = new Set<PortalRole>(['portal_admin']);

export function buildMaintenanceStatusSummary(
  tickets: MaintenanceTicketRecord[]
): Array<{ status: MaintenanceStatus; label: string; count: number }> {
  return maintenanceStatusOrder.map((status) => ({
    status,
    label: maintenanceStatusLabels[status],
    count: tickets.filter((ticket) => ticket.status === status).length
  }));
}

export function buildAgendaConflictQueue(
  events: AgendaEventRecord[]
): Array<{
  id: string;
  assetId: string;
  assetName: string;
  title: string;
  conflictingTitle: string;
  risk: 'critical' | 'warning';
  owner: string;
  windowLabel: string;
}> {
  const conflicts: Array<{
    id: string;
    assetId: string;
    assetName: string;
    title: string;
    conflictingTitle: string;
    risk: 'critical' | 'warning';
    owner: string;
    windowLabel: string;
    startsAt: string;
  }> = [];

  const sorted = [...events].sort((left, right) => left.startsAt.localeCompare(right.startsAt));

  for (let index = 0; index < sorted.length; index += 1) {
    for (let next = index + 1; next < sorted.length; next += 1) {
      const current = sorted[index];
      const candidate = sorted[next];

      if (current.assetId !== candidate.assetId) {
        continue;
      }

      if (!overlaps(current.startsAt, current.endsAt, candidate.startsAt, candidate.endsAt)) {
        continue;
      }

      conflicts.push({
        id: `${current.id}:${candidate.id}`,
        assetId: current.assetId,
        assetName: current.assetName,
        title: current.title,
        conflictingTitle: candidate.title,
        risk: resolveConflictRisk(current, candidate),
        owner: current.owner,
        windowLabel: `${toTimeLabel(minIso(current.startsAt, candidate.startsAt))}-${toTimeLabel(maxIso(current.endsAt, candidate.endsAt))}`,
        startsAt: minIso(current.startsAt, candidate.startsAt)
      });
    }
  }

  return conflicts
    .sort((left, right) => {
      if (left.risk !== right.risk) {
        return left.risk === 'critical' ? -1 : 1;
      }

      return left.startsAt.localeCompare(right.startsAt);
    })
    .map(({ startsAt: _startsAt, ...conflict }) => conflict);
}

export function buildAccessReviewSummary(
  users: AccessUserRecord[],
  nowIso: string
): {
  criticalRoles: number;
  mfaNonCompliant: number;
  reviewDue: number;
  overdue: number;
} {
  const now = Date.parse(nowIso);

  return users.reduce(
    (summary, user) => {
      if (user.status !== 'active') {
        return summary;
      }

      const critical = criticalRoles.has(user.role);
      const cadenceDays = critical ? 30 : 90;
      const overdueGraceDays = critical ? 7 : 14;
      const elapsedDays = (now - Date.parse(user.lastReviewedAt)) / (24 * 60 * 60 * 1000);

      if (critical) {
        summary.criticalRoles += 1;
      }

      if (critical && !user.mfaEnabled) {
        summary.mfaNonCompliant += 1;
      }

      if (elapsedDays >= cadenceDays) {
        summary.reviewDue += 1;
      }

      if (elapsedDays >= cadenceDays + overdueGraceDays) {
        summary.overdue += 1;
      }

      return summary;
    },
    {
      criticalRoles: 0,
      mfaNonCompliant: 0,
      reviewDue: 0,
      overdue: 0
    }
  );
}

export function filterAgendaEventsByWindow(
  events: AgendaEventRecord[],
  windowStartIso: string,
  windowEndIso: string
): AgendaEventRecord[] {
  const windowStart = Date.parse(windowStartIso);
  const windowEnd = Date.parse(windowEndIso);

  return [...events]
    .filter((event) => {
      const eventStart = Date.parse(event.startsAt);
      const eventEnd = Date.parse(event.endsAt);

      if (Number.isNaN(eventStart) || Number.isNaN(eventEnd)) {
        return false;
      }

      if (eventEnd <= eventStart) {
        return eventStart >= windowStart && eventStart < windowEnd;
      }

      return eventStart < windowEnd && windowStart < eventEnd;
    })
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt));
}

export function filterAgendaEventsByAsset(
  events: AgendaEventRecord[],
  assetId?: string
): AgendaEventRecord[] {
  if (!assetId) {
    return [...events];
  }

  return events.filter((event) => event.assetId === assetId);
}

export type DashboardMetricItem = {
  label: string;
  value: string;
};

export type DashboardAssetRow = {
  assetId: string;
  assetName: string;
  modalityLabel: string;
  eventCount: number;
  openTicketCount: number;
};

export type BacklogAgingBucket = {
  key: 'lt7' | 'd7to30' | 'd30to90' | 'gt90';
  label: string;
  count: number;
};

export type AssetAvailabilityRow = {
  assetId: string;
  assetName: string;
  modalityLabel: string;
  blockedDays: number;
  totalDays: number;
  availabilityPercentage: number;
};

export type AssetMaintenanceCostRow = {
  assetId: string;
  assetName: string;
  modalityLabel: string;
  totalCost: number;
  currency: string | null;
  mixedCurrencies: boolean;
};

type DashboardFleetAsset = {
  id: string;
  name: string;
  modality: AssetModality;
};

export type MaintenanceKanbanColumn = {
  key: MaintenanceKanbanSubstatus;
  status: MaintenanceStatus;
  label: string;
  phaseLabel: string;
  count: number;
  tickets: MaintenanceTicketRecord[];
};

export function buildDashboardOverview(input: {
  role: PortalRole;
  fleetAssets: DashboardFleetAsset[];
  maintenanceTickets: MaintenanceTicketRecord[];
  agendaEvents: AgendaEventRecord[];
}): {
  role: PortalRole;
  metricItems: DashboardMetricItem[];
} {
  const openTickets = input.maintenanceTickets.filter((ticket) =>
    ticket.status !== 'completed' && ticket.status !== 'cancelled'
  ).length;

  if (hasGlobalDashboardScope(input.role)) {
    return {
      role: input.role,
      metricItems: [
        { label: 'Ativos totais', value: String(input.fleetAssets.length) },
        { label: 'Eventos totais', value: String(input.agendaEvents.length) },
        { label: 'Chamados abertos', value: String(openTickets) }
      ]
    };
  }

  return {
    role: input.role,
    metricItems: [
      { label: 'Eventos no escopo', value: String(input.agendaEvents.length) },
      { label: 'Chamados abertos', value: String(openTickets) }
    ]
  };
}

export function buildDashboardVisibleAssets(input: {
  role: PortalRole;
  fleetAssets: DashboardFleetAsset[];
  assetIds: string[];
}): DashboardFleetAsset[] {
  if (hasGlobalDashboardScope(input.role)) {
    return input.fleetAssets;
  }

  const selectedAssetId = input.assetIds[0];

  if (!selectedAssetId) {
    return [];
  }

  return input.fleetAssets.filter((asset) => asset.id === selectedAssetId);
}

export function buildDashboardAssetRows(input: {
  fleetAssets: DashboardFleetAsset[];
  maintenanceTickets: MaintenanceTicketRecord[];
  agendaEvents: AgendaEventRecord[];
}): DashboardAssetRow[] {
  return input.fleetAssets.map((asset) => ({
    assetId: asset.id,
    assetName: asset.name,
    modalityLabel: assetModalityLabels[asset.modality],
    eventCount: input.agendaEvents.filter((event) => event.assetId === asset.id).length,
    openTicketCount: input.maintenanceTickets.filter(
      (ticket) =>
        ticket.assetId === asset.id &&
        ticket.status !== 'completed' &&
        ticket.status !== 'cancelled'
    ).length
  }));
}

export function buildMTTA(tickets: MaintenanceTicketRecord[]): number | null {
  const samples = tickets.flatMap((ticket) => {
    const openedAt = toValidTimestamp(ticket.openedAt);
    const inProgressAt = resolveFirstInProgressAt(ticket);

    if (openedAt === null || inProgressAt === null || inProgressAt <= openedAt) {
      return [];
    }

    return [(inProgressAt - openedAt) / (60 * 60 * 1000)];
  });

  return average(samples);
}

export function buildMTTR(tickets: MaintenanceTicketRecord[]): number | null {
  const samples = tickets
    .filter((ticket) => ticket.status !== 'cancelled')
    .flatMap((ticket) => {
      const openedAt = toValidTimestamp(ticket.openedAt);
      const completedAt = resolveCompletedAt(ticket);

      if (openedAt === null || completedAt === null || completedAt <= openedAt) {
        return [];
      }

      return [(completedAt - openedAt) / (60 * 60 * 1000)];
    });

  return average(samples);
}

export function buildBacklogAging(
  tickets: MaintenanceTicketRecord[],
  nowIso = new Date().toISOString()
): BacklogAgingBucket[] {
  const backlogTickets = tickets.filter(
    (ticket) => ticket.status !== 'completed' && ticket.status !== 'cancelled'
  );
  const now = toValidTimestamp(nowIso) ?? Date.now();
  const buckets: BacklogAgingBucket[] = [
    { key: 'lt7', label: '< 7 dias', count: 0 },
    { key: 'd7to30', label: '7-30 dias', count: 0 },
    { key: 'd30to90', label: '30-90 dias', count: 0 },
    { key: 'gt90', label: '> 90 dias', count: 0 }
  ];

  for (const ticket of backlogTickets) {
    const openedAt = toValidTimestamp(ticket.openedAt);

    if (openedAt === null) {
      continue;
    }

    const ageInDays = Math.floor((now - openedAt) / (24 * 60 * 60 * 1000));

    if (ageInDays < 7) {
      buckets[0].count += 1;
      continue;
    }

    if (ageInDays <= 30) {
      buckets[1].count += 1;
      continue;
    }

    if (ageInDays <= 90) {
      buckets[2].count += 1;
      continue;
    }

    buckets[3].count += 1;
  }

  return buckets;
}

export function buildAssetAvailability(
  assets: DashboardFleetAsset[],
  agendaEvents: AgendaEventRecord[],
  tickets: MaintenanceTicketRecord[],
  nowIso = new Date().toISOString()
): AssetAvailabilityRow[] {
  const todayStart = startOfUtcDay(nowIso) ?? startOfUtcDay(new Date().toISOString()) ?? new Date(0);
  const windowStart = shiftUtcDays(todayStart, -29);
  const windowEndExclusive = shiftUtcDays(todayStart, 1);

  const blockedDaysByAsset = new Map<string, Set<string>>();

  for (const event of agendaEvents) {
    if (event.type !== 'operational_block' && event.type !== 'emergency_maintenance') {
      continue;
    }

    addBlockedDays(
      blockedDaysByAsset,
      event.assetId,
      event.startsAt,
      event.endsAt,
      windowStart,
      windowEndExclusive
    );
  }

  for (const ticket of tickets) {
    if (ticket.category !== 'emergency' || ticket.status === 'cancelled') {
      continue;
    }

    const endedAt =
      resolveCompletedAt(ticket) ?? toValidTimestamp(nowIso) ?? windowEndExclusive.getTime();

    addBlockedDays(
      blockedDaysByAsset,
      ticket.assetId,
      ticket.openedAt,
      new Date(endedAt).toISOString(),
      windowStart,
      windowEndExclusive
    );
  }

  return assets.map((asset) => {
    const blockedDays = blockedDaysByAsset.get(asset.id)?.size ?? 0;
    const totalDays = 30;

    return {
      assetId: asset.id,
      assetName: asset.name,
      modalityLabel: assetModalityLabels[asset.modality],
      blockedDays,
      totalDays,
      availabilityPercentage: ((totalDays - blockedDays) / totalDays) * 100
    };
  });
}

export function buildMaintenanceCostByAsset(
  assets: DashboardFleetAsset[],
  maintenanceCosts: MaintenanceCostRecord[]
): AssetMaintenanceCostRow[] {
  return assets.map((asset) => {
    const assetCosts = maintenanceCosts.filter((cost) => cost.assetId === asset.id);
    const currencies = [...new Set(assetCosts.map((cost) => cost.currency))];

    return {
      assetId: asset.id,
      assetName: asset.name,
      modalityLabel: assetModalityLabels[asset.modality],
      totalCost: assetCosts.reduce((sum, cost) => sum + cost.amount, 0),
      currency: currencies.length === 1 ? currencies[0] : null,
      mixedCurrencies: currencies.length > 1
    };
  });
}

export function buildMaintenanceKanbanColumns(
  tickets: MaintenanceTicketRecord[],
  substatusOverrides: Partial<Record<string, MaintenanceKanbanSubstatus>> = {}
): MaintenanceKanbanColumn[] {
  return maintenanceKanbanSubstatusDefinitions.map((definition) => {
    const groupedTickets = tickets.filter((ticket) => {
      const substatus = resolveMaintenanceKanbanSubstatus(
        ticket,
        substatusOverrides[ticket.id]
      );

      return substatus === definition.key;
    });

    return {
      key: definition.key,
      status: definition.status,
      label: definition.label,
      phaseLabel: definition.phaseLabel,
      count: groupedTickets.length,
      tickets: groupedTickets.map((ticket) => ({
        ...ticket,
        kanbanSubstatus: resolveMaintenanceKanbanSubstatus(
          ticket,
          substatusOverrides[ticket.id]
        )
      }))
    };
  });
}

export function buildDashboardMetrics(input: {
  activeAssets: number;
  tickets: MaintenanceTicketRecord[];
  agendaEvents: AgendaEventRecord[];
  accessUsers: AccessUserRecord[];
  nowIso: string;
}): {
  activeAssets: number;
  openTickets: number;
  frozenTickets: number;
  agendaConflicts: number;
  accessReviewsDue: number;
} {
  return {
    activeAssets: input.activeAssets,
    openTickets: input.tickets.filter((ticket) => !['completed', 'cancelled'].includes(ticket.status))
      .length,
    frozenTickets: input.tickets.filter((ticket) => ticket.status === 'frozen').length,
    agendaConflicts: buildAgendaConflictQueue(input.agendaEvents).length,
    accessReviewsDue: buildAccessReviewSummary(input.accessUsers, input.nowIso).reviewDue
  };
}

export function isCriticalRole(role: PortalRole): boolean {
  return criticalRoles.has(role);
}

export function hasGlobalDashboardScope(role: PortalRole): boolean {
  return globalDashboardRoles.has(role);
}

export function canViewAccessModule(role: PortalRole): boolean {
  return accessModuleViewerRoles.has(role);
}

export function canManageAccessModule(role: PortalRole): boolean {
  return accessModuleManagerRoles.has(role);
}

export function resolveMaintenanceKanbanSubstatus(
  ticket: MaintenanceTicketRecord,
  override?: MaintenanceKanbanSubstatus
): MaintenanceKanbanSubstatus {
  if (override && isMaintenanceKanbanSubstatusCompatible(override, ticket.status)) {
    return override;
  }

  if (
    ticket.kanbanSubstatus &&
    isMaintenanceKanbanSubstatusCompatible(ticket.kanbanSubstatus, ticket.status)
  ) {
    return ticket.kanbanSubstatus;
  }

  switch (ticket.status) {
    case 'pending':
      return 'call_opening';
    case 'reopened':
      return 'ticket_qualification';
    case 'frozen':
      return 'accounts_freeze';
    case 'payment':
      return 'payment_request';
    case 'completed':
      return 'closed_files';
    case 'cancelled':
      return 'cancelled';
    case 'in_progress':
      return 'ticket_qualification';
  }
}

export function isMaintenanceKanbanSubstatusCompatible(
  substatus: MaintenanceKanbanSubstatus,
  status: MaintenanceStatus
) {
  const definition = maintenanceKanbanSubstatusDefinitions.find((item) => item.key === substatus);

  if (!definition) {
    return false;
  }

  if (status === 'reopened') {
    return definition.status === 'in_progress';
  }

  return definition.status === status;
}

export function formatDateLabel(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function overlaps(
  leftStart: string,
  leftEnd: string,
  rightStart: string,
  rightEnd: string
): boolean {
  return Date.parse(leftStart) < Date.parse(rightEnd) && Date.parse(rightStart) < Date.parse(leftEnd);
}

function resolveConflictRisk(
  left: AgendaEventRecord,
  right: AgendaEventRecord
): 'critical' | 'warning' {
  const types = new Set<AgendaEventType>([left.type, right.type]);

  if (
    types.has('emergency_maintenance') ||
    (types.has('operational_block') && (left.provisional || right.provisional))
  ) {
    return 'critical';
  }

  return 'warning';
}

function minIso(left: string, right: string): string {
  return left < right ? left : right;
}

function maxIso(left: string, right: string): string {
  return left > right ? left : right;
}

function toTimeLabel(value: string): string {
  return value.slice(11, 16);
}

function resolveFirstInProgressAt(ticket: MaintenanceTicketRecord): number | null {
  const explicitTimestamp = toValidTimestamp(ticket.firstInProgressAt);

  if (explicitTimestamp !== null) {
    return explicitTimestamp;
  }

  const inProgressTransition = ticket.statusHistory?.find(
    (entry) =>
      entry.toStatus === 'in_progress' &&
      (entry.fromStatus === 'pending' || entry.fromStatus === 'reopened' || entry.fromStatus == null)
  );

  return toValidTimestamp(inProgressTransition?.at);
}

function resolveCompletedAt(ticket: MaintenanceTicketRecord): number | null {
  const explicitTimestamp = toValidTimestamp(ticket.completedAt);

  if (explicitTimestamp !== null) {
    return explicitTimestamp;
  }

  const completedTransition = ticket.statusHistory
    ?.filter((entry) => entry.toStatus === 'completed')
    .sort((left, right) => left.at.localeCompare(right.at))[0];
  const transitionTimestamp = toValidTimestamp(completedTransition?.at);

  if (transitionTimestamp !== null) {
    return transitionTimestamp;
  }

  if (ticket.status === 'completed') {
    return toValidTimestamp(ticket.updatedAt);
  }

  return null;
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function toValidTimestamp(value?: string | null): number | null {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function startOfUtcDay(value: string): Date | null {
  const timestamp = toValidTimestamp(value);

  if (timestamp === null) {
    return null;
  }

  const date = new Date(timestamp);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function shiftUtcDays(value: Date, days: number): Date {
  const shifted = new Date(value.getTime());
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted;
}

function addBlockedDays(
  blockedDaysByAsset: Map<string, Set<string>>,
  assetId: string,
  startIso: string,
  endIso: string,
  windowStart: Date,
  windowEndExclusive: Date
) {
  const start = toValidTimestamp(startIso);
  const end = toValidTimestamp(endIso);

  if (start === null || end === null) {
    return;
  }

  const effectiveStart = Math.max(start, windowStart.getTime());
  const effectiveEnd = Math.min(end, windowEndExclusive.getTime());

  if (effectiveEnd <= effectiveStart) {
    return;
  }

  const dayKeys = blockedDaysByAsset.get(assetId) ?? new Set<string>();
  let cursor = startOfUtcDay(new Date(effectiveStart).toISOString());

  while (cursor && cursor.getTime() < effectiveEnd) {
    dayKeys.add(cursor.toISOString().slice(0, 10));
    cursor = shiftUtcDays(cursor, 1);
  }

  blockedDaysByAsset.set(assetId, dayKeys);
}

// ─── Aviation ────────────────────────────────────────────────────────────────

export type AviationStatus =
  | 'pending'
  | 'in_progress'
  | 'grounded'
  | 'return_check'
  | 'returned'
  | 'cancelled'
  | 'reopened';

export type AviationCategory =
  | 'preventive'
  | 'corrective'
  | 'emergency'
  | 'inspection'
  | 'airworthiness';

export type AviationPriority = 'P1' | 'P2' | 'P3' | 'P4';

export type AviationKanbanSubstatus =
  | 'report_open'
  | 'report_qualification'
  | 'technical_assessment'
  | 'action_plan'
  | 'service_execution'
  | 'post_service_check'
  | 'aog_hold'
  | 'return_authorization'
  | 'returned_to_service'
  | 'cancelled';

export type AviationReportRecord = {
  id: string;
  reportNumber: string;
  assetId: string;
  assetName: string;
  title: string;
  category: AviationCategory;
  priority: AviationPriority;
  aircraftSystem?: string;
  status: AviationStatus;
  openedBy?: string;
  openedAt: string;
  updatedAt?: string;
  groundCount: number;
  groundReason?: string;
  returnToServiceEta?: string;
  kanbanSubstatus?: AviationKanbanSubstatus;
};

export type AviationKanbanColumn = {
  key: AviationKanbanSubstatus;
  label: string;
  phaseLabel: string;
  status: AviationStatus;
  tickets: AviationReportRecord[];
  count: number;
};

type AviationKanbanSubstatusDefinition = {
  key: AviationKanbanSubstatus;
  label: string;
  status: AviationStatus;
  phaseLabel: string;
};

export const aviationStatusLabels: Record<AviationStatus, string> = {
  pending: 'Reporte aberto',
  in_progress: 'Em andamento',
  grounded: 'Bloqueada (AOG)',
  return_check: 'Verificação de retorno',
  returned: 'Retornada',
  cancelled: 'Cancelado',
  reopened: 'Reaberto'
};

export const aviationCategoryLabels: Record<AviationCategory, string> = {
  preventive: 'Preventiva',
  corrective: 'Corretiva',
  emergency: 'Emergência / AOG',
  inspection: 'Inspeção',
  airworthiness: 'Aeronavegabilidade'
};

export const aviationKanbanSubstatusDefinitions: AviationKanbanSubstatusDefinition[] = [
  { key: 'report_open', label: 'Reporte aberto', status: 'pending', phaseLabel: 'Reporte' },
  { key: 'report_qualification', label: 'Qualificação do reporte', status: 'in_progress', phaseLabel: 'Em andamento' },
  { key: 'technical_assessment', label: 'Avaliação técnica', status: 'in_progress', phaseLabel: 'Em andamento' },
  { key: 'action_plan', label: 'Plano de ação', status: 'in_progress', phaseLabel: 'Em andamento' },
  { key: 'service_execution', label: 'Execução do serviço', status: 'in_progress', phaseLabel: 'Em andamento' },
  { key: 'post_service_check', label: 'Inspeção pós-serviço', status: 'in_progress', phaseLabel: 'Em andamento' },
  { key: 'aog_hold', label: 'AOG / Bloqueio operacional', status: 'grounded', phaseLabel: 'Bloqueada' },
  { key: 'return_authorization', label: 'Autorização de retorno', status: 'return_check', phaseLabel: 'Verificação' },
  { key: 'returned_to_service', label: 'Retornada ao serviço', status: 'returned', phaseLabel: 'Retornada' },
  { key: 'cancelled', label: 'Cancelado', status: 'cancelled', phaseLabel: 'Cancelado' }
];

export function buildAviationKanbanColumns(
  reports: AviationReportRecord[],
  overrides: Partial<Record<string, AviationKanbanSubstatus>> = {}
): AviationKanbanColumn[] {
  const columns: AviationKanbanColumn[] = aviationKanbanSubstatusDefinitions.map((def) => ({
    key: def.key,
    label: def.label,
    phaseLabel: def.phaseLabel,
    status: def.status,
    tickets: [],
    count: 0
  }));

  for (const report of reports) {
    const effectiveSubstatus =
      overrides[report.id] ?? report.kanbanSubstatus ?? resolveAviationDefaultKanbanSubstatus(report.status);
    const column = columns.find((c) => c.key === effectiveSubstatus);
    if (column) {
      column.tickets.push(report);
      column.count++;
    }
  }

  return columns;
}

function resolveAviationDefaultKanbanSubstatus(status: AviationStatus): AviationKanbanSubstatus {
  const map: Record<AviationStatus, AviationKanbanSubstatus> = {
    pending: 'report_open',
    in_progress: 'report_qualification',
    grounded: 'aog_hold',
    return_check: 'return_authorization',
    returned: 'returned_to_service',
    cancelled: 'cancelled',
    reopened: 'report_qualification'
  };
  return map[status];
}

export function isAviationKanbanSubstatusCompatible(
  substatus: AviationKanbanSubstatus,
  status: AviationStatus
): boolean {
  const def = aviationKanbanSubstatusDefinitions.find((d) => d.key === substatus);
  if (!def) return false;
  const compatibleStatus = status === 'reopened' ? 'in_progress' : status;
  return def.status === compatibleStatus;
}

export function canViewAviationModule(role: PortalRole): boolean {
  return ['portal_admin', 'central_operations', 'aviation_operations', 'aviation_technical_coordination'].includes(role);
}
