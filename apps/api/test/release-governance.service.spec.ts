import { describe, expect, it } from 'vitest';

import { ReleaseGovernanceService } from '../src/modules/governance/release-governance.service.js';

describe('ReleaseGovernanceService', () => {
  it('requires unanimous go/no-go approval and 100 percent readiness on critical profiles', () => {
    const service = new ReleaseGovernanceService();

    expect(
      service.evaluateGoNoGo({
        centralOperations: true,
        technicalCoordination: true,
        portalAdmin: false
      })
    ).toEqual({
      approved: false,
      reason: 'UNANIMITY_REQUIRED',
      missingApprovals: ['portalAdmin']
    });

    expect(
      service.evaluateReadiness({
        centralOperations: 100,
        technicalCoordination: 100,
        assetFieldTeam: 100,
        portalAdmin: 100
      })
    ).toEqual({
      approved: true,
      reason: 'READY'
    });
  });

  it('enforces hotfix, executive escalation, reconciliation and feature-freeze governance rules', () => {
    const service = new ReleaseGovernanceService();

    expect(
      service.evaluateHotfix({
        severity: 'S1',
        pipelineControlled: false,
        dualApproval: false,
        exceptionP1: true
      })
    ).toEqual({
      allowed: true,
      reason: 'P1_EXCEPTION'
    });

    expect(
      service.shouldEscalateExecutive({
        severity: 'S2',
        platformUnavailableMinutes: 45,
        sensitiveExposure: false
      })
    ).toBe(true);

    expect(
      service.buildReconciliationDeadline(new Date('2026-05-13T12:00:00.000Z'))
    ).toEqual({
      dueAt: new Date('2026-05-14T12:00:00.000Z')
    });

    expect(
      service.evaluateFeatureFreeze({
        daysSinceGoLive: 10,
        changeCategory: 'feature',
        bugSeverity: 'S3'
      })
    ).toEqual({
      allowed: false,
      reason: 'FEATURE_FREEZE_ACTIVE'
    });
  });
});
