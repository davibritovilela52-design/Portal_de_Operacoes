import 'reflect-metadata';

import { describe, expect, it } from 'vitest';

import { AppModule } from '../src/app.module.js';
import { AccessModule } from '../src/modules/access/access.module.js';
import { AgendaModule } from '../src/modules/agenda/agenda.module.js';
import { AssetRegistryModule } from '../src/modules/asset-registry/asset-registry.module.js';
import { AuditModule } from '../src/modules/audit/audit.module.js';
import { AuthModule } from '../src/modules/auth/auth.module.js';
import { AviationModule } from '../src/modules/aviation/aviation.module.js';
import { CutoverModule } from '../src/modules/cutover/cutover.module.js';
import { RealEstateModule } from '../src/modules/real-estate/real-estate.module.js';
import { GovernanceModule } from '../src/modules/governance/governance.module.js';
import { MaintenanceModule } from '../src/modules/maintenance/maintenance.module.js';
import { NotificationModule } from '../src/modules/notifications/notification.module.js';
import { ObservabilityModule } from '../src/modules/observability/observability.module.js';

describe('AppModule', () => {
  it('wires the approved core domain modules in the expected boundary order', () => {
    const imports = Reflect.getMetadata('imports', AppModule) ?? [];

    expect(imports).toEqual([
      AccessModule,
      AuthModule,
      AssetRegistryModule,
      AuditModule,
      ObservabilityModule,
      GovernanceModule,
      AgendaModule,
      MaintenanceModule,
      AviationModule,
      RealEstateModule,
      NotificationModule,
      CutoverModule
    ]);
  });
});
