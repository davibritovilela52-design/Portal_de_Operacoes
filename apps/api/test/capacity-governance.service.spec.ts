import { describe, expect, it } from 'vitest';

import { CapacityGovernanceService } from '../src/modules/governance/capacity-governance.service.js';

describe('CapacityGovernanceService', () => {
  it('blocks new in-progress allocation when the asset limit is exceeded', () => {
    const service = new CapacityGovernanceService();

    expect(
      service.evaluateAllocation({
        assetId: 'asset-1',
        inProgressCount: 4,
        limit: 3,
        actorRole: 'asset_field_team'
      })
    ).toEqual({
      allowed: false,
      reason: 'CAPACITY_LIMIT_REACHED',
      riskEventRequired: true
    });
  });

  it('allows a central operations override above the limit with structured justification', () => {
    const service = new CapacityGovernanceService();

    expect(
      service.evaluateAllocation({
        assetId: 'asset-1',
        inProgressCount: 4,
        limit: 3,
        actorRole: 'central_operations',
        justification: {
          context: 'Emergency service overlap during dock preparation.',
          decision: 'Allow temporary excess load for 6 hours.',
          decidedBy: 'central-1',
          alternativesConsidered: ['Delay secondary task'],
          expectedImpact: 'Maintains critical maintenance window.'
        }
      })
    ).toEqual({
      allowed: true,
      reason: 'OVERRIDE_ALLOWED',
      riskEventRequired: true
    });
  });
});
