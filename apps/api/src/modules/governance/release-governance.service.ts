import { Injectable } from '@nestjs/common';

@Injectable()
export class ReleaseGovernanceService {
  evaluateGoNoGo(input: {
    centralOperations: boolean;
    technicalCoordination: boolean;
    portalAdmin: boolean;
  }):
    | {
        approved: true;
        reason: 'APPROVED';
      }
    | {
        approved: false;
        reason: 'UNANIMITY_REQUIRED';
        missingApprovals: Array<'centralOperations' | 'technicalCoordination' | 'portalAdmin'>;
      } {
    const missingApprovals = (Object.entries(input) as Array<
      ['centralOperations' | 'technicalCoordination' | 'portalAdmin', boolean]
    >)
      .filter(([, approved]) => !approved)
      .map(([approval]) => approval);

    if (missingApprovals.length > 0) {
      return {
        approved: false,
        reason: 'UNANIMITY_REQUIRED',
        missingApprovals
      };
    }

    return {
      approved: true,
      reason: 'APPROVED'
    };
  }

  evaluateReadiness(input: {
    centralOperations: number;
    technicalCoordination: number;
    assetFieldTeam: number;
    portalAdmin: number;
  }):
    | {
        approved: true;
        reason: 'READY';
      }
    | {
        approved: false;
        reason: 'READINESS_INCOMPLETE';
      } {
    const allReady = Object.values(input).every((percent) => percent === 100);

    return allReady
      ? {
          approved: true,
          reason: 'READY'
        }
      : {
          approved: false,
          reason: 'READINESS_INCOMPLETE'
        };
  }

  evaluateHotfix(input: {
    severity: 'S1' | 'S2' | 'S3' | 'S4';
    pipelineControlled: boolean;
    dualApproval: boolean;
    exceptionP1: boolean;
  }):
    | {
        allowed: true;
        reason: 'CONTROLLED_RELEASE' | 'P1_EXCEPTION';
      }
    | {
        allowed: false;
        reason: 'HOTFIX_POLICY_BLOCKED';
      } {
    if (input.pipelineControlled && input.dualApproval) {
      return {
        allowed: true,
        reason: 'CONTROLLED_RELEASE'
      };
    }

    if (input.exceptionP1 && input.severity === 'S1') {
      return {
        allowed: true,
        reason: 'P1_EXCEPTION'
      };
    }

    return {
      allowed: false,
      reason: 'HOTFIX_POLICY_BLOCKED'
    };
  }

  shouldEscalateExecutive(input: {
    severity: 'S1' | 'S2' | 'S3' | 'S4';
    platformUnavailableMinutes: number;
    sensitiveExposure: boolean;
  }): boolean {
    return (
      input.severity === 'S1' ||
      input.platformUnavailableMinutes > 30 ||
      input.sensitiveExposure
    );
  }

  buildReconciliationDeadline(occurredAt: Date): { dueAt: Date } {
    return {
      dueAt: new Date(occurredAt.getTime() + 24 * 60 * 60 * 1000)
    };
  }

  evaluateFeatureFreeze(input: {
    daysSinceGoLive: number;
    changeCategory: 'feature' | 'security' | 'compliance' | 'bugfix';
    bugSeverity: 'S1' | 'S2' | 'S3' | 'S4';
  }):
    | {
        allowed: true;
        reason: 'ALLOWED';
      }
    | {
        allowed: false;
        reason: 'FEATURE_FREEZE_ACTIVE';
      } {
    const freezeActive = input.daysSinceGoLive <= 30;
    const allowedDuringFreeze =
      input.changeCategory === 'security' ||
      input.changeCategory === 'compliance' ||
      (input.changeCategory === 'bugfix' &&
        (input.bugSeverity === 'S1' || input.bugSeverity === 'S2'));

    if (freezeActive && !allowedDuringFreeze) {
      return {
        allowed: false,
        reason: 'FEATURE_FREEZE_ACTIVE'
      };
    }

    return {
      allowed: true,
      reason: 'ALLOWED'
    };
  }
}
