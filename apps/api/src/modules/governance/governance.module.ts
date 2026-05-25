import { Module } from '@nestjs/common';

import { AccessGovernanceService } from './access-governance.service.js';
import { CapacityGovernanceService } from './capacity-governance.service.js';
import { ConfigurationGovernanceService } from './configuration-governance.service.js';
import { DashboardApplicationService } from './dashboard-application.service.js';
import { EvidenceSecurityService } from './evidence-security.service.js';
import { HistoricalSanitizationService } from './historical-sanitization.service.js';
import { RetentionGovernanceService } from './retention-governance.service.js';
import { ReleaseGovernanceService } from './release-governance.service.js';
import { SlaTimePolicyService } from './sla-time-policy.service.js';

@Module({
  providers: [
    EvidenceSecurityService,
    HistoricalSanitizationService,
    AccessGovernanceService,
    CapacityGovernanceService,
    ConfigurationGovernanceService,
    ReleaseGovernanceService,
    DashboardApplicationService,
    SlaTimePolicyService,
    RetentionGovernanceService
  ],
  exports: [
    EvidenceSecurityService,
    HistoricalSanitizationService,
    AccessGovernanceService,
    CapacityGovernanceService,
    ConfigurationGovernanceService,
    ReleaseGovernanceService,
    DashboardApplicationService,
    SlaTimePolicyService,
    RetentionGovernanceService
  ]
})
export class GovernanceModule {}
