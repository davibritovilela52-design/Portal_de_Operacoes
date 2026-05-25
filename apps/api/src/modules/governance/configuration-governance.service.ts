import { Injectable } from '@nestjs/common';

export type RuleVersion = {
  ruleKey: string;
  version: number;
  effectiveAt: Date;
  changedBy: string;
  reason: string;
};

export type FeatureFlagState = {
  flagKey: string;
  owner: string;
  enabled: boolean;
  changedBy: string;
  reason: string;
};

@Injectable()
export class ConfigurationGovernanceService {
  scheduleRuleVersion(input: RuleVersion): RuleVersion {
    return {
      ...input
    };
  }

  resolveRuleVersion(ruleKey: string, at: Date, versions: RuleVersion[]): RuleVersion | null {
    return (
      versions
        .filter((version) => version.ruleKey === ruleKey && version.effectiveAt <= at)
        .sort((left, right) => right.effectiveAt.getTime() - left.effectiveAt.getTime())[0] ?? null
    );
  }

  toggleFeatureFlag(input: FeatureFlagState): FeatureFlagState {
    return {
      ...input
    };
  }

  killSwitch(flag: FeatureFlagState, changedBy: string): FeatureFlagState {
    return {
      ...flag,
      enabled: false,
      changedBy,
      reason: 'Kill switch activated'
    };
  }
}
