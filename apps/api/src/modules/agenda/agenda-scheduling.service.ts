import { Injectable } from '@nestjs/common';

export type AgendaEventType =
  | 'utilization'
  | 'planned_maintenance'
  | 'emergency_maintenance'
  | 'operational_block'
  | 'crew_rest';

export type AgendaEvent = {
  id?: string;
  assetId: string;
  type: AgendaEventType;
  title?: string;
  description?: string;
  legacyMetadata?: Record<string, unknown>;
  startsAt: Date;
  endsAt: Date;
  safeMinimumBreached?: boolean;
  provisional?: boolean;
  validatedAt?: Date;
};

export type ScheduleAgendaEventResult =
  | {
      allowed: true;
      reason: 'SCHEDULED';
      event: AgendaEvent;
    }
  | {
      allowed: false;
      reason: 'ASSET_TIME_CONFLICT';
      conflictingEventId?: string;
    };

export type ProvisionalBlockStatus = {
  breach: boolean;
  escalationRequired: boolean;
  utilizationReleaseAllowed: boolean;
};

const agendaEventTypes: AgendaEventType[] = [
  'utilization',
  'planned_maintenance',
  'emergency_maintenance',
  'operational_block',
  'crew_rest'
];

@Injectable()
export class AgendaSchedulingService {
  getCatalog(): { eventTypes: AgendaEventType[] } {
    return {
      eventTypes: [...agendaEventTypes]
    };
  }

  scheduleEvent(existingEvents: AgendaEvent[], candidateEvent: AgendaEvent): ScheduleAgendaEventResult {
    const conflictingEvent = existingEvents.find((event) =>
      event.assetId === candidateEvent.assetId && this.overlaps(event, candidateEvent)
    );

    if (conflictingEvent) {
      return {
        allowed: false,
        reason: 'ASSET_TIME_CONFLICT',
        conflictingEventId: conflictingEvent.id
      };
    }

    return {
      allowed: true,
      reason: 'SCHEDULED',
      event: candidateEvent
    };
  }

  getOperationalPriority(event: AgendaEvent): number {
    switch (event.type) {
      case 'emergency_maintenance':
        return 1;
      case 'operational_block':
        return 2;
      case 'crew_rest':
        return event.safeMinimumBreached ? 3 : 5;
      case 'utilization':
        return 4;
      case 'planned_maintenance':
        return 6;
    }
  }

  evaluateProvisionalBlock(event: AgendaEvent, now: Date): ProvisionalBlockStatus {
    if (!event.provisional) {
      return {
        breach: false,
        escalationRequired: false,
        utilizationReleaseAllowed: true
      };
    }

    if (event.validatedAt) {
      return {
        breach: false,
        escalationRequired: false,
        utilizationReleaseAllowed: true
      };
    }

    const hoursSinceBlock = now.getTime() - event.startsAt.getTime();
    const validationExpired = hoursSinceBlock >= 24 * 60 * 60 * 1000;

    return {
      breach: validationExpired,
      escalationRequired: validationExpired,
      utilizationReleaseAllowed: false
    };
  }

  private overlaps(left: AgendaEvent, right: AgendaEvent): boolean {
    return left.startsAt < right.endsAt && right.startsAt < left.endsAt;
  }
}
