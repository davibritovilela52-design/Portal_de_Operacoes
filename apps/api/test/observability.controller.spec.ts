import { describe, expect, it } from 'vitest';

import { ObservabilityApplicationService } from '../src/modules/observability/observability-application.service.js';
import { ObservabilityController } from '../src/modules/observability/observability.controller.js';

describe('ObservabilityController', () => {
  const controller = new ObservabilityController({
    getHealth: async () => ({
      overallStatus: 'up',
      components: {
        api: { status: 'up' },
        db: { status: 'up' },
        queue: { status: 'up' },
        storage: { status: 'up' }
      }
    }),
    getMetrics: () => ({
      slaCheckpoints: { 75: 1, 90: 0, 100: 0 },
      agendaConflicts: 2,
      p1Overdue: 0,
      authorizationFailures: 1
    }),
    getRecentEvents: () => [
      {
        correlation_id: 'corr-1',
        domain: 'agenda',
        action: 'conflict_override',
        outcome: 'success',
        logged_at: new Date('2026-05-13T22:00:00.000Z')
      }
    ]
  } as unknown as ObservabilityApplicationService);

  it('returns the health report for clients and operators', async () => {
    await expect(controller.getHealth()).resolves.toEqual({
      overallStatus: 'up',
      components: {
        api: { status: 'up' },
        db: { status: 'up' },
        queue: { status: 'up' },
        storage: { status: 'up' }
      }
    });
  });

  it('returns the current domain metrics snapshot', () => {
    expect(controller.getMetrics()).toEqual({
      slaCheckpoints: { 75: 1, 90: 0, 100: 0 },
      agendaConflicts: 2,
      p1Overdue: 0,
      authorizationFailures: 1
    });
  });

  it('returns recent structured events for traceability', () => {
    expect(controller.getRecentEvents()).toEqual([
      {
        correlation_id: 'corr-1',
        domain: 'agenda',
        action: 'conflict_override',
        outcome: 'success',
        logged_at: new Date('2026-05-13T22:00:00.000Z')
      }
    ]);
  });
});
