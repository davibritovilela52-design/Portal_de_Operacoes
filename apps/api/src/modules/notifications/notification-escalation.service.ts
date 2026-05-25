import { Injectable } from '@nestjs/common';

export type SlaThreshold = 75 | 90 | 100;

export type CriticalEventType =
  | 'provisional_technical_block'
  | 'agenda_conflict'
  | 'emergency_maintenance'
  | 'sla_breach';

export type NotificationMessage = {
  channel: 'in_app';
  recipientType: 'direct_owner' | 'central_operations';
  recipientUserId?: string;
  urgency: 'warning' | 'critical';
  message: string;
};

export type EvaluateSlaCheckpointInput = {
  elapsedPercent: number;
  ownerUserId: string;
  subjectTitle: string;
};

export type EvaluateSlaCheckpointResult = {
  threshold: SlaThreshold | null;
  centralEscalationRequired: boolean;
  notifications: NotificationMessage[];
};

export type DispatchCriticalEventInput = {
  eventType: CriticalEventType;
  subjectTitle: string;
};

const thresholds: SlaThreshold[] = [75, 90, 100];
const criticalEventTypes: CriticalEventType[] = [
  'provisional_technical_block',
  'agenda_conflict',
  'emergency_maintenance',
  'sla_breach'
];

@Injectable()
export class NotificationEscalationService {
  getCatalog(): { thresholds: SlaThreshold[]; criticalEventTypes: CriticalEventType[] } {
    return {
      thresholds: [...thresholds],
      criticalEventTypes: [...criticalEventTypes]
    };
  }

  evaluateSlaCheckpoint(input: EvaluateSlaCheckpointInput): EvaluateSlaCheckpointResult {
    const threshold = this.resolveThreshold(input.elapsedPercent);

    if (threshold === null) {
      return {
        threshold: null,
        centralEscalationRequired: false,
        notifications: []
      };
    }

    const urgency = threshold === 100 ? 'critical' : 'warning';
    const message = `SLA checkpoint ${threshold}% reached for ${input.subjectTitle}.`;
    const notifications: NotificationMessage[] = [
      {
        channel: 'in_app',
        recipientType: 'direct_owner',
        recipientUserId: input.ownerUserId,
        urgency,
        message
      }
    ];

    if (threshold >= 90) {
      notifications.push({
        channel: 'in_app',
        recipientType: 'central_operations',
        urgency,
        message
      });
    }

    return {
      threshold,
      centralEscalationRequired: threshold === 100,
      notifications
    };
  }

  dispatchCriticalEvent(input: DispatchCriticalEventInput): { notifications: NotificationMessage[] } {
    return {
      notifications: [
        {
          channel: 'in_app',
          recipientType: 'central_operations',
          urgency: 'critical',
          message: `Immediate critical event ${input.eventType} for ${input.subjectTitle}.`
        }
      ]
    };
  }

  private resolveThreshold(elapsedPercent: number): SlaThreshold | null {
    if (elapsedPercent >= 100) {
      return 100;
    }

    if (elapsedPercent >= 90) {
      return 90;
    }

    if (elapsedPercent >= 75) {
      return 75;
    }

    return null;
  }
}
