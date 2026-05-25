import { Injectable } from '@nestjs/common';

import {
  ObservabilityEventLogService,
  ObservabilityEventRecord
} from './observability-event-log.service.js';
import {
  ObservabilityHealthReport,
  ObservabilityHealthService
} from './observability-health.service.js';
import {
  ObservabilityMetricsService,
  ObservabilityMetricsSnapshot
} from './observability-metrics.service.js';

@Injectable()
export class ObservabilityApplicationService {
  constructor(
    private readonly observabilityHealthService: ObservabilityHealthService,
    private readonly observabilityMetricsService: ObservabilityMetricsService,
    private readonly observabilityEventLogService: ObservabilityEventLogService
  ) {}

  getHealth(): Promise<ObservabilityHealthReport> {
    return this.observabilityHealthService.evaluateHealth();
  }

  getMetrics(): ObservabilityMetricsSnapshot {
    return this.observabilityMetricsService.getSnapshot();
  }

  getRecentEvents(): ObservabilityEventRecord[] {
    return this.observabilityEventLogService.listRecentEvents();
  }
}
