import { describe, expect, it } from 'vitest';
import { AviationApplicationService } from '../src/modules/aviation/aviation-application.service.js';
import { AviationWorkflowService } from '../src/modules/aviation/aviation-workflow.service.js';
import { AccessPolicyService } from '../src/modules/access/access-policy.service.js';
import { EvidenceSecurityService } from '../src/modules/governance/evidence-security.service.js';

function makeRepo(reports: Record<string, unknown>[] = []): unknown {
  return {
    create: async (_tenantId: string, report: unknown) => ({
      id: 'rpt-1',
      tenantId: 'tenant-1',
      ...(report as object),
      createdAt: new Date(),
      updatedAt: new Date()
    }),
    findById: async (_tenantId: string, id: string) =>
      reports.find((r) => (r as Record<string, unknown>).id === id) ?? null,
    search: async () => reports,
    update: async (_tenantId: string, _id: string, report: unknown) => ({
      id: 'rpt-1',
      tenantId: 'tenant-1',
      ...(report as object),
      createdAt: new Date(),
      updatedAt: new Date()
    }),
    updateStatusWithTransitionHistory: async (_tenantId: string, _id: string, report: unknown) => ({
      id: 'rpt-1',
      tenantId: 'tenant-1',
      ...(report as object),
      createdAt: new Date(),
      updatedAt: new Date()
    })
  };
}

function makeEvidenceRepo(): unknown {
  return {
    create: async () => ({ id: 'ev-1' }),
    findById: async () => null,
    listByReport: async () => [],
    listByReportIds: async () => []
  };
}

describe('AviationApplicationService', () => {
  it('creates a report for aviation_operations actor', async () => {
    const service = new AviationApplicationService(
      new AccessPolicyService(),
      new AviationWorkflowService(),
      makeRepo() as never,
      makeEvidenceRepo() as never,
      new EvidenceSecurityService()
    );

    const result = await service.createReport({
      actor: { userId: 'u1', tenantId: 'tenant-1', role: 'aviation_operations', assetIds: [] },
      tenantId: 'tenant-1',
      input: {
        assetId: 'ac-1',
        category: 'corrective',
        priority: 'P1',
        description: 'Hydraulic fault',
        origin: 'asset_field_team',
        openedBy: 'pilot-1',
        openedAt: new Date()
      }
    });

    expect(result).toMatchObject({ created: true, reason: 'CREATED' });
  });

  it('returns FORBIDDEN when actor lacks aviation.report.create permission', async () => {
    const service = new AviationApplicationService(
      new AccessPolicyService(),
      new AviationWorkflowService(),
      makeRepo() as never,
      makeEvidenceRepo() as never,
      new EvidenceSecurityService()
    );

    const result = await service.createReport({
      actor: { userId: 'u1', tenantId: 'tenant-1', role: 'yachts_technical_coordination', assetIds: [] },
      tenantId: 'tenant-1',
      input: {
        assetId: 'ac-1',
        category: 'corrective',
        priority: 'P1',
        description: 'Hydraulic fault',
        origin: 'asset_field_team',
        openedBy: 'pilot-1',
        openedAt: new Date()
      }
    });

    expect(result).toMatchObject({ created: false, reason: 'FORBIDDEN' });
  });

  it('returns empty reports list for aviation_operations', async () => {
    const service = new AviationApplicationService(
      new AccessPolicyService(),
      new AviationWorkflowService(),
      makeRepo([]) as never,
      makeEvidenceRepo() as never,
      new EvidenceSecurityService()
    );

    const result = await service.searchReports({
      actor: { userId: 'u1', tenantId: 'tenant-1', role: 'aviation_operations', assetIds: [] },
      tenantId: 'tenant-1'
    });

    expect(result).toMatchObject({ reports: [] });
  });
});
