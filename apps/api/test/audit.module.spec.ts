import 'reflect-metadata';

import { describe, expect, it } from 'vitest';

import { AuditModule } from '../src/modules/audit/audit.module.js';

describe('AuditModule', () => {
  it('registers and exports the audit governance service for downstream domain modules', () => {
    const providers = Reflect.getMetadata('providers', AuditModule) ?? [];
    const exportsList = Reflect.getMetadata('exports', AuditModule) ?? [];

    const providerNames = providers.map((provider: { name?: string }) => provider?.name);
    const exportNames = exportsList.map((provider: { name?: string }) => provider?.name);

    expect(providerNames).toContain('AuditGovernanceService');
    expect(exportNames).toContain('AuditGovernanceService');
  });
});
