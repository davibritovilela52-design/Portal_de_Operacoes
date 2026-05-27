import { Module } from '@nestjs/common';

import { AccessModule } from '../access/access.module.js';
import { PrismaModule } from '../persistence/prisma.module.js';
import { AviationApplicationService } from './aviation-application.service.js';
import { PrismaAviationEvidenceRepository } from './aviation-evidence.repository.js';
import { PrismaAviationReportRepository } from './aviation-report.repository.js';
import { AviationWorkflowService } from './aviation-workflow.service.js';

@Module({
  imports: [AccessModule, PrismaModule],
  providers: [
    AviationWorkflowService,
    AviationApplicationService,
    PrismaAviationReportRepository,
    PrismaAviationEvidenceRepository
  ],
  exports: [AviationWorkflowService, AviationApplicationService]
})
export class AviationModule {}
