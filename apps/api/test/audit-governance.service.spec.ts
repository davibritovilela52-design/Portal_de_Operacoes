import { describe, expect, it } from 'vitest';

import { AuditGovernanceService } from '../src/modules/audit/audit-governance.service.js';

describe('AuditGovernanceService', () => {
  const service = new AuditGovernanceService();

  it('publishes the structured justification fields required for critical actions', () => {
    expect(service.getCatalog()).toEqual({
      requiredJustificationFields: [
        'context',
        'decision',
        'decidedBy',
        'alternativesConsidered',
        'expectedImpact'
      ]
    });
  });

  it('blocks a critical action when structured justification is missing', () => {
    const result = service.evaluateCriticalAction('agenda.conflict.override');

    expect(result).toEqual({
      allowed: false,
      reason: 'JUSTIFICATION_REQUIRED'
    });
  });

  it('accepts a critical action when the full structured justification is present', () => {
    const result = service.evaluateCriticalAction('agenda.conflict.override', {
      context: 'Two overlapping events were escalated by central operations.',
      decision: 'Keep the operational block and move utilization to the next safe slot.',
      decidedBy: 'central-1',
      alternativesConsidered: ['Cancel maintenance', 'Swap the asset allocation'],
      expectedImpact: 'Avoids unsafe overlap and preserves compliance.'
    });

    expect(result).toEqual({
      allowed: true,
      reason: 'ALLOWED'
    });
  });

  it('blocks direct mutation of a completed record and points to the versioned rectification flow', () => {
    const result = service.guardDirectMutation({
      recordId: 'maintenance-1',
      status: 'completed',
      version: 3
    });

    expect(result).toEqual({
      allowed: false,
      reason: 'COMPLETED_RECORD_IMMUTABLE',
      resolution: 'CREATE_VERSIONED_RECTIFICATION'
    });
  });

  it('creates a versioned rectification for a completed record', () => {
    const result = service.createRectification(
      {
        recordId: 'maintenance-1',
        status: 'completed',
        version: 3
      },
      {
        changedBy: 'central-1',
        reason: 'Correct supplier invoice reference after close-out.',
        afterSnapshot: {
          supplierInvoiceNumber: 'INV-2026-055'
        }
      }
    );

    expect(result).toEqual({
      created: true,
      reason: 'RECTIFICATION_CREATED',
      rectification: {
        recordId: 'maintenance-1',
        sourceVersion: 3,
        targetVersion: 4,
        changedBy: 'central-1',
        reason: 'Correct supplier invoice reference after close-out.',
        afterSnapshot: {
          supplierInvoiceNumber: 'INV-2026-055'
        }
      }
    });
  });

  it('marks a confirmed critical memo as immutable after confirmation', () => {
    const confirmedMemo = service.confirmDecisionMemo({
      context: 'Emergency block reached the 24h validation threshold.',
      decision: 'Escalate to central operations leadership and keep the block active.',
      decidedBy: 'central-1',
      alternativesConsidered: ['Release utilization without validation'],
      expectedImpact: 'Preserves safety until formal validation is recorded.'
    });

    const result = service.updateDecisionMemo(confirmedMemo.memo, {
      expectedImpact: 'New impact text'
    });

    expect(result).toEqual({
      allowed: false,
      reason: 'DECISION_MEMO_IMMUTABLE'
    });
  });
});
