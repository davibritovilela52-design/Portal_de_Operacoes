import { describe, expect, it } from 'vitest';

import {
  AgendaApplicationService,
  DeleteAgendaEventCommand,
  RescheduleAgendaEventCommand,
  ScheduleAgendaEventCommand
} from '../src/modules/agenda/agenda-application.service.js';
import { AgendaController } from '../src/modules/agenda/agenda.controller.js';

describe('AgendaController', () => {
  const portalSessionService = {
    resolveActor: (actor: unknown) => actor
  };
  const controller = new AgendaController({
    getCatalog: () => ({
      eventTypes: ['utilization']
    }),
    searchEvents: async (request: unknown) => request,
    scheduleEvent: async (request: ScheduleAgendaEventCommand) => request,
    rescheduleEvent: async (request: RescheduleAgendaEventCommand) => request,
    deleteEvent: async (request: DeleteAgendaEventCommand) => request,
    overrideConflict: async (request: unknown) => request,
    applyProvisionalBlock: async (request: unknown) => request,
    validateProvisionalBlock: async (request: unknown) => request
  } as unknown as AgendaApplicationService, portalSessionService as any);

  it('returns the agenda catalog for clients', () => {
    expect(controller.getCatalog()).toEqual({
      eventTypes: ['utilization']
    });
  });

  it('delegates schedule event requests to the application service', async () => {
    const request = {
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team' as const,
        assetIds: ['asset-1']
      },
      tenantId: 'tenant-a',
      candidateEvent: {
        id: 'event-1',
        assetId: 'asset-1',
        type: 'utilization' as const,
        startsAt: new Date('2026-05-13T14:00:00.000Z'),
        endsAt: new Date('2026-05-13T16:00:00.000Z')
      }
    };

    await expect(controller.scheduleEvent(undefined, request)).resolves.toStrictEqual({
      ...request,
      candidateEvent: {
        ...request.candidateEvent,
        validatedAt: undefined
      }
    });
  });

  it('normalizes string dates in schedule event requests', async () => {
    const request = {
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team' as const,
        assetIds: ['asset-1']
      },
      tenantId: 'tenant-a',
      candidateEvent: {
        id: 'event-1',
        assetId: 'asset-1',
        type: 'utilization' as const,
        startsAt: '2026-05-13T14:00:00.000Z',
        endsAt: '2026-05-13T16:00:00.000Z'
      }
    };

    await expect(
      controller.scheduleEvent(undefined, request as unknown as ScheduleAgendaEventCommand)
    ).resolves.toStrictEqual({
      ...request,
      candidateEvent: {
        ...request.candidateEvent,
        startsAt: new Date('2026-05-13T14:00:00.000Z'),
        endsAt: new Date('2026-05-13T16:00:00.000Z'),
        validatedAt: undefined
      }
    });
  });

  it('delegates reschedule requests to the application service', async () => {
    const request = {
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team' as const,
        assetIds: ['asset-1']
      },
      tenantId: 'tenant-a',
      eventId: 'event-1',
      updatedEvent: {
        id: 'event-1',
        assetId: 'asset-1',
        type: 'utilization' as const,
        startsAt: new Date('2026-05-13T18:00:00.000Z'),
        endsAt: new Date('2026-05-13T20:00:00.000Z')
      }
    };

    await expect(controller.rescheduleEvent(request.eventId, undefined, request)).resolves.toStrictEqual({
      ...request,
      updatedEvent: {
        ...request.updatedEvent,
        validatedAt: undefined
      }
    });
  });

  it('normalizes string dates in reschedule requests', async () => {
    const request = {
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team' as const,
        assetIds: ['asset-1']
      },
      tenantId: 'tenant-a',
      eventId: 'event-1',
      updatedEvent: {
        id: 'event-1',
        assetId: 'asset-1',
        type: 'utilization' as const,
        startsAt: '2026-05-13T18:00:00.000Z',
        endsAt: '2026-05-13T20:00:00.000Z'
      }
    };

    await expect(
      controller.rescheduleEvent(
        request.eventId,
        undefined,
        request as unknown as RescheduleAgendaEventCommand
      )
    ).resolves.toStrictEqual({
      ...request,
      updatedEvent: {
        ...request.updatedEvent,
        startsAt: new Date('2026-05-13T18:00:00.000Z'),
        endsAt: new Date('2026-05-13T20:00:00.000Z'),
        validatedAt: undefined
      }
    });
  });

  it('delegates delete event requests to the application service', async () => {
    const request = {
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team' as const,
        assetIds: ['asset-1']
      },
      tenantId: 'tenant-a',
      eventId: 'event-1'
    };

    await expect(controller.deleteEvent(request.eventId, undefined, request)).resolves.toStrictEqual(
      request
    );
  });

  it('delegates conflict override requests to the application service', async () => {
    const request = {
      actor: {
        userId: 'central-1',
        tenantId: 'tenant-a',
        role: 'central_operations' as const,
        assetIds: []
      },
      tenantId: 'tenant-a',
      eventId: 'event-1',
      conflictingEventId: 'event-2',
      resolvedEvent: {
        id: 'event-1',
        assetId: 'asset-1',
        type: 'utilization' as const,
        startsAt: new Date('2026-05-13T18:00:00.000Z'),
        endsAt: new Date('2026-05-13T20:00:00.000Z')
      },
      justification: {
        context: 'Two overlapping events were escalated by central operations.',
        decision: 'Keep the maintenance window and move utilization to the next safe slot.',
        decidedBy: 'central-1',
        alternativesConsidered: ['Cancel maintenance'],
        expectedImpact: 'Preserves agenda uniqueness without releasing an unsafe slot.'
      }
    };

    await expect(controller.overrideConflict(request.eventId, undefined, request)).resolves.toStrictEqual(
      request
    );
  });

  it('delegates provisional technical block application requests to the application service', async () => {
    const request = {
      actor: {
        userId: 'tech-1',
        tenantId: 'tenant-a',
        role: 'yachts_technical_coordination' as const,
        assetIds: []
      },
      tenantId: 'tenant-a',
      input: {
        id: 'event-3',
        assetId: 'asset-1',
        startsAt: new Date('2026-05-13T08:00:00.000Z'),
        endsAt: new Date('2026-05-14T08:00:00.000Z')
      }
    };

    await expect(controller.applyProvisionalBlock(undefined, request)).resolves.toStrictEqual(request);
  });

  it('normalizes string dates in provisional block application requests', async () => {
    const request = {
      actor: {
        userId: 'tech-1',
        tenantId: 'tenant-a',
        role: 'yachts_technical_coordination' as const,
        assetIds: []
      },
      tenantId: 'tenant-a',
      input: {
        id: 'event-3',
        assetId: 'asset-1',
        startsAt: '2026-05-13T08:00:00.000Z',
        endsAt: '2026-05-14T08:00:00.000Z'
      }
    };

    await expect(controller.applyProvisionalBlock(undefined, request as any)).resolves.toStrictEqual({
      ...request,
      input: {
        ...request.input,
        startsAt: new Date('2026-05-13T08:00:00.000Z'),
        endsAt: new Date('2026-05-14T08:00:00.000Z')
      }
    });
  });

  it('delegates provisional technical block validation requests to the application service', async () => {
    const request = {
      actor: {
        userId: 'central-1',
        tenantId: 'tenant-a',
        role: 'central_operations' as const,
        assetIds: []
      },
      tenantId: 'tenant-a',
      eventId: 'event-3',
      validatedAt: new Date('2026-05-13T12:00:00.000Z')
    };

    await expect(controller.validateProvisionalBlock(request.eventId, undefined, request)).resolves.toStrictEqual(
      request
    );
  });

  it('normalizes string dates in provisional block validation requests', async () => {
    const request = {
      actor: {
        userId: 'central-1',
        tenantId: 'tenant-a',
        role: 'central_operations' as const,
        assetIds: []
      },
      tenantId: 'tenant-a',
      eventId: 'event-3',
      validatedAt: '2026-05-13T12:00:00.000Z'
    };

    await expect(controller.validateProvisionalBlock(request.eventId, undefined, request as any)).resolves.toStrictEqual({
      ...request,
      validatedAt: new Date('2026-05-13T12:00:00.000Z')
    });
  });

  it('delegates agenda search requests to the application service', async () => {
    const request = {
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team' as const,
        assetIds: ['asset-1']
      },
      tenantId: 'tenant-a',
      filters: {
        startsAt: new Date('2026-05-14T08:00:00.000Z'),
        endsAt: new Date('2026-05-14T23:59:59.000Z')
      }
    };

    await expect(controller.searchEvents(undefined, request)).resolves.toStrictEqual(request);
  });
});
