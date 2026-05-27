import { Module } from '@nestjs/common';

import { AccessModule } from '../access/access.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { GovernanceModule } from '../governance/governance.module.js';
import { PrismaModule } from '../persistence/prisma.module.js';
import { AviationApplicationService } from './aviation-application.service.js';
import { AviationController } from './aviation.controller.js';
import { PrismaAviationEvidenceRepository } from './aviation-evidence.repository.js';
import { PrismaAviationReportRepository } from './aviation-report.repository.js';
import { AviationWorkflowService } from './aviation-workflow.service.js';

@Module({
  imports: [AccessModule, AuthModule, GovernanceModule, PrismaModule],
  controllers: [AviationController],
  providers: [
    AviationWorkflowService,
    AviationApplicationService,
    PrismaAviationReportRepository,
    PrismaAviationEvidenceRepository
  ],
  exports: [AviationWorkflowService, AviationApplicationService]
})
export class AviationModule {}
