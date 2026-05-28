import { describe, expect, it } from 'vitest';

import { AccessPolicyService } from '../src/modules/access/access-policy.service.js';
import { AviationApplicationService } from '../src/modules/aviation/aviation-application.service.js';
import { AviationWorkflowService } from '../src/modules/aviation/aviation-workflow.service.js';

function makeRepo() {
  return {
    create: async () => ({}),
    findById: async () => null,
    search: async () => [],
    update: async () => ({}),
    updateStatusWithTransitionHistory: async () => ({}),
    getStats: async (_tenantId: string) => ({
      byStatus: {
        pending: 1,
        in_progress: 1,
        grounded: 2,
        return_check: 0,
        returned: 1,
        cancelled: 0,
        reopened: 0
      },
      byPriority: { P1: 3, P2: 1, P3: 1, P4: 0 },
      totalAogEvents: 3,
      activeAogCount: 2,
      totalReports: 5
    })
  };
}

function makeEvidenceRepo() {
  return {
    create: async () => ({}),
    findById: async () => null,
    listByReport: async () => [],
    listByReportIds: async () => []
  };
}

describe('AviationApplicationService.getStats', () => {
  it('returns FORBIDDEN when actor lacks aviation.report.search', async () => {
    const service = new AviationApplicationService(
      new AccessPolicyService(),
      new AviationWorkflowService(),
      makeRepo() as never,
      makeEvidenceRepo() as never,
      {} as never
    );

    const result = await service.getStats({
      actor: { userId: 'u1', tenantId: 'tenant-1', role: 'asset_field_team', assetIds: [] },
      tenantId: 'tenant-1'
    });

    expect(result).toMatchObject({ found: false, reason: 'FORBIDDEN' });
  });

  it('returns KPI stats with correct totals', async () => {
    const service = new AviationApplicationService(
      new AccessPolicyService(),
      new AviationWorkflowService(),
      makeRepo() as never,
      makeEvidenceRepo() as never,
      {} as never
    );

    const result = await service.getStats({
      actor: { userId: 'u1', tenantId: 'tenant-1', role: 'aviation_operations', assetIds: [] },
      tenantId: 'tenant-1'
    });

    expect(result).toMatchObject({ found: true });
    if ('stats' in result) {
      expect(result.stats.totalReports).toBe(5);
      expect(result.stats.activeAogCount).toBe(2);
      expect(result.stats.totalAogEvents).toBe(3);
      expect(result.stats.byStatus.grounded).toBe(2);
      expect(result.stats.byPriority.P1).toBe(3);
    }
  });
});
