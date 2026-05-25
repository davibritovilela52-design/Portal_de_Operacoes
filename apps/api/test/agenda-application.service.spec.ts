import { describe, expect, it } from 'vitest';

import { AccessPolicyService } from '../src/modules/access/access-policy.service.js';
import { AgendaApplicationService } from '../src/modules/agenda/agenda-application.service.js';
import {
  AgendaEvent,
  AgendaSchedulingService
} from '../src/modules/agenda/agenda-scheduling.service.js';
import { AuditDecisionMemo } from '../src/modules/audit/audit-governance.service.js';
import { ObservabilityEventLogService } from '../src/modules/observability/observability-event-log.service.js';
import { ObservabilityMetricsService } from '../src/modules/observability/observability-metrics.service.js';

describe('AgendaApplicationService', () => {
  const createdRecords: Array<{ tenantId: string; event: AgendaEvent }> = [];
  const updatedRecords: Array<{ tenantId: string; eventId: string; event: AgendaEvent }> = [];
  const deletedRecords: Array<{ tenantId: string; eventId: string }> = [];
  const decisionMemos: Array<{
    tenantId: string;
    action: string;
    aggregateType: string;
    aggregateId: string;
    assetId?: string;
    memo: AuditDecisionMemo;
  }> = [];
  const buildPersistedEvent = (event: AgendaEvent, tenantId = 'tenant-a') => ({
    id: event.id ?? 'event-generated',
    tenantId,
    assetId: event.assetId,
    type: event.type,
    title: event.title ?? null,
    description: event.description ?? null,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    safeMinimumBreached: event.safeMinimumBreached ?? false,
    provisional: event.provisional ?? false,
    validatedAt: event.validatedAt ?? null,
    createdAt: new Date('2026-05-13T14:01:00.000Z'),
    updatedAt: new Date('2026-05-13T14:01:00.000Z')
  });
  const storedEvents = new Map<string, ReturnType<typeof buildPersistedEvent>>();
  const seedStoredEvents = (...events: AgendaEvent[]) => {
    storedEvents.clear();

    for (const event of events) {
      const persisted = buildPersistedEvent(event);
      storedEvents.set(persisted.id, persisted);
    }
  };
  const service = new (
    AgendaApplicationService as unknown as new (...args: any[]) => AgendaApplicationService
  )(
    new AccessPolicyService(),
    new AgendaSchedulingService(),
    {
      create: async (tenantId: string, event: AgendaEvent) => {
        createdRecords.push({ tenantId, event });
        const persisted = buildPersistedEvent(event, tenantId);
        storedEvents.set(persisted.id, persisted);

        return persisted;
      },
      findById: async (tenantId: string, eventId: string) => {
        const event = storedEvents.get(eventId);

        return event?.tenantId === tenantId ? event : null;
      },
      listByAssetWindow: async (
        tenantId: string,
        assetId: string,
        startsAt: Date,
        endsAt: Date
      ) =>
        [...storedEvents.values()]
          .filter(
            (event) =>
              event.tenantId === tenantId &&
              event.assetId === assetId &&
              event.startsAt < endsAt &&
              startsAt < event.endsAt
          )
          .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime()),
      update: async (tenantId: string, eventId: string, event: AgendaEvent) => {
        updatedRecords.push({ tenantId, eventId, event });

        const updated = {
          ...(storedEvents.get(eventId) ?? buildPersistedEvent({ ...event, id: eventId }, tenantId)),
          id: eventId,
          tenantId,
          assetId: event.assetId,
          type: event.type,
          title: event.title ?? null,
          description: event.description ?? null,
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          safeMinimumBreached: event.safeMinimumBreached ?? false,
          provisional: event.provisional ?? false,
          validatedAt: event.validatedAt ?? null,
          updatedAt: new Date('2026-05-13T15:00:00.000Z')
        };
        storedEvents.set(eventId, updated);

        return updated;
      },
      delete: async (tenantId: string, eventId: string) => {
        deletedRecords.push({ tenantId, eventId });

        return storedEvents.delete(eventId);
      },
      listByTenant: async (tenantId: string) =>
        [...storedEvents.values()]
          .filter((event) => event.tenantId === tenantId)
          .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime()),
      search: async (
        tenantId: string,
        filters?: {
          assetIds?: string[];
          types?: Array<
            | 'utilization'
            | 'planned_maintenance'
            | 'emergency_maintenance'
            | 'operational_block'
            | 'crew_rest'
          >;
          startsAt?: Date;
          endsAt?: Date;
        }
      ) =>
        [...storedEvents.values()]
          .filter((event) => event.tenantId === tenantId)
          .filter(
            (event) =>
              (!filters?.assetIds?.length || filters.assetIds.includes(event.assetId)) &&
              (!filters?.types?.length || filters.types.includes(event.type)) &&
              (!filters?.startsAt || event.endsAt > filters.startsAt) &&
              (!filters?.endsAt || event.startsAt < filters.endsAt)
          )
          .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime())
    },
    {
      createDecisionMemo: async (
        request: {
          tenantId: string;
          action: string;
          aggregateType: string;
          aggregateId: string;
          assetId?: string;
          justification: {
            context: string;
            decision: string;
            decidedBy: string;
            alternativesConsidered: string[];
            expectedImpact: string;
          };
        }
      ) => {
        if (
          request.justification.context.trim().length === 0 ||
          request.justification.decision.trim().length === 0 ||
          request.justification.decidedBy.trim().length === 0 ||
          request.justification.alternativesConsidered.length === 0 ||
          request.justification.expectedImpact.trim().length === 0
        ) {
          return {
            confirmed: false as const,
            reason: 'JUSTIFICATION_REQUIRED' as const
          };
        }

        const memo = {
          ...request.justification,
          status: 'confirmed' as const
        };

        decisionMemos.push({
          tenantId: request.tenantId,
          action: request.action,
          aggregateType: request.aggregateType,
          aggregateId: request.aggregateId,
          assetId: request.assetId,
          memo
        });

        return {
          confirmed: true as const,
          memo
        };
      }
    }
  );

  const seedConflictEvents = () =>
    seedStoredEvents(
      {
        id: 'event-1',
        assetId: 'asset-1',
        type: 'utilization',
        startsAt: new Date('2026-05-13T14:00:00.000Z'),
        endsAt: new Date('2026-05-13T16:00:00.000Z')
      },
      {
        id: 'event-2',
        assetId: 'asset-1',
        type: 'planned_maintenance',
        startsAt: new Date('2026-05-13T15:30:00.000Z'),
        endsAt: new Date('2026-05-13T17:00:00.000Z')
      }
    );

  it('schedules and persists an event when the actor has asset scope permission', async () => {
    createdRecords.length = 0;
    seedStoredEvents();

    const result = await service.scheduleEvent({
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team',
        assetIds: ['asset-1']
      },
      tenantId: 'tenant-a',
      candidateEvent: {
        id: 'event-1',
        assetId: 'asset-1',
        type: 'utilization',
        startsAt: new Date('2026-05-13T14:00:00.000Z'),
        endsAt: new Date('2026-05-13T16:00:00.000Z')
      }
    });

    expect(result).toEqual({
      allowed: true,
      reason: 'SCHEDULED',
      event: {
        id: 'event-1',
        assetId: 'asset-1',
        type: 'utilization',
        startsAt: new Date('2026-05-13T14:00:00.000Z'),
        endsAt: new Date('2026-05-13T16:00:00.000Z')
      }
    });
    expect(createdRecords).toEqual([
      {
        tenantId: 'tenant-a',
        event: {
          id: 'event-1',
          assetId: 'asset-1',
          type: 'utilization',
          startsAt: new Date('2026-05-13T14:00:00.000Z'),
          endsAt: new Date('2026-05-13T16:00:00.000Z')
        }
      }
    ]);
  });

  it('blocks scheduling when the actor does not have asset scope permission', async () => {
    createdRecords.length = 0;
    seedStoredEvents();

    const result = await service.scheduleEvent({
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team',
        assetIds: ['asset-1']
      },
      tenantId: 'tenant-a',
      candidateEvent: {
        id: 'event-1',
        assetId: 'asset-2',
        type: 'utilization',
        startsAt: new Date('2026-05-13T14:00:00.000Z'),
        endsAt: new Date('2026-05-13T16:00:00.000Z')
      }
    });

    expect(result).toEqual({
      allowed: false,
      reason: 'FORBIDDEN',
      accessReason: 'ASSET_SCOPE_MISMATCH'
    });
    expect(createdRecords).toEqual([]);
  });

  it('reschedules and persists an event when the actor has asset scope and the new window is conflict-free', async () => {
    updatedRecords.length = 0;
    seedConflictEvents();

    const result = await service.rescheduleEvent({
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team',
        assetIds: ['asset-1']
      },
      tenantId: 'tenant-a',
      eventId: 'event-1',
      updatedEvent: {
        id: 'event-1',
        assetId: 'asset-1',
        type: 'utilization',
        startsAt: new Date('2026-05-13T18:00:00.000Z'),
        endsAt: new Date('2026-05-13T20:00:00.000Z')
      }
    });

    expect(result).toEqual({
      allowed: true,
      reason: 'UPDATED',
      event: {
        id: 'event-1',
        assetId: 'asset-1',
        type: 'utilization',
        startsAt: new Date('2026-05-13T18:00:00.000Z'),
        endsAt: new Date('2026-05-13T20:00:00.000Z')
      }
    });
    expect(updatedRecords).toEqual([
      {
        tenantId: 'tenant-a',
        eventId: 'event-1',
        event: {
          id: 'event-1',
          assetId: 'asset-1',
          type: 'utilization',
          startsAt: new Date('2026-05-13T18:00:00.000Z'),
          endsAt: new Date('2026-05-13T20:00:00.000Z')
        }
      }
    ]);
  });

  it('blocks reschedule when the new window conflicts with another event on the same asset', async () => {
    updatedRecords.length = 0;
    seedConflictEvents();

    const result = await service.rescheduleEvent({
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team',
        assetIds: ['asset-1']
      },
      tenantId: 'tenant-a',
      eventId: 'event-1',
      updatedEvent: {
        id: 'event-1',
        assetId: 'asset-1',
        type: 'utilization',
        startsAt: new Date('2026-05-13T15:00:00.000Z'),
        endsAt: new Date('2026-05-13T17:00:00.000Z')
      }
    });

    expect(result).toEqual({
      allowed: false,
      reason: 'ASSET_TIME_CONFLICT',
      conflictingEventId: 'event-2'
    });
    expect(updatedRecords).toEqual([]);
  });

  it('allows central operations to resolve an agenda conflict with a confirmed decision memo and a conflict-free final window', async () => {
    updatedRecords.length = 0;
    decisionMemos.length = 0;
    seedConflictEvents();

    const overrideCapableService = service as AgendaApplicationService & {
      overrideConflict: (command: {
        actor: {
          userId: string;
          tenantId: string;
          role: 'central_operations';
          assetIds: string[];
        };
        tenantId: string;
        eventId: string;
        conflictingEventId: string;
        resolvedEvent: AgendaEvent;
        justification: {
          context: string;
          decision: string;
          decidedBy: string;
          alternativesConsidered: string[];
          expectedImpact: string;
        };
      }) => Promise<unknown>;
    };

    await expect(
      Promise.resolve().then(() =>
        overrideCapableService.overrideConflict({
          actor: {
            userId: 'central-1',
            tenantId: 'tenant-a',
            role: 'central_operations',
            assetIds: []
          },
          tenantId: 'tenant-a',
          eventId: 'event-1',
          conflictingEventId: 'event-2',
          resolvedEvent: {
            id: 'event-1',
            assetId: 'asset-1',
            type: 'utilization',
            startsAt: new Date('2026-05-13T18:00:00.000Z'),
            endsAt: new Date('2026-05-13T20:00:00.000Z')
          },
          justification: {
            context: 'Two overlapping events were escalated by central operations.',
            decision: 'Keep the maintenance window and move utilization to the next safe slot.',
            decidedBy: 'central-1',
            alternativesConsidered: ['Cancel maintenance', 'Swap the asset allocation'],
            expectedImpact: 'Preserves agenda uniqueness without releasing an unsafe slot.'
          }
        })
      )
    ).resolves.toEqual({
      allowed: true,
      reason: 'OVERRIDDEN',
      event: {
        id: 'event-1',
        assetId: 'asset-1',
        type: 'utilization',
        startsAt: new Date('2026-05-13T18:00:00.000Z'),
        endsAt: new Date('2026-05-13T20:00:00.000Z')
      },
      memo: {
        context: 'Two overlapping events were escalated by central operations.',
        decision: 'Keep the maintenance window and move utilization to the next safe slot.',
        decidedBy: 'central-1',
        alternativesConsidered: ['Cancel maintenance', 'Swap the asset allocation'],
        expectedImpact: 'Preserves agenda uniqueness without releasing an unsafe slot.',
        status: 'confirmed'
      }
    });

    expect(updatedRecords).toEqual([
      {
        tenantId: 'tenant-a',
        eventId: 'event-1',
        event: {
          id: 'event-1',
          assetId: 'asset-1',
          type: 'utilization',
          startsAt: new Date('2026-05-13T18:00:00.000Z'),
          endsAt: new Date('2026-05-13T20:00:00.000Z')
        }
      }
    ]);
    expect(decisionMemos).toEqual([
      {
        tenantId: 'tenant-a',
        action: 'agenda.conflict.override',
        aggregateType: 'agenda_conflict',
        aggregateId: 'event-1:event-2',
        assetId: 'asset-1',
        memo: {
          context: 'Two overlapping events were escalated by central operations.',
          decision: 'Keep the maintenance window and move utilization to the next safe slot.',
          decidedBy: 'central-1',
          alternativesConsidered: ['Cancel maintenance', 'Swap the asset allocation'],
          expectedImpact: 'Preserves agenda uniqueness without releasing an unsafe slot.',
          status: 'confirmed'
        }
      }
    ]);
  });

  it('blocks agenda conflict override when the structured justification is incomplete', async () => {
    updatedRecords.length = 0;
    decisionMemos.length = 0;
    seedConflictEvents();

    const overrideCapableService = service as AgendaApplicationService & {
      overrideConflict: (command: {
        actor: {
          userId: string;
          tenantId: string;
          role: 'central_operations';
          assetIds: string[];
        };
        tenantId: string;
        eventId: string;
        conflictingEventId: string;
        resolvedEvent: AgendaEvent;
        justification: {
          context: string;
          decision: string;
          decidedBy: string;
          alternativesConsidered: string[];
          expectedImpact: string;
        };
      }) => Promise<unknown>;
    };

    await expect(
      Promise.resolve().then(() =>
        overrideCapableService.overrideConflict({
          actor: {
            userId: 'central-1',
            tenantId: 'tenant-a',
            role: 'central_operations',
            assetIds: []
          },
          tenantId: 'tenant-a',
          eventId: 'event-1',
          conflictingEventId: 'event-2',
          resolvedEvent: {
            id: 'event-1',
            assetId: 'asset-1',
            type: 'utilization',
            startsAt: new Date('2026-05-13T18:00:00.000Z'),
            endsAt: new Date('2026-05-13T20:00:00.000Z')
          },
          justification: {
            context: '',
            decision: 'Keep the maintenance window and move utilization to the next safe slot.',
            decidedBy: 'central-1',
            alternativesConsidered: ['Cancel maintenance'],
            expectedImpact: 'Preserves agenda uniqueness without releasing an unsafe slot.'
          }
        })
      )
    ).resolves.toEqual({
      allowed: false,
      reason: 'JUSTIFICATION_REQUIRED'
    });

    expect(updatedRecords).toEqual([]);
    expect(decisionMemos).toEqual([]);
  });

  it('applies and persists an immediate provisional technical block when requested by yachts technical coordination', async () => {
    createdRecords.length = 0;
    seedStoredEvents();

    const provisionalService = service as AgendaApplicationService & {
      applyProvisionalBlock: (command: {
        actor: {
          userId: string;
          tenantId: string;
          role: 'yachts_technical_coordination';
          assetIds: string[];
        };
        tenantId: string;
        input: {
          id: string;
          assetId: string;
          startsAt: Date;
          endsAt: Date;
        };
      }) => Promise<unknown>;
    };

    await expect(
      Promise.resolve().then(() =>
        provisionalService.applyProvisionalBlock({
          actor: {
            userId: 'tech-1',
            tenantId: 'tenant-a',
            role: 'yachts_technical_coordination',
            assetIds: []
          },
          tenantId: 'tenant-a',
          input: {
            id: 'event-3',
            assetId: 'asset-1',
            startsAt: new Date('2026-05-13T08:00:00.000Z'),
            endsAt: new Date('2026-05-14T08:00:00.000Z')
          }
        })
      )
    ).resolves.toEqual({
      allowed: true,
      reason: 'PROVISIONAL_BLOCK_APPLIED',
      event: {
        id: 'event-3',
        assetId: 'asset-1',
        type: 'operational_block',
        startsAt: new Date('2026-05-13T08:00:00.000Z'),
        endsAt: new Date('2026-05-14T08:00:00.000Z'),
        provisional: true,
        validatedAt: undefined
      }
    });

    expect(createdRecords).toEqual([
      {
        tenantId: 'tenant-a',
        event: {
          id: 'event-3',
          assetId: 'asset-1',
          type: 'operational_block',
          startsAt: new Date('2026-05-13T08:00:00.000Z'),
          endsAt: new Date('2026-05-14T08:00:00.000Z'),
          provisional: true,
          validatedAt: undefined
        }
      }
    ]);
  });

  it('validates a provisional technical block when central operations confirms it within the SLA window', async () => {
    updatedRecords.length = 0;
    seedStoredEvents({
      id: 'event-3',
      assetId: 'asset-1',
      type: 'operational_block',
      startsAt: new Date('2026-05-13T08:00:00.000Z'),
      endsAt: new Date('2026-05-14T08:00:00.000Z'),
      provisional: true
    });

    const provisionalService = service as AgendaApplicationService & {
      validateProvisionalBlock: (command: {
        actor: {
          userId: string;
          tenantId: string;
          role: 'central_operations';
          assetIds: string[];
        };
        tenantId: string;
        eventId: string;
        validatedAt: Date;
      }) => Promise<unknown>;
    };

    await expect(
      Promise.resolve().then(() =>
        provisionalService.validateProvisionalBlock({
          actor: {
            userId: 'central-1',
            tenantId: 'tenant-a',
            role: 'central_operations',
            assetIds: []
          },
          tenantId: 'tenant-a',
          eventId: 'event-3',
          validatedAt: new Date('2026-05-13T12:00:00.000Z')
        })
      )
    ).resolves.toEqual({
      allowed: true,
      reason: 'VALIDATED',
      event: {
        id: 'event-3',
        assetId: 'asset-1',
        type: 'operational_block',
        startsAt: new Date('2026-05-13T08:00:00.000Z'),
        endsAt: new Date('2026-05-14T08:00:00.000Z'),
        safeMinimumBreached: false,
        provisional: true,
        validatedAt: new Date('2026-05-13T12:00:00.000Z')
      }
    });

    expect(updatedRecords).toEqual([
      {
        tenantId: 'tenant-a',
        eventId: 'event-3',
        event: {
          id: 'event-3',
          assetId: 'asset-1',
          type: 'operational_block',
          startsAt: new Date('2026-05-13T08:00:00.000Z'),
          endsAt: new Date('2026-05-14T08:00:00.000Z'),
          safeMinimumBreached: false,
          provisional: true,
          validatedAt: new Date('2026-05-13T12:00:00.000Z')
        }
      }
    ]);
  });

  it('marks breach and keeps utilization release blocked when a provisional technical block reaches 24h without central validation', async () => {
    seedStoredEvents({
      id: 'event-3',
      assetId: 'asset-1',
      type: 'operational_block',
      startsAt: new Date('2026-05-13T08:00:00.000Z'),
      endsAt: new Date('2026-05-14T08:00:00.000Z'),
      provisional: true
    });

    const provisionalService = service as AgendaApplicationService & {
      getProvisionalBlockStatus: (command: {
        tenantId: string;
        eventId: string;
        now: Date;
      }) => Promise<unknown>;
    };

    await expect(
      Promise.resolve().then(() =>
        provisionalService.getProvisionalBlockStatus({
          tenantId: 'tenant-a',
          eventId: 'event-3',
          now: new Date('2026-05-14T09:00:00.000Z')
        })
      )
    ).resolves.toEqual({
      found: true,
      reason: 'STATUS_EVALUATED',
      status: {
        breach: true,
        escalationRequired: true,
        utilizationReleaseAllowed: false
      }
    });
  });

  it('records conflict metrics and a structured trace event when agenda scheduling is blocked by overlap', async () => {
    const metrics = new ObservabilityMetricsService();
    const logs = new ObservabilityEventLogService();
    const instrumentedService = new (
      AgendaApplicationService as unknown as new (...args: any[]) => AgendaApplicationService
    )(
      new AccessPolicyService(),
      new AgendaSchedulingService(),
      {
        create: async (_tenantId: string, event: AgendaEvent) => event,
        findById: async () => null,
        listByAssetWindow: async () => [
          {
            id: 'event-2',
            tenantId: 'tenant-a',
            assetId: 'asset-1',
            type: 'planned_maintenance' as const,
            startsAt: new Date('2026-05-13T15:30:00.000Z'),
            endsAt: new Date('2026-05-13T17:00:00.000Z'),
            safeMinimumBreached: false,
            provisional: false,
            validatedAt: null,
            createdAt: new Date('2026-05-13T14:01:00.000Z'),
            updatedAt: new Date('2026-05-13T14:01:00.000Z')
          }
        ],
        update: async (_tenantId: string, _eventId: string, event: AgendaEvent) => ({
          tenantId: 'tenant-a',
          ...event,
          createdAt: new Date('2026-05-13T14:01:00.000Z'),
          updatedAt: new Date('2026-05-13T15:00:00.000Z')
        })
      },
      {
        createDecisionMemo: async () => ({
          confirmed: false as const,
          reason: 'JUSTIFICATION_REQUIRED' as const
        })
      },
      metrics,
      logs
    );

    const result = await instrumentedService.scheduleEvent({
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team',
        assetIds: ['asset-1']
      },
      tenantId: 'tenant-a',
      candidateEvent: {
        id: 'event-1',
        assetId: 'asset-1',
        type: 'utilization',
        startsAt: new Date('2026-05-13T15:00:00.000Z'),
        endsAt: new Date('2026-05-13T17:00:00.000Z')
      }
    });

    expect(result).toEqual({
      allowed: false,
      reason: 'ASSET_TIME_CONFLICT',
      conflictingEventId: 'event-2'
    });
    expect(metrics.getSnapshot().agendaConflicts).toBe(1);
    expect(logs.listRecentEvents()).toEqual([
      expect.objectContaining({
        domain: 'agenda',
        action: 'schedule_event',
        entityId: 'event-1',
        outcome: 'blocked',
        metadata: {
          assetId: 'asset-1',
          reason: 'ASSET_TIME_CONFLICT',
          conflictingEventId: 'event-2'
        }
      })
    ]);
    expect(logs.listRecentEvents()[0]?.correlation_id).toBeTruthy();
  });

  it('searches agenda events in tenant scope and filters field team access by assigned assets and requested window', async () => {
    seedStoredEvents(
      {
        id: 'event-1',
        assetId: 'asset-1',
        type: 'utilization',
        title: 'Owner weekend',
        description: 'Angra owners trip',
        startsAt: new Date('2026-05-14T09:00:00.000Z'),
        endsAt: new Date('2026-05-14T11:00:00.000Z')
      },
      {
        id: 'event-2',
        assetId: 'asset-2',
        type: 'planned_maintenance',
        startsAt: new Date('2026-05-14T09:30:00.000Z'),
        endsAt: new Date('2026-05-14T12:00:00.000Z')
      },
      {
        id: 'event-3',
        assetId: 'asset-1',
        type: 'crew_rest',
        startsAt: new Date('2026-05-15T09:00:00.000Z'),
        endsAt: new Date('2026-05-15T10:00:00.000Z')
      }
    );

    const result = await (
      service as AgendaApplicationService & {
        searchEvents: (command: {
          actor: {
            userId: string;
            tenantId: string;
            role: 'asset_field_team';
            assetIds: string[];
          };
          tenantId: string;
          filters: {
            startsAt: Date;
            endsAt: Date;
          };
        }) => Promise<unknown>;
      }
    ).searchEvents({
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team',
        assetIds: ['asset-1']
      },
      tenantId: 'tenant-a',
      filters: {
        startsAt: new Date('2026-05-14T08:00:00.000Z'),
        endsAt: new Date('2026-05-14T23:59:59.000Z')
      }
    });

    expect(result).toEqual({
      events: [
        {
          id: 'event-1',
          assetId: 'asset-1',
          type: 'utilization',
          title: 'Owner weekend',
          description: 'Angra owners trip',
          startsAt: new Date('2026-05-14T09:00:00.000Z'),
          endsAt: new Date('2026-05-14T11:00:00.000Z'),
          safeMinimumBreached: false,
          provisional: false,
          validatedAt: null,
          updatedAt: new Date('2026-05-13T14:01:00.000Z')
        }
      ]
    });
  });

  it('deletes an agenda event when the field team owns the asset scope', async () => {
    deletedRecords.length = 0;
    seedStoredEvents({
      id: 'event-1',
      assetId: 'asset-1',
      type: 'planned_maintenance',
      startsAt: new Date('2026-05-14T09:00:00.000Z'),
      endsAt: new Date('2026-05-14T11:00:00.000Z')
    });

    const result = await (
      service as AgendaApplicationService & {
        deleteEvent: (command: {
          actor: {
            userId: string;
            tenantId: string;
            role: 'asset_field_team';
            assetIds: string[];
          };
          tenantId: string;
          eventId: string;
        }) => Promise<unknown>;
      }
    ).deleteEvent({
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team',
        assetIds: ['asset-1']
      },
      tenantId: 'tenant-a',
      eventId: 'event-1'
    });

    expect(result).toEqual({
      allowed: true,
      reason: 'DELETED'
    });
    expect(deletedRecords).toEqual([
      {
        tenantId: 'tenant-a',
        eventId: 'event-1'
      }
    ]);
    expect(storedEvents.has('event-1')).toBe(false);
  });
});
