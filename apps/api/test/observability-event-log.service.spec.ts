import { describe, expect, it } from 'vitest';

import { ObservabilityEventLogService } from '../src/modules/observability/observability-event-log.service.js';

describe('ObservabilityEventLogService', () => {
  it('records a structured event with correlation_id for traceability', () => {
    const service = new ObservabilityEventLogService();

    const event = service.record({
      domain: 'agenda',
      action: 'conflict_override',
      entityId: 'event-1:event-2',
      outcome: 'success',
      metadata: {
        assetId: 'asset-1'
      }
    });

    expect(event).toMatchObject({
      domain: 'agenda',
      action: 'conflict_override',
      entityId: 'event-1:event-2',
      outcome: 'success',
      metadata: {
        assetId: 'asset-1'
      }
    });
    expect(event.correlation_id).toBeTruthy();
    expect(event.logged_at).toBeInstanceOf(Date);
    expect(service.listRecentEvents()).toEqual([event]);
  });
});
