import { describe, expect, it } from 'vitest';

import { NotificationApplicationService } from '../src/modules/notifications/notification-application.service.js';
import { NotificationEscalationService } from '../src/modules/notifications/notification-escalation.service.js';
import { ObservabilityEventLogService } from '../src/modules/observability/observability-event-log.service.js';
import { ObservabilityMetricsService } from '../src/modules/observability/observability-metrics.service.js';

describe('NotificationApplicationService', () => {
  const service = new NotificationApplicationService(new NotificationEscalationService());

  it('returns the notification governance catalog for clients', () => {
    expect(service.getCatalog()).toEqual({
      thresholds: [75, 90, 100],
      criticalEventTypes: [
        'provisional_technical_block',
        'agenda_conflict',
        'emergency_maintenance',
        'sla_breach'
      ]
    });
  });

  it('sends only the direct owner alert at the 75% SLA checkpoint', async () => {
    const result = await service.evaluateSlaCheckpoint({
      actor: {
        userId: 'central-1',
        tenantId: 'tenant-a',
        role: 'central_operations',
        assetIds: []
      },
      tenantId: 'tenant-a',
      assetId: 'asset-1',
      input: {
        ownerUserId: 'owner-1',
        subjectTitle: 'Agenda conflict for asset-1',
        elapsedPercent: 75,
        maintenanceTicketIds: []
      }
    });

    expect(result).toEqual({
      processed: true,
      reason: 'ALERT_TRIGGERED',
      threshold: 75,
      notifications: [
        {
          channel: 'in_app',
          recipientType: 'direct_owner',
          recipientUserId: 'owner-1',
          urgency: 'warning',
          message: 'SLA checkpoint 75% reached for Agenda conflict for asset-1.'
        }
      ]
    });
  });

  it('keeps the 100% SLA checkpoint as notification-only escalation', async () => {
    const result = await service.evaluateSlaCheckpoint({
      actor: {
        userId: 'central-1',
        tenantId: 'tenant-a',
        role: 'central_operations',
        assetIds: []
      },
      tenantId: 'tenant-a',
      assetId: 'asset-1',
      input: {
        ownerUserId: 'owner-1',
        subjectTitle: 'Agenda conflict for asset-1',
        elapsedPercent: 100,
        maintenanceTicketIds: []
      }
    });

    expect(result).toEqual({
      processed: true,
      reason: 'ALERT_TRIGGERED',
      threshold: 100,
      notifications: [
        {
          channel: 'in_app',
          recipientType: 'direct_owner',
          recipientUserId: 'owner-1',
          urgency: 'critical',
          message: 'SLA checkpoint 100% reached for Agenda conflict for asset-1.'
        },
        {
          channel: 'in_app',
          recipientType: 'central_operations',
          urgency: 'critical',
          message: 'SLA checkpoint 100% reached for Agenda conflict for asset-1.'
        }
      ]
    });
  });

  it('dispatches immediate critical event notifications to central operations', async () => {
    const result = await service.dispatchCriticalEvent({
      tenantId: 'tenant-a',
      assetId: 'asset-1',
      input: {
        eventType: 'provisional_technical_block',
        subjectTitle: 'Emergency block on asset-1'
      }
    });

    expect(result).toEqual({
      dispatched: true,
      notifications: [
        {
          channel: 'in_app',
          recipientType: 'central_operations',
          urgency: 'critical',
          message: 'Immediate critical event provisional_technical_block for Emergency block on asset-1.'
        }
      ]
    });
  });

  it('records SLA metrics and a structured trace event when a critical checkpoint is processed', async () => {
    const metrics = new ObservabilityMetricsService();
    const logs = new ObservabilityEventLogService();
    const instrumentedService = new (
      NotificationApplicationService as unknown as new (...args: any[]) => NotificationApplicationService
    )(new NotificationEscalationService(), metrics, logs);

    await instrumentedService.evaluateSlaCheckpoint({
      actor: {
        userId: 'central-1',
        tenantId: 'tenant-a',
        role: 'central_operations',
        assetIds: []
      },
      tenantId: 'tenant-a',
      assetId: 'asset-1',
      input: {
        ownerUserId: 'owner-1',
        subjectTitle: 'Agenda conflict for asset-1',
        elapsedPercent: 100,
        maintenanceTicketIds: []
      }
    });

    expect(metrics.getSnapshot()).toEqual({
      slaCheckpoints: {
        75: 0,
        90: 0,
        100: 1
      },
      agendaConflicts: 0,
      p1Overdue: 0,
      authorizationFailures: 0
    });
    expect(logs.listRecentEvents()).toEqual([
      expect.objectContaining({
        domain: 'notifications',
        action: 'sla_checkpoint',
        entityId: 'asset-1',
        outcome: 'success',
        metadata: {
          threshold: 100,
          subjectTitle: 'Agenda conflict for asset-1',
          centralEscalationRequired: true
        }
      })
    ]);
    expect(logs.listRecentEvents()[0]?.correlation_id).toBeTruthy();
  });
});
