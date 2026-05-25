import { Injectable } from '@nestjs/common';

import type { SlaThreshold } from '../notifications/notification-escalation.service.js';

export type ObservabilityMetricsSnapshot = {
  slaCheckpoints: Record<SlaThreshold, number>;
  agendaConflicts: number;
  p1Overdue: number;
  authorizationFailures: number;
};

@Injectable()
export class ObservabilityMetricsService {
  private readonly snapshot: ObservabilityMetricsSnapshot = {
    slaCheckpoints: {
      75: 0,
      90: 0,
      100: 0
    },
    agendaConflicts: 0,
    p1Overdue: 0,
    authorizationFailures: 0
  };

  recordSlaCheckpoint(threshold: SlaThreshold): void {
    this.snapshot.slaCheckpoints[threshold] += 1;
  }

  recordAgendaConflict(): void {
    this.snapshot.agendaConflicts += 1;
  }

  recordP1Overdue(): void {
    this.snapshot.p1Overdue += 1;
  }

  recordAuthorizationFailure(): void {
    this.snapshot.authorizationFailures += 1;
  }

  getSnapshot(): ObservabilityMetricsSnapshot {
    return {
      slaCheckpoints: {
        75: this.snapshot.slaCheckpoints[75],
        90: this.snapshot.slaCheckpoints[90],
        100: this.snapshot.slaCheckpoints[100]
      },
      agendaConflicts: this.snapshot.agendaConflicts,
      p1Overdue: this.snapshot.p1Overdue,
      authorizationFailures: this.snapshot.authorizationFailures
    };
  }
}
