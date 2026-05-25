import { Injectable } from '@nestjs/common';

import type { PortalRole } from '../access/access-policy.service.js';
import { CriticalActionJustification } from '../audit/audit-governance.service.js';

@Injectable()
export class CapacityGovernanceService {
  evaluateAllocation(input: {
    assetId: string;
    inProgressCount: number;
    limit: number;
    actorRole: PortalRole;
    justification?: CriticalActionJustification;
  }):
    | {
        allowed: true;
        reason: 'ALLOWED' | 'OVERRIDE_ALLOWED';
        riskEventRequired: boolean;
      }
    | {
        allowed: false;
        reason: 'CAPACITY_LIMIT_REACHED' | 'JUSTIFICATION_REQUIRED';
        riskEventRequired: true;
      } {
    if (input.inProgressCount <= input.limit) {
      return {
        allowed: true,
        reason: 'ALLOWED',
        riskEventRequired: false
      };
    }

    if (input.actorRole === 'central_operations' && this.hasStructuredJustification(input.justification)) {
      return {
        allowed: true,
        reason: 'OVERRIDE_ALLOWED',
        riskEventRequired: true
      };
    }

    if (input.actorRole === 'central_operations') {
      return {
        allowed: false,
        reason: 'JUSTIFICATION_REQUIRED',
        riskEventRequired: true
      };
    }

    return {
      allowed: false,
      reason: 'CAPACITY_LIMIT_REACHED',
      riskEventRequired: true
    };
  }

  private hasStructuredJustification(
    justification?: CriticalActionJustification
  ): justification is CriticalActionJustification {
    return Boolean(
      justification?.context.trim() &&
        justification.decision.trim() &&
        justification.decidedBy.trim() &&
        justification.alternativesConsidered.length > 0 &&
        justification.expectedImpact.trim()
    );
  }
}
