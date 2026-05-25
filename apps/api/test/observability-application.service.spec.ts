import { describe, expect, it } from 'vitest';

import { ObservabilityApplicationService } from '../src/modules/observability/observability-application.service.js';
import { ObservabilityEventLogService } from '../src/modules/observability/observability-event-log.service.js';
import { ObservabilityHealthService } from '../src/modules/observability/observability-health.service.js';
import { ObservabilityMetricsService } from '../src/modules/observability/observability-metrics.service.js';

describe('ObservabilityApplicationService', () => {
  it('exposes health, metrics and recent events through a single application facade', async () => {
    const metrics = new ObservabilityMetricsService();
    const logs = new ObservabilityEventLogService();
    const health = new ObservabilityHealthService({
      checkApi: async () => ({ status: 'up' }),
      checkDb: async () => ({ status: 'up' }),
      checkQueue: async () => ({ status: 'up' }),
      checkStorage: async () => ({ status: 'up' })
    });
    const service = new ObservabilityApplicationService(health, metrics, logs);

    metrics.recordAgendaConflict();
    logs.record({
      correlation_id: 'corr-1',
      domain: 'agenda',
      action: 'provisional_block_apply',
      entityId: 'event-3',
      outcome: 'success'
    });

    await expect(service.getHealth()).resolves.toEqual({
      overallStatus: 'up',
      components: {
        api: { status: 'up' },
        db: { status: 'up' },
        queue: { status: 'up' },
        storage: { status: 'up' }
      }
    });
    expect(service.getMetrics()).toEqual({
      slaCheckpoints: {
        75: 0,
        90: 0,
        100: 0
      },
      agendaConflicts: 1,
      p1Overdue: 0,
      authorizationFailures: 0
    });
    expect(service.getRecentEvents()).toEqual([
      {
        correlation_id: 'corr-1',
        domain: 'agenda',
        action: 'provisional_block_apply',
        entityId: 'event-3',
        outcome: 'success',
        logged_at: expect.any(Date)
      }
    ]);
  });
});
