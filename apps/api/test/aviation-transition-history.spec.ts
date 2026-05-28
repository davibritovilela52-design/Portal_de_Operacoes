import { describe, expect, it } from 'vitest';
import { AviationApplicationService } from '../src/modules/aviation/aviation-application.service.js';
import { AccessPolicyService } from '../src/modules/access/access-policy.service.js';
import { AviationWorkflowService } from '../src/modules/aviation/aviation-workflow.service.js';

const fakeTransitions = [
  {
    id: 'tr-1',
    tenantId: 'tenant-1',
    aviationReportId: 'rpt-1',
    fromStatus: null,
    toStatus: 'pending',
    transitionedBy: 'user-1',
    at: new Date('2026-05-01T10:00:00Z'),
    createdAt: new Date()
  },
  {
    id: 'tr-2',
    tenantId: 'tenant-1',
    aviationReportId: 'rpt-1',
    fromStatus: 'pending',
    toStatus: 'in_progress',
    transitionedBy: 'user-2',
    at: new Date('2026-05-02T10:00:00Z'),
    createdAt: new Date()
  }
];

function makeRepoWithReport() {
  return {
    create: async () => ({ id: 'rpt-1' }),
    findById: async () => ({
      id: 'rpt-1', tenantId: 'tenant-1', assetId: 'ac-1',
      title: 'Test', category: 'corrective', priority: 'P2',
      description: 'desc', origin: 'asset_field_team',
      openedBy: 'u1', openedAt: new Date(), status: 'in_progress',
      kanbanSubstatus: 'report_qualification', groundCount: 0,
      createdAt: new Date(), updatedAt: new Date()
    }),
    search: async () => [],
    update: async () => ({}),
    updateStatusWithTransitionHistory: async () => ({}),
    getStats: async () => ({ byStatus: {}, byPriority: {}, totalAogEvents: 0, activeAogCount: 0, totalReports: 0 }),
    listTransitions: async (_tenantId: string, _reportId: string) => fakeTransitions
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

describe('AviationApplicationService.getTransitionHistory', () => {
  it('returns FORBIDDEN when actor lacks aviation.report.read (asset not in scope)', async () => {
    const service = new AviationApplicationService(
      new AccessPolicyService(),
      new AviationWorkflowService(),
      makeRepoWithReport() as never,
      makeEvidenceRepo() as never,
      {} as never
    );

    const result = await service.getTransitionHistory({
      actor: { userId: 'u1', tenantId: 'tenant-1', role: 'asset_field_team', assetIds: ['ac-99'] },
      tenantId: 'tenant-1',
      reportId: 'rpt-1'
    });

    expect(result).toMatchObject({ found: false, reason: 'FORBIDDEN' });
  });

  it('returns transition list ordered by at ascending', async () => {
    const service = new AviationApplicationService(
      new AccessPolicyService(),
      new AviationWorkflowService(),
      makeRepoWithReport() as never,
      makeEvidenceRepo() as never,
      {} as never
    );

    const result = await service.getTransitionHistory({
      actor: { userId: 'u1', tenantId: 'tenant-1', role: 'aviation_operations', assetIds: [] },
      tenantId: 'tenant-1',
      reportId: 'rpt-1'
    });

    expect(result).toMatchObject({ found: true });
    if ('transitions' in result) {
      expect(result.transitions).toHaveLength(2);
      expect(result.transitions[0].toStatus).toBe('pending');
      expect(result.transitions[1].toStatus).toBe('in_progress');
    }
  });

  it('returns NOT_FOUND when report does not exist', async () => {
    const repoNoReport = { ...makeRepoWithReport(), findById: async () => null };
    const service = new AviationApplicationService(
      new AccessPolicyService(),
      new AviationWorkflowService(),
      repoNoReport as never,
      makeEvidenceRepo() as never,
      {} as never
    );

    const result = await service.getTransitionHistory({
      actor: { userId: 'u1', tenantId: 'tenant-1', role: 'aviation_operations', assetIds: [] },
      tenantId: 'tenant-1',
      reportId: 'nonexistent'
    });

    expect(result).toMatchObject({ found: false, reason: 'NOT_FOUND' });
  });
});
