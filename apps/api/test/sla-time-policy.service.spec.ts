import { describe, expect, it } from 'vitest';

import { SlaTimePolicyService } from '../src/modules/governance/sla-time-policy.service.js';

describe('SlaTimePolicyService', () => {
  it('captures a timezone snapshot at opening time and preserves it for later evaluation', () => {
    const service = new SlaTimePolicyService();

    const snapshot = service.captureSnapshot({
      openedAt: new Date('2026-05-13T12:00:00.000Z'),
      timezone: 'America/Sao_Paulo'
    });

    expect(snapshot).toEqual({
      openedAt: new Date('2026-05-13T12:00:00.000Z'),
      timezone: 'America/Sao_Paulo'
    });

    expect(
      service.evaluateAgainstSnapshot(snapshot, {
        currentTimezone: 'UTC',
        thresholdHours: 24
      })
    ).toEqual({
      timezoneUsed: 'America/Sao_Paulo',
      thresholdHours: 24
    });
  });
});
