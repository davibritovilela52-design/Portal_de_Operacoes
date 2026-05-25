import { Module } from '@nestjs/common';

import { AccessModule } from '../access/access.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { ObservabilityModule } from '../observability/observability.module.js';
import { PrismaModule } from '../persistence/prisma.module.js';
import { AgendaApplicationService } from './agenda-application.service.js';
import { AgendaController } from './agenda.controller.js';
import { PrismaAgendaEventRepository } from './agenda-event.repository.js';
import { AgendaSchedulingService } from './agenda-scheduling.service.js';

@Module({
  imports: [AccessModule, AuditModule, AuthModule, ObservabilityModule, PrismaModule],
  controllers: [AgendaController],
  providers: [AgendaSchedulingService, AgendaApplicationService, PrismaAgendaEventRepository],
  exports: [AgendaSchedulingService, AgendaApplicationService]
})
export class AgendaModule {}
