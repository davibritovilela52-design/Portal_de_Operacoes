import { Module } from '@nestjs/common';

import { ObservabilityApplicationService } from './observability-application.service.js';
import { ObservabilityController } from './observability.controller.js';
import {
  ObservabilityHealthIndicatorService,
  ObservabilityHealthService
} from './observability-health.service.js';
import { ObservabilityEventLogService } from './observability-event-log.service.js';
import { ObservabilityMetricsService } from './observability-metrics.service.js';
import { FleetHealthFacade } from './fleet-health.facade.js';

@Module({
  controllers: [ObservabilityController],
  providers: [
    ObservabilityHealthIndicatorService,
    ObservabilityHealthService,
    ObservabilityMetricsService,
    ObservabilityEventLogService,
    ObservabilityApplicationService,
    FleetHealthFacade
  ],
  exports: [
    ObservabilityHealthService,
    ObservabilityMetricsService,
    ObservabilityEventLogService,
    ObservabilityApplicationService,
    FleetHealthFacade
  ]
})
export class ObservabilityModule {}
