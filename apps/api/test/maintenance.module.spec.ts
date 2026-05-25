import 'reflect-metadata';

import { describe, expect, it } from 'vitest';

import { MaintenanceModule } from '../src/modules/maintenance/maintenance.module.js';

describe('MaintenanceModule', () => {
  it('registers and exports the maintenance workflow service for downstream domain modules', () => {
    const providers = Reflect.getMetadata('providers', MaintenanceModule) ?? [];
    const exportsList = Reflect.getMetadata('exports', MaintenanceModule) ?? [];

    const providerNames = providers.map((provider: { name?: string }) => provider?.name);
    const exportNames = exportsList.map((provider: { name?: string }) => provider?.name);

    expect(providerNames).toContain('MaintenanceWorkflowService');
    expect(exportNames).toContain('MaintenanceWorkflowService');
  });
});
