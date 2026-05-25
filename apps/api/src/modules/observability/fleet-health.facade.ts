import { Inject, Injectable } from '@nestjs/common';

import {
  ObservabilityHealthReport,
  ObservabilityHealthService
} from './observability-health.service.js';

export type FleetHealthSnapshot = {
  fleetHealth: ObservabilityHealthReport;
};

@Injectable()
export class FleetHealthFacade {
  constructor(
    @Inject(ObservabilityHealthService)
    private readonly observabilityHealthService: Pick<ObservabilityHealthService, 'evaluateHealth'>
  ) {}

  async getFleetHealth(): Promise<FleetHealthSnapshot> {
    return {
      fleetHealth: await this.observabilityHealthService.evaluateHealth()
    };
  }
}
