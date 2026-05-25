import { Module } from '@nestjs/common';

import { PrismaModule } from '../persistence/prisma.module.js';
import { PortalSessionService } from './portal-session.service.js';
import { PrismaAccessAssignmentRepository } from '../access/access-assignment.repository.js';
import { BetterAuthProvisioningService } from './better-auth-provisioning.service.js';

@Module({
  imports: [PrismaModule],
  providers: [
    PrismaAccessAssignmentRepository,
    BetterAuthProvisioningService,
    PortalSessionService
  ],
  exports: [PortalSessionService, BetterAuthProvisioningService]
})
export class AuthModule {}
