import { Controller, Get } from '@nestjs/common';

import { ObservabilityApplicationService } from './observability-application.service.js';

@Controller('observability')
export class ObservabilityController {
  constructor(private readonly observabilityApplicationService: ObservabilityApplicationService) {}

  @Get('health')
  getHealth(): ReturnType<ObservabilityApplicationService['getHealth']> {
    return this.observabilityApplicationService.getHealth();
  }

  @Get('metrics')
  getMetrics(): ReturnType<ObservabilityApplicationService['getMetrics']> {
    return this.observabilityApplicationService.getMetrics();
  }

  @Get('events')
  getRecentEvents(): ReturnType<ObservabilityApplicationService['getRecentEvents']> {
    return this.observabilityApplicationService.getRecentEvents();
  }
}
