import { describe, expect, it } from 'vitest';

import { ObservabilityMetricsService } from '../src/modules/observability/observability-metrics.service.js';

describe('ObservabilityMetricsService', () => {
  it('tracks the required domain counters for SLA, conflicts, P1 overdue and authorization failures', () => {
    const service = new ObservabilityMetricsService();

    service.recordSlaCheckpoint(75);
    service.recordSlaCheckpoint(100);
    service.recordAgendaConflict();
    service.recordP1Overdue();
    service.recordAuthorizationFailure();

    expect(service.getSnapshot()).toEqual({
      slaCheckpoints: {
        75: 1,
        90: 0,
        100: 1
      },
      agendaConflicts: 1,
      p1Overdue: 1,
      authorizationFailures: 1
    });
  });
});
