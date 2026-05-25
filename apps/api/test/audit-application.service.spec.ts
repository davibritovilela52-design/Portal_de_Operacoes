import { describe, expect, it } from 'vitest';

import { AccessPolicyService } from '../src/modules/access/access-policy.service.js';
import { AuditApplicationService } from '../src/modules/audit/audit-application.service.js';
import {
  AuditDecisionMemo,
  AuditGovernanceService,
  Rectification
} from '../src/modules/audit/audit-governance.service.js';

describe('AuditApplicationService', () => {
  const createdRecords: Array<{ tenantId: string; rectification: Rectification }> = [];
  const decisionMemos: Array<{
    tenantId: string;
    action: string;
    aggregateType: string;
    aggregateId: string;
    assetId?: string;
    memo: AuditDecisionMemo;
  }> = [];
  const service = new AuditApplicationService(
    new AccessPolicyService(),
    new AuditGovernanceService(),
    {
      listByTenant: async (tenantId: string) => {
        if (tenantId !== 'tenant-a') {
          return [];
        }

        return [
          {
            id: 'rect-1',
            tenantId,
            recordId: 'maintenance-1',
            sourceVersion: 3,
            targetVersion: 4,
            changedBy: 'central-1',
            reason: 'Correct invoice reference.',
            afterSnapshot: {
              supplierInvoiceNumber: 'INV-055'
            },
            createdAt: new Date('2026-05-13T16:01:00.000Z')
          }
        ];
      },
      create: async (tenantId: string, rectification: Rectification) => {
        createdRecords.push({ tenantId, rectification });

        return rectification;
      }
    },
    {
      listByTenant: async (tenantId: string) => {
        if (tenantId !== 'tenant-a') {
          return [];
        }

        return [
          {
            id: 'memo-1',
            tenantId,
            action: 'agenda.conflict.override',
            aggregateType: 'agenda_event',
            aggregateId: 'event-1',
            assetId: 'asset-1',
            context: 'Two overlapping events were escalated by central operations.',
            decision: 'Keep the operational block and move utilization to the next safe slot.',
            decidedBy: 'central-1',
            alternativesConsidered: ['Cancel maintenance'],
            expectedImpact: 'Avoids unsafe overlap and preserves compliance.',
            status: 'confirmed' as const,
            createdAt: new Date('2026-05-13T18:00:00.000Z')
          }
        ];
      },
      create: async (
        tenantId: string,
        action: string,
        aggregateType: string,
        aggregateId: string,
        assetId: string | undefined,
        memo: AuditDecisionMemo
      ) => {
        decisionMemos.push({
          tenantId,
          action,
          aggregateType,
          aggregateId,
          assetId,
          memo
        });

        return {
          id: 'memo-1',
          tenantId,
          action,
          aggregateType,
          aggregateId,
          assetId,
          ...memo,
          createdAt: new Date('2026-05-13T18:00:00.000Z')
        };
      }
    }
  );

  it('builds a unified audit ledger and filters field team visibility by asset scope', async () => {
    const centralResult = await service.searchAuditLedger({
      actor: {
        userId: 'central-1',
        tenantId: 'tenant-a',
        role: 'central_operations',
        assetIds: []
      },
      tenantId: 'tenant-a',
      filters: {
        types: ['decision_memo', 'rectification']
      }
    });

    expect(centralResult).toEqual({
      entries: [
        {
          id: 'memo-1',
          type: 'decision_memo',
          title: 'agenda.conflict.override · agenda_event',
          summary: 'Keep the operational block and move utilization to the next safe slot.',
          actor: 'central-1',
          at: new Date('2026-05-13T18:00:00.000Z'),
          assetId: 'asset-1',
          aggregateType: 'agenda_event',
          aggregateId: 'event-1',
          status: 'confirmed'
        },
        {
          id: 'rect-1',
          type: 'rectification',
          title: 'Retificacao v3->v4',
          summary: 'Correct invoice reference.',
          actor: 'central-1',
          at: new Date('2026-05-13T16:01:00.000Z'),
          recordId: 'maintenance-1',
          sourceVersion: 3,
          targetVersion: 4
        }
      ]
    });

    const fieldResult = await service.searchAuditLedger({
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team',
        assetIds: ['asset-1']
      },
      tenantId: 'tenant-a',
      filters: {
        types: ['decision_memo', 'rectification']
      }
    });

    expect(fieldResult).toEqual({
      entries: [
        {
          id: 'memo-1',
          type: 'decision_memo',
          title: 'agenda.conflict.override · agenda_event',
          summary: 'Keep the operational block and move utilization to the next safe slot.',
          actor: 'central-1',
          at: new Date('2026-05-13T18:00:00.000Z'),
          assetId: 'asset-1',
          aggregateType: 'agenda_event',
          aggregateId: 'event-1',
          status: 'confirmed'
        }
      ]
    });
  });

  it('creates and persists a rectification when the actor has permission to govern audit-critical changes', async () => {
    createdRecords.length = 0;

    const result = await service.createRectification({
      actor: {
        userId: 'central-1',
        tenantId: 'tenant-a',
        role: 'central_operations',
        assetIds: []
      },
      tenantId: 'tenant-a',
      record: {
        recordId: 'maintenance-1',
        status: 'completed',
        version: 3
      },
      input: {
        changedBy: 'central-1',
        reason: 'Correct invoice reference.',
        afterSnapshot: {
          supplierInvoiceNumber: 'INV-055'
        }
      }
    });

    expect(result).toEqual({
      created: true,
      reason: 'RECTIFICATION_CREATED',
      rectification: {
        recordId: 'maintenance-1',
        sourceVersion: 3,
        targetVersion: 4,
        changedBy: 'central-1',
        reason: 'Correct invoice reference.',
        afterSnapshot: {
          supplierInvoiceNumber: 'INV-055'
        }
      }
    });
    expect(createdRecords).toEqual([
      {
        tenantId: 'tenant-a',
        rectification: {
          recordId: 'maintenance-1',
          sourceVersion: 3,
          targetVersion: 4,
          changedBy: 'central-1',
          reason: 'Correct invoice reference.',
          afterSnapshot: {
            supplierInvoiceNumber: 'INV-055'
          }
        }
      }
    ]);
  });

  it('blocks rectification when the actor lacks permission', async () => {
    createdRecords.length = 0;

    const result = await service.createRectification({
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team',
        assetIds: ['asset-1']
      },
      tenantId: 'tenant-a',
      record: {
        recordId: 'maintenance-1',
        status: 'completed',
        version: 3
      },
      input: {
        changedBy: 'field-1',
        reason: 'Correct invoice reference.',
        afterSnapshot: {
          supplierInvoiceNumber: 'INV-055'
        }
      }
    });

    expect(result).toEqual({
      created: false,
      reason: 'FORBIDDEN',
      accessReason: 'ROLE_NOT_ALLOWED'
    });
    expect(createdRecords).toEqual([]);
  });

  it('confirms and persists a critical decision memo when the actor has permission and the justification is complete', async () => {
    decisionMemos.length = 0;

    const result = await service.createDecisionMemo({
      actor: {
        userId: 'central-1',
        tenantId: 'tenant-a',
        role: 'central_operations',
        assetIds: []
      },
      tenantId: 'tenant-a',
      action: 'agenda.conflict.override',
      aggregateType: 'agenda_event',
      aggregateId: 'event-1',
      assetId: 'asset-1',
      justification: {
        context: 'Two overlapping events were escalated by central operations.',
        decision: 'Keep the operational block and move utilization to the next safe slot.',
        decidedBy: 'central-1',
        alternativesConsidered: ['Cancel maintenance', 'Swap the asset allocation'],
        expectedImpact: 'Avoids unsafe overlap and preserves compliance.'
      }
    });

    expect(result).toEqual({
      confirmed: true,
      memo: {
        context: 'Two overlapping events were escalated by central operations.',
        decision: 'Keep the operational block and move utilization to the next safe slot.',
        decidedBy: 'central-1',
        alternativesConsidered: ['Cancel maintenance', 'Swap the asset allocation'],
        expectedImpact: 'Avoids unsafe overlap and preserves compliance.',
        status: 'confirmed'
      }
    });
    expect(decisionMemos).toEqual([
      {
        tenantId: 'tenant-a',
        action: 'agenda.conflict.override',
        aggregateType: 'agenda_event',
        aggregateId: 'event-1',
        assetId: 'asset-1',
        memo: {
          context: 'Two overlapping events were escalated by central operations.',
          decision: 'Keep the operational block and move utilization to the next safe slot.',
          decidedBy: 'central-1',
          alternativesConsidered: ['Cancel maintenance', 'Swap the asset allocation'],
          expectedImpact: 'Avoids unsafe overlap and preserves compliance.',
          status: 'confirmed'
        }
      }
    ]);
  });

  it('blocks decision memo creation when structured justification is incomplete', async () => {
    decisionMemos.length = 0;

    const result = await service.createDecisionMemo({
      actor: {
        userId: 'central-1',
        tenantId: 'tenant-a',
        role: 'central_operations',
        assetIds: []
      },
      tenantId: 'tenant-a',
      action: 'agenda.conflict.override',
      aggregateType: 'agenda_event',
      aggregateId: 'event-1',
      assetId: 'asset-1',
      justification: {
        context: '',
        decision: 'Keep the operational block and move utilization to the next safe slot.',
        decidedBy: 'central-1',
        alternativesConsidered: ['Cancel maintenance'],
        expectedImpact: 'Avoids unsafe overlap and preserves compliance.'
      }
    });

    expect(result).toEqual({
      confirmed: false,
      reason: 'JUSTIFICATION_REQUIRED'
    });
    expect(decisionMemos).toEqual([]);
  });
});
