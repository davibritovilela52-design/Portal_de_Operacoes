import { Module } from '@nestjs/common';

import { AccessModule } from '../access/access.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { AuditApplicationService } from './audit-application.service.js';
import { AuditController } from './audit.controller.js';
import { PrismaAuditDecisionMemoRepository } from './audit-decision-memo.repository.js';
import { PrismaModule } from '../persistence/prisma.module.js';
import { PrismaAuditRectificationRepository } from './audit-rectification.repository.js';
import { AuditGovernanceService } from './audit-governance.service.js';

@Module({
  imports: [AccessModule, AuthModule, PrismaModule],
  controllers: [AuditController],
  providers: [
    AuditGovernanceService,
    AuditApplicationService,
    PrismaAuditRectificationRepository,
    PrismaAuditDecisionMemoRepository
  ],
  exports: [AuditGovernanceService, AuditApplicationService]
})
export class AuditModule {}
