import { describe, expect, it } from 'vitest';

import { AgendaSchedulingService } from '../src/modules/agenda/agenda-scheduling.service.js';

describe('AgendaSchedulingService', () => {
  const service = new AgendaSchedulingService();

  it('publishes the official agenda event catalog', () => {
    expect(service.getCatalog()).toEqual({
      eventTypes: [
        'utilization',
        'planned_maintenance',
        'emergency_maintenance',
        'operational_block',
        'crew_rest'
      ]
    });
  });

  it('blocks a second event when the same asset already has an overlapping window', () => {
    const result = service.scheduleEvent(
      [
        {
          id: 'event-1',
          assetId: 'asset-1',
          type: 'utilization',
          startsAt: new Date('2026-05-13T10:00:00.000Z'),
          endsAt: new Date('2026-05-13T12:00:00.000Z')
        }
      ],
      {
        id: 'event-2',
        assetId: 'asset-1',
        type: 'planned_maintenance',
        startsAt: new Date('2026-05-13T11:00:00.000Z'),
        endsAt: new Date('2026-05-13T13:00:00.000Z')
      }
    );

    expect(result).toEqual({
      allowed: false,
      reason: 'ASSET_TIME_CONFLICT',
      conflictingEventId: 'event-1'
    });
  });

  it('allows events with the same window when they belong to different assets', () => {
    const result = service.scheduleEvent(
      [
        {
          id: 'event-1',
          assetId: 'asset-1',
          type: 'utilization',
          startsAt: new Date('2026-05-13T10:00:00.000Z'),
          endsAt: new Date('2026-05-13T12:00:00.000Z')
        }
      ],
      {
        id: 'event-2',
        assetId: 'asset-2',
        type: 'planned_maintenance',
        startsAt: new Date('2026-05-13T10:00:00.000Z'),
        endsAt: new Date('2026-05-13T12:00:00.000Z')
      }
    );

    expect(result).toEqual({
      allowed: true,
      reason: 'SCHEDULED',
      event: {
        id: 'event-2',
        assetId: 'asset-2',
        type: 'planned_maintenance',
        startsAt: new Date('2026-05-13T10:00:00.000Z'),
        endsAt: new Date('2026-05-13T12:00:00.000Z')
      }
    });
  });

  it('prioritizes crew rest over utilization when the safe minimum would be breached', () => {
    const utilizationPriority = service.getOperationalPriority({
      assetId: 'asset-1',
      type: 'utilization',
      startsAt: new Date('2026-05-13T10:00:00.000Z'),
      endsAt: new Date('2026-05-13T12:00:00.000Z')
    });

    const crewRestPriority = service.getOperationalPriority({
      assetId: 'asset-1',
      type: 'crew_rest',
      startsAt: new Date('2026-05-13T10:00:00.000Z'),
      endsAt: new Date('2026-05-13T12:00:00.000Z'),
      safeMinimumBreached: true
    });

    expect(utilizationPriority).toBe(4);
    expect(crewRestPriority).toBe(3);
  });

  it('keeps non-breaching crew rest ahead of planned maintenance', () => {
    const crewRestPriority = service.getOperationalPriority({
      assetId: 'asset-1',
      type: 'crew_rest',
      startsAt: new Date('2026-05-13T10:00:00.000Z'),
      endsAt: new Date('2026-05-13T12:00:00.000Z'),
      safeMinimumBreached: false
    });

    const plannedMaintenancePriority = service.getOperationalPriority({
      assetId: 'asset-1',
      type: 'planned_maintenance',
      startsAt: new Date('2026-05-13T10:00:00.000Z'),
      endsAt: new Date('2026-05-13T12:00:00.000Z')
    });

    expect(crewRestPriority).toBe(5);
    expect(plannedMaintenancePriority).toBe(6);
  });

  it('marks SLA breach and keeps utilization blocked when a provisional technical block is still unvalidated after 24 hours', () => {
    const result = service.evaluateProvisionalBlock({
      id: 'event-3',
      assetId: 'asset-1',
      type: 'operational_block',
      startsAt: new Date('2026-05-13T08:00:00.000Z'),
      endsAt: new Date('2026-05-14T08:00:00.000Z'),
      provisional: true
    }, new Date('2026-05-14T09:00:00.000Z'));

    expect(result).toEqual({
      breach: true,
      escalationRequired: true,
      utilizationReleaseAllowed: false
    });
  });
});
