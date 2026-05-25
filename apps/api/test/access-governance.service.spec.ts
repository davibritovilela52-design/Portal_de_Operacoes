import { describe, expect, it } from 'vitest';

import { AccessGovernanceService } from '../src/modules/governance/access-governance.service.js';

describe('AccessGovernanceService', () => {
  it('requires MFA for critical roles and evaluates the 15 minute revocation SLA', () => {
    const service = new AccessGovernanceService();

    expect(service.requiresMfa('portal_admin')).toBe(true);
    expect(service.requiresMfa('yachts_operations')).toBe(true);
    expect(service.requiresMfa('asset_field_team')).toBe(false);
    expect(
      service.evaluateRevocation({
        requestedAt: new Date('2026-05-13T12:00:00.000Z'),
        removedAt: new Date('2026-05-13T12:10:00.000Z')
      })
    ).toEqual({
      breach: false,
      elapsedMinutes: 10,
      slaMinutes: 15
    });
  });

  it('builds access review items monthly for critical roles and quarterly for non-critical roles', () => {
    const service = new AccessGovernanceService();

    expect(
      service.buildAccessReviewReport(
        [
          {
            userId: 'central-1',
            role: 'central_operations',
            lastReviewedAt: new Date('2026-03-10T00:00:00.000Z')
          },
          {
            userId: 'field-1',
            role: 'asset_field_team',
            lastReviewedAt: new Date('2026-04-20T00:00:00.000Z')
          }
        ],
        new Date('2026-05-13T00:00:00.000Z')
      )
    ).toEqual({
      dueReviews: [
        {
          userId: 'central-1',
          role: 'central_operations',
          cadence: 'monthly'
        }
      ]
    });
  });
});
