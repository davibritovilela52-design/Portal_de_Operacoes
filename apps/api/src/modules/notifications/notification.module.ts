import { Module } from '@nestjs/common';

import { ObservabilityModule } from '../observability/observability.module.js';
import { NotificationApplicationService } from './notification-application.service.js';
import { NotificationController } from './notification.controller.js';
import { NotificationEscalationService } from './notification-escalation.service.js';

@Module({
  imports: [ObservabilityModule],
  controllers: [NotificationController],
  providers: [NotificationEscalationService, NotificationApplicationService],
  exports: [NotificationApplicationService]
})
export class NotificationModule {}
