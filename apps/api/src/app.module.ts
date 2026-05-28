import { Module } from '@nestjs/common';

import { AccessModule } from './modules/access/access.module.js';
import { AgendaModule } from './modules/agenda/agenda.module.js';
import { AssetRegistryModule } from './modules/asset-registry/asset-registry.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { AviationModule } from './modules/aviation/aviation.module.js';
import { CutoverModule } from './modules/cutover/cutover.module.js';
import { GovernanceModule } from './modules/governance/governance.module.js';
import { MaintenanceModule } from './modules/maintenance/maintenance.module.js';
import { NotificationModule } from './modules/notifications/notification.module.js';
import { ObservabilityModule } from './modules/observability/observability.module.js';

@Module({
  imports: [
    AccessModule,
    AuthModule,
    AssetRegistryModule,
    AuditModule,
    ObservabilityModule,
    GovernanceModule,
    AgendaModule,
    MaintenanceModule,
    AviationModule,
    NotificationModule,
    CutoverModule
  ]
})
export class AppModule {}
