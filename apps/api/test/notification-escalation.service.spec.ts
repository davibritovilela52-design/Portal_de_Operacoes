import { describe, expect, it } from 'vitest';

import { NotificationEscalationService } from '../src/modules/notifications/notification-escalation.service.js';

describe('NotificationEscalationService', () => {
  const service = new NotificationEscalationService();

  it('publishes the official SLA thresholds and critical event catalog', () => {
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

  it('alerts only the direct owner when 75% of the SLA is reached', () => {
    const result = service.evaluateSlaCheckpoint({
      elapsedPercent: 75,
      ownerUserId: 'owner-1',
      subjectTitle: 'Agenda conflict for asset-1'
    });

    expect(result).toEqual({
      threshold: 75,
      centralEscalationRequired: false,
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

  it('alerts the direct owner and central operations when 90% of the SLA is reached', () => {
    const result = service.evaluateSlaCheckpoint({
      elapsedPercent: 90,
      ownerUserId: 'owner-1',
      subjectTitle: 'Agenda conflict for asset-1'
    });

    expect(result).toEqual({
      threshold: 90,
      centralEscalationRequired: false,
      notifications: [
        {
          channel: 'in_app',
          recipientType: 'direct_owner',
          recipientUserId: 'owner-1',
          urgency: 'warning',
          message: 'SLA checkpoint 90% reached for Agenda conflict for asset-1.'
        },
        {
          channel: 'in_app',
          recipientType: 'central_operations',
          urgency: 'warning',
          message: 'SLA checkpoint 90% reached for Agenda conflict for asset-1.'
        }
      ]
    });
  });

  it('requires governance escalation when the SLA breach reaches 100%', () => {
    const result = service.evaluateSlaCheckpoint({
      elapsedPercent: 100,
      ownerUserId: 'owner-1',
      subjectTitle: 'Agenda conflict for asset-1'
    });

    expect(result).toEqual({
      threshold: 100,
      centralEscalationRequired: true,
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

  it('creates an immediate central operations alert for a critical operational event', () => {
    const result = service.dispatchCriticalEvent({
      eventType: 'provisional_technical_block',
      subjectTitle: 'Emergency block on asset-1'
    });

    expect(result).toEqual({
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
});
