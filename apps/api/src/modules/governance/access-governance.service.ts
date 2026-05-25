import { Injectable } from '@nestjs/common';

import type { PortalRole } from '../access/access-policy.service.js';

export type AccessAssignment = {
  userId: string;
  role: PortalRole;
  lastReviewedAt: Date;
};

@Injectable()
export class AccessGovernanceService {
  requiresMfa(role: PortalRole): boolean {
    return (
      role === 'portal_admin' ||
      role === 'central_operations' ||
      role === 'yachts_operations' ||
      role === 'yachts_technical_coordination'
    );
  }

  evaluateRevocation(input: { requestedAt: Date; removedAt: Date }): {
    breach: boolean;
    elapsedMinutes: number;
    slaMinutes: 15;
  } {
    const elapsedMinutes = Math.floor(
      (input.removedAt.getTime() - input.requestedAt.getTime()) / 60000
    );

    return {
      breach: elapsedMinutes > 15,
      elapsedMinutes,
      slaMinutes: 15
    };
  }

  buildAccessReviewReport(
    assignments: AccessAssignment[],
    now: Date
  ): {
    dueReviews: Array<{
      userId: string;
      role: PortalRole;
      cadence: 'monthly' | 'quarterly';
    }>;
  } {
    const dueReviews = assignments
      .flatMap((assignment) => {
        const critical = this.requiresMfa(assignment.role);
        const cadence: 'monthly' | 'quarterly' = critical ? 'monthly' : 'quarterly';
        const reviewWindowDays = critical ? 30 : 90;
        const elapsedDays =
          (now.getTime() - assignment.lastReviewedAt.getTime()) / (24 * 60 * 60 * 1000);

        if (elapsedDays < reviewWindowDays) {
          return [];
        }

        return [
          {
            userId: assignment.userId,
            role: assignment.role,
            cadence
          }
        ];
      });

    return { dueReviews };
  }
}
