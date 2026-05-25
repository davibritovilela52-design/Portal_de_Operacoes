import 'reflect-metadata';

import { describe, expect, it } from 'vitest';

import { GovernanceModule } from '../src/modules/governance/governance.module.js';

describe('GovernanceModule', () => {
  it('registers and exports governance services for security, readiness and stabilization flows', () => {
    const providers = Reflect.getMetadata('providers', GovernanceModule) ?? [];
    const exportsList = Reflect.getMetadata('exports', GovernanceModule) ?? [];

    const providerNames = providers.map((provider: { name?: string }) => provider?.name);
    const exportNames = exportsList.map((provider: { name?: string }) => provider?.name);

    expect(providerNames).toContain('EvidenceSecurityService');
    expect(providerNames).toContain('HistoricalSanitizationService');
    expect(providerNames).toContain('AccessGovernanceService');
    expect(providerNames).toContain('CapacityGovernanceService');
    expect(providerNames).toContain('ConfigurationGovernanceService');
    expect(providerNames).toContain('ReleaseGovernanceService');
    expect(providerNames).toContain('DashboardApplicationService');
    expect(providerNames).toContain('SlaTimePolicyService');
    expect(providerNames).toContain('RetentionGovernanceService');
    expect(exportNames).toContain('EvidenceSecurityService');
    expect(exportNames).toContain('ReleaseGovernanceService');
  });
});
