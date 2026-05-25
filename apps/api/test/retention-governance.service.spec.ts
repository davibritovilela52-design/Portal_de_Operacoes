import { describe, expect, it } from 'vitest';

import { RetentionGovernanceService } from '../src/modules/governance/retention-governance.service.js';

describe('RetentionGovernanceService', () => {
  it('anonymizes personal data after five years unless a legal retention exception exists', () => {
    const service = new RetentionGovernanceService();

    expect(
      service.evaluateRetention({
        createdAt: new Date('2020-01-01T00:00:00.000Z'),
        now: new Date('2026-05-13T00:00:00.000Z'),
        hasLegalException: false
      })
    ).toEqual({
      action: 'ANONYMIZE',
      retentionYears: 5
    });

    expect(
      service.evaluateRetention({
        createdAt: new Date('2020-01-01T00:00:00.000Z'),
        now: new Date('2026-05-13T00:00:00.000Z'),
        hasLegalException: true
      })
    ).toEqual({
      action: 'RETAIN',
      retentionYears: 5
    });
  });
});
