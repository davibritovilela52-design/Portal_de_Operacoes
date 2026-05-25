import { describe, expect, it } from 'vitest';

import { MaintenanceWorkflowService } from '../src/modules/maintenance/maintenance-workflow.service.js';

describe('MaintenanceWorkflowService', () => {
  const service = new MaintenanceWorkflowService();

  it('publishes the official maintenance catalog for statuses and priorities', () => {
    expect(service.getCatalog()).toEqual({
      statuses: [
        'pending',
        'in_progress',
        'frozen',
        'payment',
        'completed',
        'cancelled',
        'reopened'
      ],
      priorities: ['P1', 'P2', 'P3', 'P4']
    });
  });

  it('creates a ticket in pending status when all required operational fields are present', () => {
    const result = service.createTicket({
      assetId: 'asset-1',
      category: 'corrective',
      priority: 'P2',
      description: 'Investigate port-side pump pressure oscillation',
      origin: 'asset_field_team',
      openedBy: 'field-user-1',
      openedAt: new Date('2026-05-13T10:00:00.000Z')
    });

    expect(result).toEqual({
      created: true,
      reason: 'CREATED',
      ticket: {
        assetId: 'asset-1',
        category: 'corrective',
        priority: 'P2',
        description: 'Investigate port-side pump pressure oscillation',
        origin: 'asset_field_team',
        openedBy: 'field-user-1',
        openedAt: new Date('2026-05-13T10:00:00.000Z'),
        status: 'pending',
        kanbanSubstatus: 'call_opening',
        freezeCount: 0
      }
    });
  });

  it('rejects ticket creation when a required field is missing', () => {
    const result = service.createTicket({
      assetId: 'asset-1',
      category: 'corrective',
      priority: 'P2',
      description: '',
      origin: 'asset_field_team',
      openedBy: 'field-user-1',
      openedAt: new Date('2026-05-13T10:00:00.000Z')
    });

    expect(result).toEqual({
      created: false,
      reason: 'REQUIRED_FIELDS_MISSING',
      missingFields: ['description']
    });
  });

  it('blocks an invalid maintenance status transition', () => {
    const result = service.transition(
      {
        assetId: 'asset-1',
        category: 'corrective',
        priority: 'P2',
        description: 'Investigate port-side pump pressure oscillation',
        origin: 'asset_field_team',
        openedBy: 'field-user-1',
        openedAt: new Date('2026-05-13T10:00:00.000Z'),
        status: 'pending',
        freezeCount: 0
      },
      {
        toStatus: 'payment'
      }
    );

    expect(result).toEqual({
      allowed: false,
      reason: 'INVALID_STATUS_TRANSITION'
    });
  });

  it('requires a valid frozen reason before pausing SLA', () => {
    const result = service.transition(
      {
        assetId: 'asset-1',
        category: 'corrective',
        priority: 'P2',
        description: 'Investigate port-side pump pressure oscillation',
        origin: 'asset_field_team',
        openedBy: 'field-user-1',
        openedAt: new Date('2026-05-13T10:00:00.000Z'),
        status: 'in_progress',
        freezeCount: 0
      },
      {
        toStatus: 'frozen'
      }
    );

    expect(result).toEqual({
      allowed: false,
      reason: 'FROZEN_REASON_REQUIRED'
    });
  });

  it('blocks transition to in_progress when diagnostic evidence is missing', () => {
    const result = service.transition(
      {
        assetId: 'asset-1',
        category: 'corrective',
        priority: 'P2',
        description: 'Investigate port-side pump pressure oscillation',
        origin: 'asset_field_team',
        openedBy: 'field-user-1',
        openedAt: new Date('2026-05-13T10:00:00.000Z'),
        status: 'pending',
        freezeCount: 0
      },
      {
        toStatus: 'in_progress'
      }
    );

    expect(result).toEqual({
      allowed: false,
      reason: 'REQUIRED_EVIDENCE_MISSING',
      missingEvidenceTypes: ['diagnostic']
    });
  });

  it('updates the current substep when the ticket is already in progress', () => {
    const result = service.updateSubstep(
      {
        assetId: 'asset-1',
        category: 'corrective',
        priority: 'P2',
        description: 'Investigate port-side pump pressure oscillation',
        origin: 'asset_field_team',
        openedBy: 'field-user-1',
        openedAt: new Date('2026-05-13T10:00:00.000Z'),
        status: 'in_progress',
        freezeCount: 0
      },
      {
        currentSubstep: 'diagnostico_presencial'
      }
    );

    expect(result).toEqual({
      allowed: true,
      reason: 'ALLOWED',
      ticket: {
        assetId: 'asset-1',
        category: 'corrective',
        priority: 'P2',
        description: 'Investigate port-side pump pressure oscillation',
        origin: 'asset_field_team',
        openedBy: 'field-user-1',
        openedAt: new Date('2026-05-13T10:00:00.000Z'),
        status: 'in_progress',
        kanbanSubstatus: 'onsite_diagnosis',
        currentSubstep: 'diagnostico_presencial',
        freezeCount: 0
      }
    });
  });

  it('allows changing only the kanban substatus when the macrostatus stays the same', () => {
    const result = service.transition(
      {
        assetId: 'asset-1',
        category: 'corrective',
        priority: 'P2',
        description: 'Investigate port-side pump pressure oscillation',
        origin: 'asset_field_team',
        openedBy: 'field-user-1',
        openedAt: new Date('2026-05-13T10:00:00.000Z'),
        status: 'payment',
        kanbanSubstatus: 'payment_request',
        freezeCount: 0
      },
      {
        toStatus: 'payment',
        kanbanSubstatus: 'payment_receipt'
      }
    );

    expect(result).toEqual({
      allowed: true,
      reason: 'ALLOWED',
      escalationRequired: false,
      ticket: {
        assetId: 'asset-1',
        category: 'corrective',
        priority: 'P2',
        description: 'Investigate port-side pump pressure oscillation',
        origin: 'asset_field_team',
        openedBy: 'field-user-1',
        openedAt: new Date('2026-05-13T10:00:00.000Z'),
        status: 'payment',
        kanbanSubstatus: 'payment_receipt',
        freezeCount: 0
      }
    });
  });

  it('persists the requested kanban substatus when transitioning into a new macrostatus', () => {
    const result = service.transition(
      {
        assetId: 'asset-1',
        category: 'corrective',
        priority: 'P2',
        description: 'Investigate port-side pump pressure oscillation',
        origin: 'asset_field_team',
        openedBy: 'field-user-1',
        openedAt: new Date('2026-05-13T10:00:00.000Z'),
        status: 'pending',
        kanbanSubstatus: 'call_opening',
        freezeCount: 0
      },
      {
        toStatus: 'in_progress',
        kanbanSubstatus: 'service_execution'
      },
      ['diagnostic']
    );

    expect(result).toEqual({
      allowed: true,
      reason: 'ALLOWED',
      escalationRequired: false,
      ticket: {
        assetId: 'asset-1',
        category: 'corrective',
        priority: 'P2',
        description: 'Investigate port-side pump pressure oscillation',
        origin: 'asset_field_team',
        openedBy: 'field-user-1',
        openedAt: new Date('2026-05-13T10:00:00.000Z'),
        status: 'in_progress',
        kanbanSubstatus: 'service_execution',
        currentSubstep: 'realizacao_servico_reparo',
        freezeCount: 0,
        frozenReason: undefined
      }
    });
  });

  it('rejects substep updates when the ticket is outside in_progress', () => {
    const result = service.updateSubstep(
      {
        assetId: 'asset-1',
        category: 'corrective',
        priority: 'P2',
        description: 'Investigate port-side pump pressure oscillation',
        origin: 'asset_field_team',
        openedBy: 'field-user-1',
        openedAt: new Date('2026-05-13T10:00:00.000Z'),
        status: 'pending',
        freezeCount: 0
      },
      {
        currentSubstep: 'diagnostico_presencial'
      }
    );

    expect(result).toEqual({
      allowed: false,
      reason: 'SUBSTEP_NOT_APPLICABLE'
    });
  });

  it('blocks transition to completed when execution and quality evidence are missing', () => {
    const result = service.transition(
      {
        assetId: 'asset-1',
        category: 'corrective',
        priority: 'P2',
        description: 'Investigate port-side pump pressure oscillation',
        origin: 'asset_field_team',
        openedBy: 'field-user-1',
        openedAt: new Date('2026-05-13T10:00:00.000Z'),
        status: 'payment',
        freezeCount: 0
      },
      {
        toStatus: 'completed'
      },
      ['diagnostic']
    );

    expect(result).toEqual({
      allowed: false,
      reason: 'REQUIRED_EVIDENCE_MISSING',
      missingEvidenceTypes: ['execution_evidence', 'quality_release']
    });
  });

  it('requires justification to cancel or reopen a ticket', () => {
    const cancelResult = service.transition(
      {
        assetId: 'asset-1',
        category: 'corrective',
        priority: 'P2',
        description: 'Investigate port-side pump pressure oscillation',
        origin: 'asset_field_team',
        openedBy: 'field-user-1',
        openedAt: new Date('2026-05-13T10:00:00.000Z'),
        status: 'pending',
        freezeCount: 0
      },
      {
        toStatus: 'cancelled'
      }
    );

    const reopenResult = service.transition(
      {
        assetId: 'asset-1',
        category: 'corrective',
        priority: 'P2',
        description: 'Investigate port-side pump pressure oscillation',
        origin: 'asset_field_team',
        openedBy: 'field-user-1',
        openedAt: new Date('2026-05-13T10:00:00.000Z'),
        status: 'completed',
        freezeCount: 1
      },
      {
        toStatus: 'reopened'
      }
    );

    expect(cancelResult).toEqual({
      allowed: false,
      reason: 'JUSTIFICATION_REQUIRED'
    });
    expect(reopenResult).toEqual({
      allowed: false,
      reason: 'JUSTIFICATION_REQUIRED'
    });
  });

  it('marks the third frozen transition for automatic escalation', () => {
    const result = service.transition(
      {
        assetId: 'asset-1',
        category: 'corrective',
        priority: 'P2',
        description: 'Investigate port-side pump pressure oscillation',
        origin: 'asset_field_team',
        openedBy: 'field-user-1',
        openedAt: new Date('2026-05-13T10:00:00.000Z'),
        status: 'in_progress',
        freezeCount: 2
      },
      {
        toStatus: 'frozen',
        frozenReason: 'awaiting_supplier_response'
      }
    );

    expect(result).toEqual({
      allowed: true,
      reason: 'ALLOWED',
      escalationRequired: true,
      ticket: {
        assetId: 'asset-1',
        category: 'corrective',
        priority: 'P2',
        description: 'Investigate port-side pump pressure oscillation',
        origin: 'asset_field_team',
        openedBy: 'field-user-1',
        openedAt: new Date('2026-05-13T10:00:00.000Z'),
        status: 'frozen',
        kanbanSubstatus: 'accounts_freeze',
        freezeCount: 3,
        frozenReason: 'awaiting_supplier_response'
      }
    });
  });
});
