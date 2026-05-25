import { describe, expect, it } from 'vitest';

import {
  buildAssetAvailability,
  buildAccessReviewSummary,
  buildAgendaConflictQueue,
  buildBacklogAging,
  buildDashboardAssetRows,
  buildDashboardMetrics,
  buildDashboardOverview,
  buildDashboardVisibleAssets,
  buildMaintenanceCostByAsset,
  buildMaintenanceKanbanColumns,
  buildMaintenanceStatusSummary,
  buildMTTA,
  buildMTTR,
  filterAgendaEventsByAsset,
  filterAgendaEventsByWindow,
  resolveMaintenanceKanbanSubstatus,
  type AccessUserRecord,
  type AgendaEventRecord,
  type MaintenanceCostRecord,
  type MaintenanceTicketRecord
} from '../lib/portal-model';

describe('portal-model', () => {
  it('builds maintenance status counts in the official lifecycle order', () => {
    const tickets: MaintenanceTicketRecord[] = [
      createTicket('pending'),
      createTicket('in_progress'),
      createTicket('in_progress'),
      createTicket('payment'),
      createTicket('completed')
    ];

    expect(buildMaintenanceStatusSummary(tickets)).toEqual([
      { status: 'pending', label: 'Pendente', count: 1 },
      { status: 'in_progress', label: 'Em andamento', count: 2 },
      { status: 'frozen', label: 'Congelado', count: 0 },
      { status: 'payment', label: 'Pagamento', count: 1 },
      { status: 'completed', label: 'Concluído', count: 1 },
      { status: 'cancelled', label: 'Cancelado', count: 0 },
      { status: 'reopened', label: 'Reaberto', count: 0 }
    ]);
  });

  it('detects overlapping agenda events for the same asset and ranks critical conflicts first', () => {
    const events: AgendaEventRecord[] = [
      {
        id: 'event-1',
        assetId: 'asset-1',
        assetName: 'Yacht Aurora',
        type: 'utilization',
        title: 'Uso cliente owner A',
        owner: 'Central Operations',
        startsAt: '2026-05-14T09:00:00.000Z',
        endsAt: '2026-05-14T12:00:00.000Z'
      },
      {
        id: 'event-2',
        assetId: 'asset-1',
        assetName: 'Yacht Aurora',
        type: 'emergency_maintenance',
        title: 'Reparo emergencial de propulsão',
        owner: 'Technical Coordination',
        startsAt: '2026-05-14T10:00:00.000Z',
        endsAt: '2026-05-14T13:30:00.000Z'
      },
      {
        id: 'event-3',
        assetId: 'asset-2',
        assetName: 'Yacht Boreal',
        type: 'planned_maintenance',
        title: 'Inspeção trimestral',
        owner: 'Field Team',
        startsAt: '2026-05-14T09:00:00.000Z',
        endsAt: '2026-05-14T11:00:00.000Z'
      }
    ];

    expect(buildAgendaConflictQueue(events)).toEqual([
      {
        id: 'event-1:event-2',
        assetId: 'asset-1',
        assetName: 'Yacht Aurora',
        title: 'Uso cliente owner A',
        conflictingTitle: 'Reparo emergencial de propulsão',
        risk: 'critical',
        owner: 'Central Operations',
        windowLabel: '09:00-13:30'
      }
    ]);
  });

  it('flags access reviews due using monthly cadence for critical roles and quarterly cadence for non-critical roles', () => {
    const users: AccessUserRecord[] = [
      createUser('portal_admin', '2026-04-01T10:00:00.000Z'),
      createUser('central_operations', '2026-03-01T10:00:00.000Z'),
      createUser('asset_field_team', '2026-02-01T10:00:00.000Z')
    ];

    expect(buildAccessReviewSummary(users, '2026-05-14T10:00:00.000Z')).toEqual({
      criticalRoles: 2,
      mfaNonCompliant: 0,
      reviewDue: 3,
      overdue: 2
    });
  });

  it('ignores revoked users when summarizing active access governance workload', () => {
    const users: AccessUserRecord[] = [
      createUser('central_operations', '2026-03-01T10:00:00.000Z'),
      {
        ...createUser('asset_field_team', '2026-02-01T10:00:00.000Z'),
        id: 'user-revoked',
        status: 'revoked',
        mfaEnabled: false
      }
    ];

    expect(buildAccessReviewSummary(users, '2026-05-14T10:00:00.000Z')).toEqual({
      criticalRoles: 1,
      mfaNonCompliant: 0,
      reviewDue: 1,
      overdue: 1
    });
  });

  it('filters agenda events to the operational window before rendering the day board or conflict queue', () => {
    const events: AgendaEventRecord[] = [
      {
        id: 'event-before',
        assetId: 'asset-1',
        assetName: 'Yacht Aurora',
        type: 'planned_maintenance',
        title: 'Historic maintenance',
        owner: 'Field Team',
        startsAt: '2026-05-13T09:00:00.000Z',
        endsAt: '2026-05-13T11:00:00.000Z'
      },
      {
        id: 'event-current',
        assetId: 'asset-1',
        assetName: 'Yacht Aurora',
        type: 'utilization',
        title: 'Current utilization',
        owner: 'Central Operations',
        startsAt: '2026-05-14T10:00:00.000Z',
        endsAt: '2026-05-14T13:00:00.000Z'
      },
      {
        id: 'event-crossing',
        assetId: 'asset-2',
        assetName: 'Yacht Boreal',
        type: 'crew_rest',
        title: 'Crew rest crossing midnight',
        owner: 'Central Operations',
        startsAt: '2026-05-14T23:30:00.000Z',
        endsAt: '2026-05-15T02:30:00.000Z'
      },
      {
        id: 'event-zero',
        assetId: 'asset-3',
        assetName: 'Yacht Cobalt',
        type: 'crew_rest',
        title: 'Point-in-time rest note',
        owner: 'Central Operations',
        startsAt: '2026-05-14T11:57:00.000Z',
        endsAt: '2026-05-14T11:57:00.000Z'
      }
    ];

    expect(
      filterAgendaEventsByWindow(
        events,
        '2026-05-14T00:00:00.000Z',
        '2026-05-15T00:00:00.000Z'
      ).map((event) => event.id)
    ).toEqual(['event-current', 'event-zero', 'event-crossing']);
  });

  it('filters agenda events by asset before rendering a scoped agenda view', () => {
    const events: AgendaEventRecord[] = [
      {
        id: 'event-1',
        assetId: 'asset-1',
        assetName: 'Yacht Aurora',
        type: 'planned_maintenance',
        title: 'Maintenance for Aurora',
        owner: 'Field Team',
        startsAt: '2026-05-14T09:00:00.000Z',
        endsAt: '2026-05-14T11:00:00.000Z'
      },
      {
        id: 'event-2',
        assetId: 'asset-2',
        assetName: 'Yacht Boreal',
        type: 'utilization',
        title: 'Use for Boreal',
        owner: 'Central Operations',
        startsAt: '2026-05-14T12:00:00.000Z',
        endsAt: '2026-05-14T13:00:00.000Z'
      }
    ];

    expect(filterAgendaEventsByAsset(events, 'asset-2').map((event) => event.id)).toEqual([
      'event-2'
    ]);
    expect(filterAgendaEventsByAsset(events).map((event) => event.id)).toEqual([
      'event-1',
      'event-2'
    ]);
  });

  it('builds the admin dashboard overview with consolidated asset, event and ticket counts', () => {
    expect(
      buildDashboardOverview({
        role: 'portal_admin',
        fleetAssets: [createAsset('asset-1'), createAsset('asset-2')],
        maintenanceTickets: [
          createTicket('pending'),
          createTicket('completed'),
          {
            ...createTicket('in_progress'),
            id: 'ticket-asset-2',
            assetId: 'asset-2',
            assetName: 'Yacht Boreal'
          }
        ],
        agendaEvents: [
          createEvent('event-1', 'asset-1', 'Yacht Aurora'),
          createEvent('event-2', 'asset-1', 'Yacht Aurora'),
          createEvent('event-3', 'asset-2', 'Yacht Boreal')
        ]
      })
    ).toEqual({
      role: 'portal_admin',
      metricItems: [
        { label: 'Ativos totais', value: '2' },
        { label: 'Eventos totais', value: '3' },
        { label: 'Chamados abertos', value: '2' }
      ]
    });
  });

  it('builds the operações yachts dashboard overview with general indicators', () => {
    expect(
      buildDashboardOverview({
        role: 'yachts_operations',
        fleetAssets: [createAsset('asset-1'), createAsset('asset-2')],
        maintenanceTickets: [createTicket('pending')],
        agendaEvents: [createEvent('event-1', 'asset-1', 'Yacht Aurora')]
      })
    ).toEqual({
      role: 'yachts_operations',
      metricItems: [
        { label: 'Ativos totais', value: '2' },
        { label: 'Eventos totais', value: '1' },
        { label: 'Chamados abertos', value: '1' }
      ]
    });
  });

  it('builds the field-team dashboard overview without the asset metric card and scopes assets to the assigned vessel', () => {
    expect(
      buildDashboardOverview({
        role: 'asset_field_team',
        fleetAssets: [createAsset('asset-1')],
        maintenanceTickets: [createTicket('pending')],
        agendaEvents: [createEvent('event-1', 'asset-1', 'Yacht Aurora')]
      })
    ).toEqual({
      role: 'asset_field_team',
      metricItems: [
        { label: 'Eventos no escopo', value: '1' },
        { label: 'Chamados abertos', value: '1' }
      ]
    });

    expect(
      buildDashboardVisibleAssets({
        role: 'asset_field_team',
        assetIds: ['asset-1'],
        fleetAssets: [createAsset('asset-1'), createAsset('asset-2')]
      }).map((asset) => asset.id)
    ).toEqual(['asset-1']);

    expect(
      buildDashboardVisibleAssets({
        role: 'asset_field_team',
        assetIds: [],
        fleetAssets: [createAsset('asset-1')]
      })
    ).toEqual([]);
  });

  it('keeps the access edit modal limited to the three supported roles', () => {
    const labels = [
      'Operações Centrais',
      'Operações - Yachts',
      'Equipe de campo - Embarcações'
    ];

    expect(labels).toHaveLength(3);
    expect(new Set(labels).size).toBe(3);
  });

  it('builds asset rows for the dashboard with event and open-ticket counts per asset', () => {
    expect(
      buildDashboardAssetRows({
        fleetAssets: [
          createAsset('asset-1', 'yachts'),
          createAsset('asset-2', 'aviation'),
          createAsset('asset-3', 'real_estate'),
          createAsset('asset-4', 'cars')
        ],
        maintenanceTickets: [
          createTicket('pending'),
          createTicket('completed'),
          {
            ...createTicket('in_progress'),
            id: 'ticket-asset-2',
            assetId: 'asset-2',
            assetName: 'Yacht Boreal'
          },
          {
            ...createTicket('pending'),
            id: 'ticket-asset-3',
            assetId: 'asset-3',
            assetName: 'Residencial Atlântico'
          }
        ],
        agendaEvents: [
          createEvent('event-1', 'asset-1', 'Yacht Aurora'),
          createEvent('event-2', 'asset-1', 'Yacht Aurora'),
          createEvent('event-3', 'asset-2', 'Yacht Boreal'),
          createEvent('event-4', 'asset-4', 'Sedan Meridian')
        ]
      })
    ).toEqual([
      {
        assetId: 'asset-1',
        assetName: 'Yacht Aurora',
        modalityLabel: 'Yachts',
        eventCount: 2,
        openTicketCount: 1
      },
      {
        assetId: 'asset-2',
        assetName: 'Yacht Boreal',
        modalityLabel: 'Aviação',
        eventCount: 1,
        openTicketCount: 1
      },
      {
        assetId: 'asset-3',
        assetName: 'Residencial Atlântico',
        modalityLabel: 'Imóveis',
        eventCount: 0,
        openTicketCount: 1
      },
      {
        assetId: 'asset-4',
        assetName: 'Sedan Meridian',
        modalityLabel: 'Carros',
        eventCount: 1,
        openTicketCount: 0
      }
    ]);
  });

  it('returns null MTTA when the tickets do not expose a usable first in-progress transition', () => {
    expect(
      buildMTTA([
        createTicket('pending'),
        {
          ...createTicket('in_progress'),
          id: 'ticket-no-history',
          updatedAt: '2026-05-14T14:00:00.000Z'
        }
      ])
    ).toBeNull();
  });

  it('calculates MTTA from the first persisted transition into in progress', () => {
    expect(
      buildMTTA([
        {
          ...createTicket('in_progress'),
          id: 'ticket-with-history',
          openedAt: '2026-05-14T08:00:00.000Z',
          firstInProgressAt: '2026-05-14T11:30:00.000Z'
        },
        {
          ...createTicket('payment'),
          id: 'ticket-with-timeline',
          openedAt: '2026-05-14T09:00:00.000Z',
          statusHistory: [
            {
              fromStatus: 'pending',
              toStatus: 'in_progress',
              at: '2026-05-14T12:00:00.000Z'
            }
          ]
        }
      ])
    ).toBe(3.25);
  });

  it('calculates MTTR using completedAt when available and updatedAt as the completion fallback', () => {
    expect(
      buildMTTR([
        {
          ...createTicket('completed'),
          id: 'ticket-completed-at',
          openedAt: '2026-05-14T08:00:00.000Z',
          completedAt: '2026-05-14T16:00:00.000Z'
        },
        {
          ...createTicket('completed'),
          id: 'ticket-updated-at',
          openedAt: '2026-05-14T09:00:00.000Z',
          updatedAt: '2026-05-14T15:00:00.000Z'
        },
        {
          ...createTicket('cancelled'),
          id: 'ticket-cancelled',
          openedAt: '2026-05-14T08:00:00.000Z',
          updatedAt: '2026-05-14T18:00:00.000Z'
        }
      ])
    ).toBe(7);
  });

  it('builds backlog aging buckets only for non-completed and non-cancelled tickets', () => {
    expect(
      buildBacklogAging(
        [
          {
            ...createTicket('pending'),
            id: 'backlog-1',
            openedAt: '2026-05-18T09:00:00.000Z'
          },
          {
            ...createTicket('in_progress'),
            id: 'backlog-2',
            openedAt: '2026-05-10T09:00:00.000Z'
          },
          {
            ...createTicket('payment'),
            id: 'backlog-3',
            openedAt: '2026-04-10T09:00:00.000Z'
          },
          {
            ...createTicket('reopened'),
            id: 'backlog-4',
            openedAt: '2025-12-31T09:00:00.000Z'
          },
          {
            ...createTicket('completed'),
            id: 'done-ticket',
            openedAt: '2026-01-10T09:00:00.000Z'
          }
        ],
        '2026-05-20T09:00:00.000Z'
      )
    ).toEqual([
      { key: 'lt7', label: '< 7 dias', count: 1 },
      { key: 'd7to30', label: '7-30 dias', count: 1 },
      { key: 'd30to90', label: '30-90 dias', count: 1 },
      { key: 'gt90', label: '> 90 dias', count: 1 }
    ]);
  });

  it('calculates asset availability from blocked windows and open emergency tickets over the last 30 days', () => {
    expect(
      buildAssetAvailability(
        [createAsset('asset-1'), createAsset('asset-2')],
        [
          {
            ...createEvent('block-1', 'asset-1', 'Yacht Aurora'),
            type: 'operational_block',
            startsAt: '2026-05-18T09:00:00.000Z',
            endsAt: '2026-05-19T10:00:00.000Z'
          },
          {
            ...createEvent('block-2', 'asset-2', 'Yacht Boreal'),
            type: 'emergency_maintenance',
            startsAt: '2026-05-01T09:00:00.000Z',
            endsAt: '2026-05-03T10:00:00.000Z'
          }
        ],
        [
          {
            ...createTicket('in_progress'),
            id: 'emergency-open-ticket',
            assetId: 'asset-1',
            assetName: 'Yacht Aurora',
            category: 'emergency',
            openedAt: '2026-05-20T08:00:00.000Z'
          }
        ],
        '2026-05-20T12:00:00.000Z'
      )
    ).toEqual([
      {
        assetId: 'asset-1',
        assetName: 'Yacht Aurora',
        modalityLabel: 'Yachts',
        blockedDays: 3,
        totalDays: 30,
        availabilityPercentage: 90
      },
      {
        assetId: 'asset-2',
        assetName: 'Yacht Boreal',
        modalityLabel: 'Yachts',
        blockedDays: 3,
        totalDays: 30,
        availabilityPercentage: 90
      }
    ]);
  });

  it('aggregates maintenance cost per asset and flags mixed currencies', () => {
    const costs: MaintenanceCostRecord[] = [
      {
        id: 'cost-1',
        assetId: 'asset-1',
        ticketId: 'ticket-1',
        description: 'Labor',
        amount: 1200,
        currency: 'BRL',
        registeredAt: '2026-05-14T10:00:00.000Z'
      },
      {
        id: 'cost-2',
        assetId: 'asset-1',
        ticketId: 'ticket-2',
        description: 'Parts',
        amount: 800,
        currency: 'BRL',
        registeredAt: '2026-05-14T11:00:00.000Z'
      },
      {
        id: 'cost-3',
        assetId: 'asset-2',
        ticketId: 'ticket-3',
        description: 'Supplier invoice',
        amount: 300,
        currency: 'USD',
        registeredAt: '2026-05-14T12:00:00.000Z'
      },
      {
        id: 'cost-4',
        assetId: 'asset-2',
        ticketId: 'ticket-4',
        description: 'Domestic fee',
        amount: 200,
        currency: 'BRL',
        registeredAt: '2026-05-14T13:00:00.000Z'
      }
    ];

    expect(buildMaintenanceCostByAsset([createAsset('asset-1'), createAsset('asset-2')], costs)).toEqual([
      {
        assetId: 'asset-1',
        assetName: 'Yacht Aurora',
        modalityLabel: 'Yachts',
        totalCost: 2000,
        currency: 'BRL',
        mixedCurrencies: false
      },
      {
        assetId: 'asset-2',
        assetName: 'Yacht Boreal',
        modalityLabel: 'Yachts',
        totalCost: 500,
        currency: null,
        mixedCurrencies: true
      }
    ]);
  });

  it('uses the provided nowIso when calculating dashboard access reviews due', () => {
    expect(
      buildDashboardMetrics({
        activeAssets: 4,
        tickets: [createTicket('pending'), createTicket('frozen'), createTicket('completed')],
        agendaEvents: [],
        accessUsers: [createUser('central_operations', '2026-04-01T10:00:00.000Z')],
        nowIso: '2026-04-25T10:00:00.000Z'
      })
    ).toEqual({
      activeAssets: 4,
      openTickets: 2,
      frozenTickets: 1,
      agendaConflicts: 0,
      accessReviewsDue: 0
    });
  });

  it('builds maintenance kanban columns by substatus and keeps the official lifecycle order', () => {
    const columns = buildMaintenanceKanbanColumns([
      createTicket('payment'),
      createTicket('pending'),
      createTicket('in_progress'),
      {
        ...createTicket('pending'),
        id: 'ticket-pending-2',
        title: 'Segundo pendente'
      }
    ]);

    expect(columns.map((column) => column.key)).toEqual([
      'call_opening',
      'ticket_qualification',
      'onsite_diagnosis',
      'preliminary_quote',
      'absorption_strategy',
      'date_scheduling',
      'technical_approval',
      'budget_allocation',
      'service_preparation',
      'service_execution',
      'complementary_quote',
      'quality_control',
      'accounts_freeze',
      'payment_request',
      'payment_scheduling',
      'payment_receipt',
      'closed_files',
      'cancelled'
    ]);

    expect(columns.find((column) => column.key === 'call_opening')).toEqual(
      expect.objectContaining({
        status: 'pending',
        label: 'Abertura do chamado',
        count: 2
      })
    );

    expect(columns.find((column) => column.key === 'service_execution')).toEqual(
      expect.objectContaining({
        status: 'in_progress',
        label: 'Realização do serviço',
        count: 1
      })
    );

    expect(columns.find((column) => column.key === 'payment_request')).toEqual(
      expect.objectContaining({
        status: 'payment',
        label: 'Solicitação de pagamento',
        count: 1
      })
    );
  });
});

