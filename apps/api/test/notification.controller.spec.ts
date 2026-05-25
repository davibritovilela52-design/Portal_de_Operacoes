import { describe, expect, it } from 'vitest';

import {
  DispatchCriticalEventCommand,
  EvaluateSlaCheckpointCommand,
  NotificationApplicationService
} from '../src/modules/notifications/notification-application.service.js';
import { NotificationController } from '../src/modules/notifications/notification.controller.js';

describe('NotificationController', () => {
  const controller = new NotificationController({
    getCatalog: () => ({
      thresholds: [75, 90, 100],
      criticalEventTypes: ['sla_breach']
    }),
    evaluateSlaCheckpoint: async (request: EvaluateSlaCheckpointCommand) => request,
    dispatchCriticalEvent: async (request: DispatchCriticalEventCommand) => request
  } as unknown as NotificationApplicationService);

  it('returns the notification catalog for clients', () => {
    expect(controller.getCatalog()).toEqual({
      thresholds: [75, 90, 100],
      criticalEventTypes: ['sla_breach']
    });
  });

  it('delegates SLA checkpoint evaluation requests to the application service', async () => {
    const request = {
      actor: {
        userId: 'central-1',
        tenantId: 'tenant-a',
        role: 'central_operations' as const,
        assetIds: []
      },
      tenantId: 'tenant-a',
      assetId: 'asset-1',
      input: {
        ownerUserId: 'owner-1',
        subjectTitle: 'Agenda conflict for asset-1',
        elapsedPercent: 90,
        maintenanceTicketIds: []
      }
    };

    await expect(controller.evaluateSlaCheckpoint(request)).resolves.toStrictEqual(request);
  });

  it('delegates critical event dispatch requests to the application service', async () => {
    const request = {
      tenantId: 'tenant-a',
      assetId: 'asset-1',
      input: {
        eventType: 'provisional_technical_block' as const,
        subjectTitle: 'Emergency block on asset-1'
      }
    };

    await expect(controller.dispatchCriticalEvent(request)).resolves.toStrictEqual(request);
  });
});
