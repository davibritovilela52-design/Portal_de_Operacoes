import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { GovernanceModule } from '../governance/governance.module.js';
import { ObservabilityModule } from '../observability/observability.module.js';
import { PrismaModule } from '../persistence/prisma.module.js';
import { AccessApplicationService } from './access-application.service.js';
import { PrismaAccessAssignmentRepository } from './access-assignment.repository.js';
import { AccessController } from './access.controller.js';
import { AccessPolicyService } from './access-policy.service.js';

@Module({
  imports: [AuthModule, GovernanceModule, ObservabilityModule, PrismaModule],
  controllers: [AccessController],
  providers: [AccessPolicyService, AccessApplicationService, PrismaAccessAssignmentRepository],
  exports: [AccessPolicyService, AccessApplicationService]
})
export class AccessModule {}