it('falls back to the phase default when the persisted substatus is missing or incompatible', () => {
  expect(
    resolveMaintenanceKanbanSubstatus({
      ...createTicket('in_progress'),
      kanbanSubstatus: 'payment_request'
    })
  ).toBe('ticket_qualification');

  expect(resolveMaintenanceKanbanSubstatus(createTicket('payment'))).toBe('payment_request');
});

function createTicket(status: MaintenanceTicketRecord['status']): MaintenanceTicketRecord {
  const kanbanSubstatusByStatus: Record<
    MaintenanceTicketRecord['status'],
    MaintenanceTicketRecord['kanbanSubstatus']
  > = {
    pending: 'call_opening',
    in_progress: 'service_execution',
    frozen: 'accounts_freeze',
    payment: 'payment_request',
    completed: 'closed_files',
    cancelled: 'cancelled',
    reopened: 'ticket_qualification'
  };

  return {
    id: `ticket-${status}`,
    ticketNumber: `CH-${status}`,
    assetId: 'asset-1',
    assetName: 'Yacht Aurora',
    title: `Ticket ${status}`,
    category: 'inspection',
    priority: 'P2',
    status,
    owner: 'Central Operations',
    openedAt: '2026-05-14T09:00:00.000Z',
    frozenCount: 0,
    thirdParty: false,
    kanbanSubstatus: kanbanSubstatusByStatus[status],
    evidenceCompleteness: 0.4,
    slaProgress: 0.4
  };
}

function createAsset(
  id: string,
  modality: 'yachts' | 'aviation' | 'real_estate' | 'cars' = 'yachts'
) {
  return {
    id,
    name:
      id === 'asset-1'
        ? 'Yacht Aurora'
        : id === 'asset-2'
          ? 'Yacht Boreal'
          : id === 'asset-3'
            ? 'Residencial Atlântico'
            : 'Sedan Meridian',
    modality,
    status: 'available',
    location: 'Angra dos Reis',
    nextWindow: 'Livre'
  };
}

function createEvent(id: string, assetId: string, assetName: string): AgendaEventRecord {
  return {
    id,
    assetId,
    assetName,
    type: 'utilization',
    title: `Evento ${id}`,
    owner: 'Central Operations',
    startsAt: '2026-05-14T10:00:00.000Z',
    endsAt: '2026-05-14T12:00:00.000Z'
  };
}

function createUser(
  role: AccessUserRecord['role'],
  lastReviewedAt: string
): AccessUserRecord {
  return {
    id: `user-${role}`,
    displayName: `User ${role}`,
    email: `${role}@example.com`,
    role,
    assetScopes: ['asset-1'],
    mfaEnabled: true,
    status: 'active',
    lastReviewedAt
  };
}
