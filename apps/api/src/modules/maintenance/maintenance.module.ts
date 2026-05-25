import { Module } from '@nestjs/common';

import { AccessModule } from '../access/access.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { GovernanceModule } from '../governance/governance.module.js';
import { PrismaModule } from '../persistence/prisma.module.js';
import { MaintenanceApplicationService } from './maintenance-application.service.js';
import { PrismaMaintenanceCostRepository } from './maintenance-cost.repository.js';
import { MaintenanceController } from './maintenance.controller.js';
import { PrismaMaintenanceEvidenceRepository } from './maintenance-evidence.repository.js';
import { PrismaMaintenanceTicketRepository } from './maintenance-ticket.repository.js';
import { MaintenanceWorkflowService } from './maintenance-workflow.service.js';

@Module({
  imports: [AccessModule, AuthModule, GovernanceModule, PrismaModule],
  controllers: [MaintenanceController],
  providers: [
    MaintenanceWorkflowService,
    MaintenanceApplicationService,
    PrismaMaintenanceTicketRepository,
    PrismaMaintenanceCostRepository,
    PrismaMaintenanceEvidenceRepository
  ],
  exports: [MaintenanceWorkflowService, MaintenanceApplicationService]
})
export class MaintenanceModule {}
