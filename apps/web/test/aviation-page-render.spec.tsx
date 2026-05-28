import { describe, expect, it } from 'vitest';
import {
  buildAviationKanbanColumns,
  aviationKanbanSubstatusDefinitions,
  type AviationReportRecord
} from '../lib/portal-model';
import {
  filterAviationReportsByQuery,
  readAviationTicketFilterQuery
} from '../app/(portal)/aviation/aviation-ticket-filter';

const mockReports: AviationReportRecord[] = [
  {
    id: 'rpt-001',
    reportNumber: 'rpt-001',
    assetId: 'ac-001',
    assetName: 'Aircraft Alpha',
    title: 'Engine anomaly',
    category: 'emergency',
    priority: 'P1',
    status: 'pending',
    kanbanSubstatus: 'report_open',
    openedBy: 'pilot-1',
    openedAt: '2026-05-27T10:00:00.000Z',
    groundCount: 0
  },
  {
    id: 'rpt-002',
    reportNumber: 'rpt-002',
    assetId: 'ac-002',
    assetName: 'Aircraft Beta',
    title: 'Hydraulic fault',
    category: 'corrective',
    priority: 'P2',
    status: 'grounded',
    kanbanSubstatus: 'aog_hold',
    openedBy: 'tech-1',
    openedAt: '2026-05-27T09:00:00.000Z',
    groundCount: 1,
    groundReason: 'awaiting_part'
  }
];

describe('Aviation page model', () => {
  it('builds kanban columns correctly for mixed statuses', () => {
    const columns = buildAviationKanbanColumns(mockReports);
    const pending = columns.find((c) => c.key === 'report_open');
    const grounded = columns.find((c) => c.key === 'aog_hold');

    expect(pending?.count).toBe(1);
    expect(grounded?.count).toBe(1);
    expect(grounded?.tickets[0].id).toBe('rpt-002');
  });

  it('renders all 10 kanban columns', () => {
    const columns = buildAviationKanbanColumns(mockReports);
    expect(columns).toHaveLength(10);
    expect(columns.map((c) => c.key)).toEqual(
      aviationKanbanSubstatusDefinitions.map((d) => d.key)
    );
  });

  it('AOG report appears in grounded phase', () => {
    const columns = buildAviationKanbanColumns(mockReports);
    const groundedColumns = columns.filter((c) => c.status === 'grounded');
    const allGroundedReports = groundedColumns.flatMap((c) => c.tickets);
    expect(allGroundedReports.some((r) => r.id === 'rpt-002')).toBe(true);
  });

  it('readAviationTicketFilterQuery parses status and category from search params', () => {
    const query = readAviationTicketFilterQuery({
      status: 'grounded',
      category: 'emergency'
    });

    expect(query.status).toBe('grounded');
    expect(query.category).toBe('emergency');
    expect(query.assetId).toBeUndefined();
  });

  it('filterAviationReportsByQuery filters by status', () => {
    const filtered = filterAviationReportsByQuery(mockReports, { status: 'grounded' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('rpt-002');
  });

  it('filterAviationReportsByQuery filters by category', () => {
    const filtered = filterAviationReportsByQuery(mockReports, { category: 'emergency' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('rpt-001');
  });

  it('filterAviationReportsByQuery with no filters returns all reports', () => {
    const filtered = filterAviationReportsByQuery(mockReports, {});
    expect(filtered).toHaveLength(2);
  });
});
