import { describe, expect, it } from 'vitest';

import { AccessPolicyService } from '../src/modules/access/access-policy.service.js';
import { ObservabilityMetricsService } from '../src/modules/observability/observability-metrics.service.js';

describe('AccessPolicyService', () => {
  const service = new AccessPolicyService() as AccessPolicyService & {
    authorize?: (input: unknown) => unknown;
  };

  it('denies by default when an action is not explicitly allowed', () => {
    const decision = service.authorize?.({
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team',
        assetIds: ['asset-1']
      },
      action: 'audit.override',
      subject: {
        tenantId: 'tenant-a',
        assetId: 'asset-1'
      }
    });

    expect(decision).toEqual({
      allowed: false,
      reason: 'ROLE_NOT_ALLOWED'
    });
  });

  it('allows a field team to create a maintenance ticket for its own asset', () => {
    const decision = service.authorize?.({
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team',
        assetIds: ['asset-1']
      },
      action: 'maintenance.ticket.create',
      subject: {
        tenantId: 'tenant-a',
        assetId: 'asset-1'
      }
    });

    expect(decision).toEqual({
      allowed: true,
      reason: 'ALLOWED'
    });
  });

  it('allows a field team to comment on a maintenance ticket for its own asset', () => {
    const decision = service.authorize?.({
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team',
        assetIds: ['asset-1']
      },
      action: 'maintenance.ticket.comment',
      subject: {
        tenantId: 'tenant-a',
        assetId: 'asset-1'
      }
    });

    expect(decision).toEqual({
      allowed: true,
      reason: 'ALLOWED'
    });
  });

  it('allows a field team to transition a maintenance ticket for its own asset', () => {
    const decision = service.authorize?.({
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team',
        assetIds: ['asset-1']
      },
      action: 'maintenance.ticket.transition',
      subject: {
        tenantId: 'tenant-a',
        assetId: 'asset-1'
      }
    });

    expect(decision).toEqual({
      allowed: true,
      reason: 'ALLOWED'
    });
  });

  it('allows a field team to attach maintenance evidence for its own asset', () => {
    const decision = service.authorize?.({
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team',
        assetIds: ['asset-1']
      },
      action: 'maintenance.evidence.attach',
      subject: {
        tenantId: 'tenant-a',
        assetId: 'asset-1'
      }
    });

    expect(decision).toEqual({
      allowed: true,
      reason: 'ALLOWED'
    });
  });

  it('allows a field team to read maintenance evidence for its own asset', () => {
    const decision = service.authorize?.({
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team',
        assetIds: ['asset-1']
      },
      action: 'maintenance.evidence.read',
      subject: {
        tenantId: 'tenant-a',
        assetId: 'asset-1'
      }
    });

    expect(decision).toEqual({
      allowed: true,
      reason: 'ALLOWED'
    });
  });

  it('allows a field team to search maintenance tickets within its tenant scope', () => {
    const decision = service.authorize?.({
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team',
        assetIds: ['asset-1']
      },
      action: 'maintenance.ticket.search',
      subject: {
        tenantId: 'tenant-a'
      }
    });

    expect(decision).toEqual({
      allowed: true,
      reason: 'ALLOWED'
    });
  });

  it('denies a field team from acting on another asset', () => {
    const decision = service.authorize?.({
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team',
        assetIds: ['asset-1']
      },
      action: 'maintenance.ticket.create',
      subject: {
        tenantId: 'tenant-a',
        assetId: 'asset-2'
      }
    });

    expect(decision).toEqual({
      allowed: false,
      reason: 'ASSET_SCOPE_MISMATCH'
    });
  });

  it('allows a field team to update an agenda event for its own asset', () => {
    const decision = service.authorize?.({
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team',
        assetIds: ['asset-1']
      },
      action: 'agenda.event.update',
      subject: {
        tenantId: 'tenant-a',
        assetId: 'asset-1'
      }
    });

    expect(decision).toEqual({
      allowed: true,
      reason: 'ALLOWED'
    });
  });

  it('allows a field team to delete an agenda event for its own asset', () => {
    const decision = service.authorize?.({
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team',
        assetIds: ['asset-1']
      },
      action: 'agenda.event.delete',
      subject: {
        tenantId: 'tenant-a',
        assetId: 'asset-1'
      }
    });

    expect(decision).toEqual({
      allowed: true,
      reason: 'ALLOWED'
    });
  });

  it('allows portal admin to search agenda events for the same tenant in read-only mode', () => {
    const decision = service.authorize?.({
      actor: {
        userId: 'admin-1',
        tenantId: 'tenant-a',
        role: 'portal_admin',
        assetIds: []
      },
      action: 'agenda.event.search',
      subject: {
        tenantId: 'tenant-a'
      }
    });

    expect(decision).toEqual({
      allowed: true,
      reason: 'ALLOWED'
    });
  });

  it('allows central operations to override an agenda conflict on any asset in the same tenant', () => {
    const decision = service.authorize?.({
      actor: {
        userId: 'central-1',
        tenantId: 'tenant-a',
        role: 'central_operations',
        assetIds: []
      },
      action: 'agenda.conflict.override',
      subject: {
        tenantId: 'tenant-a',
        assetId: 'asset-99'
      }
    });

    expect(decision).toEqual({
      allowed: true,
      reason: 'ALLOWED'
    });
  });

  it('allows central operations to manage structural access and cutover decisions in the same tenant', () => {
    const structuralDecision = service.authorize?.({
      actor: {
        userId: 'central-1',
        tenantId: 'tenant-a',
        role: 'central_operations',
        assetIds: []
      },
      action: 'structural_registry.manage',
      subject: {
        tenantId: 'tenant-a'
      }
    });

    const cutoverDecision = service.authorize?.({
      actor: {
        userId: 'central-1',
        tenantId: 'tenant-a',
        role: 'central_operations',
        assetIds: []
      },
      action: 'cutover.run.decide',
      subject: {
        tenantId: 'tenant-a'
      }
    });

    expect(structuralDecision).toEqual({
      allowed: true,
      reason: 'ALLOWED'
    });
    expect(cutoverDecision).toEqual({
      allowed: true,
      reason: 'ALLOWED'
    });
  });

  it('allows operações yachts to manage agenda events for any asset in the same tenant', () => {
    const decision = service.authorize?.({
      actor: {
        userId: 'ops-yachts-1',
        tenantId: 'tenant-a',
        role: 'yachts_operations',
        assetIds: []
      },
      action: 'agenda.event.delete',
      subject: {
        tenantId: 'tenant-a',
        assetId: 'asset-77'
      }
    });

    expect(decision).toEqual({
      allowed: true,
      reason: 'ALLOWED'
    });
  });

  it('allows operações yachts to open maintenance tickets for any asset in the same tenant', () => {
    const decision = service.authorize?.({
      actor: {
        userId: 'ops-yachts-1',
        tenantId: 'tenant-a',
        role: 'yachts_operations',
        assetIds: []
      },
      action: 'maintenance.ticket.create',
      subject: {
        tenantId: 'tenant-a',
        assetId: 'asset-77'
      }
    });

    expect(decision).toEqual({
      allowed: true,
      reason: 'ALLOWED'
    });
  });

  it('allows yachts technical coordination to apply a provisional technical block', () => {
    const decision = service.authorize?.({
      actor: {
        userId: 'tech-1',
        tenantId: 'tenant-a',
        role: 'yachts_technical_coordination',
        assetIds: []
      },
      action: 'maintenance.provisional_block.apply',
      subject: {
        tenantId: 'tenant-a',
        assetId: 'asset-77'
      }
    });

    expect(decision).toEqual({
      allowed: true,
      reason: 'ALLOWED'
    });
  });

  it('allows central operations to validate a provisional technical block on any asset in the same tenant', () => {
    const decision = service.authorize?.({
      actor: {
        userId: 'central-1',
        tenantId: 'tenant-a',
        role: 'central_operations',
        assetIds: []
      },
      action: 'maintenance.provisional_block.validate',
      subject: {
        tenantId: 'tenant-a',
        assetId: 'asset-77'
      }
    });

    expect(decision).toEqual({
      allowed: true,
      reason: 'ALLOWED'
    });
  });

  it('allows central operations to register a critical decision memo for an asset in the same tenant', () => {
    const decision = service.authorize?.({
      actor: {
        userId: 'central-1',
        tenantId: 'tenant-a',
        role: 'central_operations',
        assetIds: []
      },
      action: 'audit.decision_memo.create',
      subject: {
        tenantId: 'tenant-a',
        assetId: 'asset-1'
      }
    });

    expect(decision).toEqual({
      allowed: true,
      reason: 'ALLOWED'
    });
  });

  it('allows portal admin to manage a cutover run in the same tenant', () => {
    const decision = service.authorize?.({
      actor: {
        userId: 'admin-1',
        tenantId: 'tenant-a',
        role: 'portal_admin',
        assetIds: []
      },
      action: 'cutover.run.manage',
      subject: {
        tenantId: 'tenant-a'
      }
    });

    expect(decision).toEqual({
      allowed: true,
      reason: 'ALLOWED'
    });
  });

  it('allows technical coordination to read the cutover cockpit in the same tenant', () => {
    const decision = service.authorize?.({
      actor: {
        userId: 'tech-1',
        tenantId: 'tenant-a',
        role: 'yachts_technical_coordination',
        assetIds: []
      },
      action: 'cutover.run.read',
      subject: {
        tenantId: 'tenant-a'
      }
    });

    expect(decision).toEqual({
      allowed: true,
      reason: 'ALLOWED'
    });
  });

  it('denies field team from recording a cutover checkpoint', () => {
    const decision = service.authorize?.({
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team',
        assetIds: ['asset-1']
      },
      action: 'cutover.checkpoint.record',
      subject: {
        tenantId: 'tenant-a'
      }
    });

    expect(decision).toEqual({
      allowed: false,
      reason: 'ROLE_NOT_ALLOWED'
    });
  });

  it('allows a field team to search the audit ledger within its tenant scope', () => {
    const decision = service.authorize?.({
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team',
        assetIds: ['asset-1']
      },
      action: 'audit.ledger.search',
      subject: {
        tenantId: 'tenant-a'
      }
    });

    expect(decision).toEqual({
      allowed: true,
      reason: 'ALLOWED'
    });
  });

  it('denies even central operations when tenant scope does not match', () => {
    const decision = service.authorize?.({
      actor: {
        userId: 'central-1',
        tenantId: 'tenant-a',
        role: 'central_operations',
        assetIds: []
      },
      action: 'agenda.conflict.override',
      subject: {
        tenantId: 'tenant-b',
        assetId: 'asset-99'
      }
    });

    expect(decision).toEqual({
      allowed: false,
      reason: 'TENANT_SCOPE_MISMATCH'
    });
  });

  it('records an authorization failure metric when access is denied', () => {
    const metrics = new ObservabilityMetricsService();
    const instrumentedService = new AccessPolicyService(metrics) as AccessPolicyService & {
      authorize?: (input: unknown) => unknown;
    };

    const decision = instrumentedService.authorize?.({
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team',
        assetIds: ['asset-1']
      },
      action: 'maintenance.ticket.create',
      subject: {
        tenantId: 'tenant-a',
        assetId: 'asset-2'
      }
    });

    expect(decision).toEqual({
      allowed: false,
      reason: 'ASSET_SCOPE_MISMATCH'
    });
    expect(metrics.getSnapshot().authorizationFailures).toBe(1);
  });
});
