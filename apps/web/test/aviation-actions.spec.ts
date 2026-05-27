import { describe, expect, it } from 'vitest';

describe('Aviation server actions (smoke)', () => {
  it('portal-api exports aviation API functions', async () => {
    const mod = await import('../lib/portal-api');
    expect(typeof mod.createAviationReport).toBe('function');
    expect(typeof mod.transitionAviationReport).toBe('function');
    expect(typeof mod.registerAviationComment).toBe('function');
    expect(typeof mod.searchAviationReports).toBe('function');
    expect(typeof mod.fetchAviationSnapshot).toBe('function');
    expect(typeof mod.mapAviationReportsToRecords).toBe('function');
  });

  it('mapAviationReportsToRecords maps API records to frontend records', async () => {
    const { mapAviationReportsToRecords } = await import('../lib/portal-api');

    const records = mapAviationReportsToRecords(
      [
        {
          id: 'rpt-abc123',
          assetId: 'ac-001',
          title: 'Hydraulic fault',
          category: 'corrective',
          priority: 'P1',
          origin: 'asset_field_team',
          openedBy: 'pilot-1',
          openedAt: '2026-05-27T10:00:00.000Z',
          status: 'pending',
          kanbanSubstatus: 'report_open',
          groundCount: 0,
          updatedAt: '2026-05-27T10:00:00.000Z',
          evidenceCount: 0,
          evidenceTypes: []
        }
      ],
      [{ id: 'ac-001', name: 'Aircraft Alpha', modality: 'aviation', status: 'available', location: 'GRU', nextWindow: '2026-06-01' }]
    );

    expect(records).toHaveLength(1);
    expect(records[0].assetName).toBe('Aircraft Alpha');
    expect(records[0].status).toBe('pending');
    expect(records[0].kanbanSubstatus).toBe('report_open');
    expect(records[0].reportNumber).toBeTruthy();
  });
});
