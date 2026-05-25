import { describe, expect, it } from 'vitest';

import { ConfigurationGovernanceService } from '../src/modules/governance/configuration-governance.service.js';

describe('ConfigurationGovernanceService', () => {
  it('resolves the applicable rule version by effective date and records future versions', () => {
    const service = new ConfigurationGovernanceService();

    const versions = [
      service.scheduleRuleVersion({
        ruleKey: 'sla.validation.24h',
        version: 1,
        effectiveAt: new Date('2026-05-01T00:00:00.000Z'),
        changedBy: 'admin-1',
        reason: 'Initial baseline'
      }),
      service.scheduleRuleVersion({
        ruleKey: 'sla.validation.24h',
        version: 2,
        effectiveAt: new Date('2026-06-01T00:00:00.000Z'),
        changedBy: 'admin-1',
        reason: 'Future governance tightening'
      })
    ];

    expect(
      service.resolveRuleVersion('sla.validation.24h', new Date('2026-05-13T00:00:00.000Z'), versions)
    ).toEqual(versions[0]);
  });

  it('toggles feature flags with owner metadata and immediate kill switch support', () => {
    const service = new ConfigurationGovernanceService();

    const flag = service.toggleFeatureFlag({
      flagKey: 'agenda-conflict-engine-v2',
      owner: 'platform-team',
      enabled: true,
      changedBy: 'admin-1',
      reason: 'Controlled rollout'
    });

    expect(flag).toEqual({
      flagKey: 'agenda-conflict-engine-v2',
      owner: 'platform-team',
      enabled: true,
      changedBy: 'admin-1',
      reason: 'Controlled rollout'
    });

    expect(service.killSwitch(flag, 'admin-2')).toEqual({
      flagKey: 'agenda-conflict-engine-v2',
      owner: 'platform-team',
      enabled: false,
      changedBy: 'admin-2',
      reason: 'Kill switch activated'
    });
  });
});
