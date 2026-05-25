import { Injectable, Optional } from '@nestjs/common';

import { AccessActor } from '../access/access-policy.service.js';
import { ObservabilityEventLogService } from '../observability/observability-event-log.service.js';
import { ObservabilityMetricsService } from '../observability/observability-metrics.service.js';
import {
  CriticalEventType,
  NotificationEscalationService,
  NotificationMessage,
  SlaThreshold
} from './notification-escalation.service.js';

export type EvaluateSlaCheckpointCommand = {
  actor: AccessActor;
  tenantId: string;
  assetId: string;
  input: {
    ownerUserId: string;
    subjectTitle: string;
    elapsedPercent: number;
    maintenanceTicketIds: string[];
  };
};

export type EvaluateSlaCheckpointCommandResult =
  | {
      processed: true;
      reason: 'NO_ALERT';
      notifications: [];
    }
  | {
      processed: true;
      reason: 'ALERT_TRIGGERED';
      threshold: SlaThreshold;
      notifications: NotificationMessage[];
    };

export type DispatchCriticalEventCommand = {
  tenantId: string;
  assetId: string;
  input: {
    eventType: CriticalEventType;
    subjectTitle: string;
  };
};

export type DispatchCriticalEventCommandResult = {
  dispatched: true;
  notifications: NotificationMessage[];
};

@Injectable()
export class NotificationApplicationService {
  constructor(
    private readonly notificationEscalationService: NotificationEscalationService,
    @Optional()
    private readonly observabilityMetricsService?: ObservabilityMetricsService,
    @Optional()
    private readonly observabilityEventLogService?: ObservabilityEventLogService
  ) {}

  getCatalog(): ReturnType<NotificationEscalationService['getCatalog']> {
    return this.notificationEscalationService.getCatalog();
  }

  async evaluateSlaCheckpoint(
    command: EvaluateSlaCheckpointCommand
  ): Promise<EvaluateSlaCheckpointCommandResult> {
    const decision = this.notificationEscalationService.evaluateSlaCheckpoint(command.input);

    if (decision.threshold === null) {
      return {
        processed: true,
        reason: 'NO_ALERT',
        notifications: []
      };
    }

    this.observabilityMetricsService?.recordSlaCheckpoint(decision.threshold);
    this.observabilityEventLogService?.record({
      domain: 'notifications',
      action: 'sla_checkpoint',
      entityId: command.assetId,
      outcome: 'success',
      metadata: {
        threshold: decision.threshold,
        subjectTitle: command.input.subjectTitle,
        centralEscalationRequired: decision.centralEscalationRequired
      }
    });

    return {
      processed: true,
      reason: 'ALERT_TRIGGERED',
      threshold: decision.threshold,
      notifications: decision.notifications
    };
  }

  async dispatchCriticalEvent(
    command: DispatchCriticalEventCommand
  ): Promise<DispatchCriticalEventCommandResult> {
    this.observabilityEventLogService?.record({
      domain: 'notifications',
      action: 'critical_event_dispatch',
      entityId: command.assetId,
      outcome: 'success',
      metadata: {
        eventType: command.input.eventType,
        subjectTitle: command.input.subjectTitle
      }
    });

    return {
      dispatched: true,
      notifications: this.notificationEscalationService.dispatchCriticalEvent(command.input)
        .notifications
    };
  }
}
