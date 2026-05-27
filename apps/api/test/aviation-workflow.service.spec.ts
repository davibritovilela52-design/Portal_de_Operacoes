import { describe, expect, it } from 'vitest';
import { AviationWorkflowService } from '../src/modules/aviation/aviation-workflow.service.js';

describe('AviationWorkflowService', () => {
  const service = new AviationWorkflowService();

  it('publishes the aviation catalog', () => {
    expect(service.getCatalog()).toEqual({
      statuses: ['pending', 'in_progress', 'grounded', 'return_check', 'returned', 'cancelled', 'reopened'],
      priorities: ['P1', 'P2', 'P3', 'P4']
    });
  });

  it('creates a report in pending status when required fields are present', () => {
    const result = service.createReport({
      assetId: 'aircraft-001',
      category: 'corrective',
      priority: 'P1',
      description: 'Hydraulic pressure anomaly detected',
      origin: 'asset_field_team',
      openedBy: 'pilot-user-1',
      openedAt: new Date('2026-05-27T10:00:00.000Z')
    });

    expect(result).toEqual({
      created: true,
      reason: 'CREATED',
      report: {
        assetId: 'aircraft-001',
        category: 'corrective',
        priority: 'P1',
        description: 'Hydraulic pressure anomaly detected',
        origin: 'asset_field_team',
        openedBy: 'pilot-user-1',
        openedAt: new Date('2026-05-27T10:00:00.000Z'),
        status: 'pending',
        kanbanSubstatus: 'report_open',
        groundCount: 0
      }
    });
  });

  it('rejects creation when required fields are missing', () => {
    const result = service.createReport({
      assetId: '',
      category: 'corrective',
      priority: 'P1',
      description: 'Some issue',
      origin: 'asset_field_team',
      openedBy: 'pilot-1',
      openedAt: new Date()
    });

    expect(result).toEqual({
      created: false,
      reason: 'REQUIRED_FIELDS_MISSING',
      missingFields: ['assetId']
    });
  });

  it('blocks invalid status transition', () => {
    const result = service.transition(
      {
        assetId: 'aircraft-001',
        category: 'corrective',
        priority: 'P1',
        description: 'Hydraulic issue',
        origin: 'asset_field_team',
        openedBy: 'pilot-1',
        openedAt: new Date(),
        status: 'pending',
        groundCount: 0
      },
      { toStatus: 'returned' }
    );

    expect(result).toEqual({ allowed: false, reason: 'INVALID_STATUS_TRANSITION' });
  });

  it('requires diagnostic evidence before transitioning to in_progress', () => {
    const result = service.transition(
      {
        assetId: 'aircraft-001',
        category: 'corrective',
        priority: 'P1',
        description: 'Hydraulic issue',
        origin: 'asset_field_team',
        openedBy: 'pilot-1',
        openedAt: new Date(),
        status: 'pending',
        groundCount: 0
      },
      { toStatus: 'in_progress' },
      [] // no evidence
    );

    expect(result).toEqual({
      allowed: false,
      reason: 'REQUIRED_EVIDENCE_MISSING',
      missingEvidenceTypes: ['diagnostic']
    });
  });

  it('requires ground reason when transitioning to grounded', () => {
    const result = service.transition(
      {
        assetId: 'aircraft-001',
        category: 'emergency',
        priority: 'P1',
        description: 'AOG event',
        origin: 'asset_field_team',
        openedBy: 'pilot-1',
        openedAt: new Date(),
        status: 'in_progress',
        groundCount: 0,
        kanbanSubstatus: 'service_execution'
      },
      { toStatus: 'grounded' }
    );

    expect(result).toEqual({ allowed: false, reason: 'GROUND_REASON_REQUIRED' });
  });

  it('allows grounding with valid reason, increments groundCount', () => {
    const result = service.transition(
      {
        assetId: 'aircraft-001',
        category: 'emergency',
        priority: 'P1',
        description: 'AOG event',
        origin: 'asset_field_team',
        openedBy: 'pilot-1',
        openedAt: new Date(),
        status: 'in_progress',
        groundCount: 0
      },
      { toStatus: 'grounded', groundReason: 'awaiting_part' }
    );

    expect(result).toMatchObject({
      allowed: true,
      reason: 'ALLOWED',
      report: expect.objectContaining({
        status: 'grounded',
        groundCount: 1,
        groundReason: 'awaiting_part',
        kanbanSubstatus: 'aog_hold'
      })
    });
  });

  it('requires justification for cancellation', () => {
    const result = service.transition(
      {
        assetId: 'aircraft-001',
        category: 'corrective',
        priority: 'P2',
        description: 'Issue',
        origin: 'asset_field_team',
        openedBy: 'pilot-1',
        openedAt: new Date(),
        status: 'pending',
        groundCount: 0
      },
      { toStatus: 'cancelled' }
    );

    expect(result).toEqual({ allowed: false, reason: 'JUSTIFICATION_REQUIRED' });
  });
});
