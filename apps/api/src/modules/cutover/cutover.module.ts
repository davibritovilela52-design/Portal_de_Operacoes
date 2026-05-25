import { Module } from '@nestjs/common';

import { AccessModule } from '../access/access.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../persistence/prisma.module.js';
import { CutoverApplicationService } from './cutover-application.service.js';
import { CutoverController } from './cutover.controller.js';
import { CutoverGateService } from './cutover-gate.service.js';
import { PrismaCutoverRunRepository } from './cutover-run.repository.js';
import { CutoverRunbookService } from './cutover-runbook.service.js';

@Module({
  imports: [AccessModule, AuthModule, PrismaModule],
  controllers: [CutoverController],
  providers: [
    CutoverGateService,
    CutoverRunbookService,
    CutoverApplicationService,
    PrismaCutoverRunRepository
  ],
  exports: [CutoverApplicationService]
})
export class CutoverModule {}
