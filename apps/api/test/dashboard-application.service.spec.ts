import { describe, expect, it } from 'vitest';

import { DashboardApplicationService } from '../src/modules/governance/dashboard-application.service.js';

describe('DashboardApplicationService', () => {
  it('builds the basic operational snapshot for backlog, conflicts and availability by asset', () => {
    const service = new DashboardApplicationService();

    expect(
      service.buildSnapshot({
        tickets: [
          { assetId: 'asset-1', status: 'pending' },
          { assetId: 'asset-1', status: 'in_progress' },
          { assetId: 'asset-2', status: 'payment' }
        ],
        agendaConflicts: 2,
        availabilityByAsset: [
          {
            assetId: 'asset-1',
            availablePercent: 82
          },
          {
            assetId: 'asset-2',
            availablePercent: 95
          }
        ]
      })
    ).toEqual({
      backlog: {
        pending: 1,
        in_progress: 1,
        payment: 1
      },
      agendaConflicts: 2,
      availabilityByAsset: [
        {
          assetId: 'asset-1',
          availablePercent: 82
        },
        {
          assetId: 'asset-2',
          availablePercent: 95
        }
      ]
    });
  });
});
