import { Injectable } from '@nestjs/common';

import { MaintenanceStatus } from '../maintenance/maintenance-workflow.service.js';

@Injectable()
export class DashboardApplicationService {
  buildSnapshot(input: {
    tickets: Array<{ assetId: string; status: MaintenanceStatus }>;
    agendaConflicts: number;
    availabilityByAsset: Array<{ assetId: string; availablePercent: number }>;
  }): {
    backlog: Partial<Record<MaintenanceStatus, number>>;
    agendaConflicts: number;
    availabilityByAsset: Array<{ assetId: string; availablePercent: number }>;
  } {
    const backlog = input.tickets.reduce<Partial<Record<MaintenanceStatus, number>>>((acc, ticket) => {
      acc[ticket.status] = (acc[ticket.status] ?? 0) + 1;
      return acc;
    }, {});

    return {
      backlog,
      agendaConflicts: input.agendaConflicts,
      availabilityByAsset: [...input.availabilityByAsset]
    };
  }
}
