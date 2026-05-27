import { describe, expect, it } from 'vitest';

import { AviationWorkflowService } from '../src/modules/aviation/aviation-workflow.service.js';

describe('AviationWorkflowService - returnToServiceEta', () => {
  const service = new AviationWorkflowService();

  it('accepts returnToServiceEta when transitioning to return_check', () => {
    const eta = new Date('2026-06-01T12:00:00Z');

    const result = service.transition(
      {
        assetId: 'ac-1',
        category: 'corrective',
        priority: 'P1',
        description: 'Hydraulic issue',
        origin: 'asset_field_team',
        openedBy: 'u1',
        openedAt: new Date(),
        status: 'in_progress',
        groundCount: 0
      },
      {
        toStatus: 'return_check',
        returnToServiceEta: eta
      },
      ['diagnostic', 'technical_report']
    );

    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.report.returnToServiceEta).toEqual(eta);
    }
  });

  it('accepts returnToServiceEta when transitioning to grounded', () => {
    const eta = new Date('2026-06-03T08:00:00Z');

    const result = service.transition(
      {
        assetId: 'ac-1',
        category: 'emergency',
        priority: 'P1',
        description: 'AOG',
        origin: 'asset_field_team',
        openedBy: 'u1',
        openedAt: new Date(),
        status: 'in_progress',
        groundCount: 0
      },
      {
        toStatus: 'grounded',
        groundReason: 'awaiting_part',
        returnToServiceEta: eta
      }
    );

    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.report.returnToServiceEta).toEqual(eta);
    }
  });

  it('clears returnToServiceEta when transitioning to returned', () => {
    const result = service.transition(
      {
        assetId: 'ac-1',
        category: 'corrective',
        priority: 'P2',
        description: 'fixed',
        origin: 'asset_field_team',
        openedBy: 'u1',
        openedAt: new Date(),
        status: 'return_check',
        groundCount: 0,
        returnToServiceEta: new Date('2026-06-01T12:00:00Z')
      },
      { toStatus: 'returned' },
      ['diagnostic', 'technical_report', 'execution_evidence', 'airworthiness_release']
    );

    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.report.returnToServiceEta).toBeUndefined();
    }
  });
});
