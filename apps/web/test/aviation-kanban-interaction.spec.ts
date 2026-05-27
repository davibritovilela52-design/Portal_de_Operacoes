import { describe, expect, it } from 'vitest';
import {
  buildAviationKanbanColumns,
  aviationKanbanSubstatusDefinitions
} from '../lib/portal-model';

describe('Aviation Kanban Model', () => {
  it('buildAviationKanbanColumns places report in correct column', () => {
    const columns = buildAviationKanbanColumns([
      {
        id: 'rpt-1',
        reportNumber: 'rpt-1',
        assetId: 'ac-001',
        assetName: 'Aircraft Alpha',
        title: 'Hydraulic anomaly',
        category: 'corrective',
        priority: 'P1',
        status: 'pending',
        kanbanSubstatus: 'report_open',
        openedBy: 'pilot-1',
        openedAt: '2026-05-27T10:00:00.000Z',
        groundCount: 0
      }
    ]);

    const reportOpenColumn = columns.find((c) => c.key === 'report_open');
    expect(reportOpenColumn?.tickets).toHaveLength(1);
    expect(reportOpenColumn?.tickets[0].id).toBe('rpt-1');
  });

  it('has 10 kanban substatus definitions', () => {
    expect(aviationKanbanSubstatusDefinitions).toHaveLength(10);
  });

  it('all substatus definitions map to valid statuses', () => {
    const validStatuses = ['pending', 'in_progress', 'grounded', 'return_check', 'returned', 'cancelled', 'reopened'];
    for (const def of aviationKanbanSubstatusDefinitions) {
      expect(validStatuses).toContain(def.status);
    }
  });
});
