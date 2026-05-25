import { Module } from '@nestjs/common';

import { AccessModule } from '../access/access.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { ObservabilityModule } from '../observability/observability.module.js';
import { PrismaModule } from '../persistence/prisma.module.js';
import { AssetRegistryApplicationService } from './asset-registry-application.service.js';
import { AssetRegistryController } from './asset-registry.controller.js';
import { PrismaAssetRegistryRepository } from './asset-registry.repository.js';

@Module({
  imports: [AccessModule, AuthModule, ObservabilityModule, PrismaModule],
  controllers: [AssetRegistryController],
  providers: [AssetRegistryApplicationService, PrismaAssetRegistryRepository],
  exports: [AssetRegistryApplicationService]
})
export class AssetRegistryModule {}
