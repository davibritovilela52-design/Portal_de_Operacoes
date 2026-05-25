import { describe, expect, it } from 'vitest';

import {
  AuditApplicationService,
  CreateDecisionMemoCommand,
  SearchAuditLedgerCommand,
  CreateRectificationCommand
} from '../src/modules/audit/audit-application.service.js';
import { AuditController } from '../src/modules/audit/audit.controller.js';

describe('AuditController', () => {
  const portalSessionService = {
    resolveActor: (actor: unknown) => actor
  };
  const controller = new AuditController({
    getCatalog: () => ({
      requiredJustificationFields: ['context']
    }),
    searchAuditLedger: async (request: SearchAuditLedgerCommand) => request,
    createRectification: async (request: CreateRectificationCommand) => request,
    createDecisionMemo: async (request: CreateDecisionMemoCommand) => request
  } as unknown as AuditApplicationService, portalSessionService as any);

  it('returns the audit governance catalog for clients', () => {
    expect(controller.getCatalog()).toEqual({
      requiredJustificationFields: ['context']
    });
  });

  it('delegates create rectification requests to the application service', async () => {
    const request = {
      actor: {
        userId: 'central-1',
        tenantId: 'tenant-a',
        role: 'central_operations' as const,
        assetIds: []
      },
      tenantId: 'tenant-a',
      record: {
        recordId: 'maintenance-1',
        status: 'completed' as const,
        version: 3
      },
      input: {
        changedBy: 'central-1',
        reason: 'Correct invoice reference.',
        afterSnapshot: {
          supplierInvoiceNumber: 'INV-055'
        }
      }
    };

    await expect(controller.createRectification(undefined, request)).resolves.toStrictEqual(request);
  });

  it('delegates decision memo creation requests to the application service', async () => {
    const request = {
      actor: {
        userId: 'central-1',
        tenantId: 'tenant-a',
        role: 'central_operations' as const,
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
        alternativesConsidered: ['Cancel maintenance'],
        expectedImpact: 'Avoids unsafe overlap and preserves compliance.'
      }
    };

    await expect(controller.createDecisionMemo(undefined, request)).resolves.toStrictEqual(request);
  });

  it('delegates audit ledger search requests to the application service', async () => {
    const request = {
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team' as const,
        assetIds: ['asset-1']
      },
      tenantId: 'tenant-a',
      filters: {
        types: ['decision_memo' as const]
      }
    };

    await expect(controller.searchAuditLedger(undefined, request)).resolves.toStrictEqual(request);
  });
});
