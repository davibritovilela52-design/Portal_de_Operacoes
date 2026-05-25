import { Body, Controller, Get, Post } from '@nestjs/common';

import {
  DispatchCriticalEventCommand,
  DispatchCriticalEventCommandResult,
  EvaluateSlaCheckpointCommand,
  EvaluateSlaCheckpointCommandResult,
  NotificationApplicationService
} from './notification-application.service.js';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationApplicationService: NotificationApplicationService) {}

  @Get('catalog')
  getCatalog(): ReturnType<NotificationApplicationService['getCatalog']> {
    return this.notificationApplicationService.getCatalog();
  }

  @Post('sla-checkpoints')
  async evaluateSlaCheckpoint(
    @Body() command: EvaluateSlaCheckpointCommand
  ): Promise<EvaluateSlaCheckpointCommandResult> {
    return await this.notificationApplicationService.evaluateSlaCheckpoint(command);
  }

  @Post('critical-events')
  async dispatchCriticalEvent(
    @Body() command: DispatchCriticalEventCommand
  ): Promise<DispatchCriticalEventCommandResult> {
    return await this.notificationApplicationService.dispatchCriticalEvent(command);
  }
}
