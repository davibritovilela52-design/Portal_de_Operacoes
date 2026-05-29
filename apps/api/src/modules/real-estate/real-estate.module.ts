import { Module } from '@nestjs/common';

import { AccessModule } from '../access/access.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { GovernanceModule } from '../governance/governance.module.js';
import { PrismaModule } from '../persistence/prisma.module.js';
import { RealEstateApplicationService } from './real-estate-application.service.js';
import { RealEstateController } from './real-estate.controller.js';
import { PrismaRealEstateEvidenceRepository } from './real-estate-evidence.repository.js';
import { PrismaRealEstateReportRepository } from './real-estate-report.repository.js';
import { RealEstateWorkflowService } from './real-estate-workflow.service.js';

@Module({
  imports: [AccessModule, AuthModule, GovernanceModule, PrismaModule],
  controllers: [RealEstateController],
  providers: [
    RealEstateWorkflowService,
    RealEstateApplicationService,
    PrismaRealEstateReportRepository,
    PrismaRealEstateEvidenceRepository
  ],
  exports: [RealEstateWorkflowService, RealEstateApplicationService]
})
export class RealEstateModule {}
