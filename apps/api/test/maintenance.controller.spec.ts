import { describe, expect, it } from 'vitest';

import { MaintenanceController } from '../src/modules/maintenance/maintenance.controller.js';
import {
  AttachMaintenanceEvidenceCommand,
  CreateMaintenanceTicketCommand,
  MaintenanceApplicationService,
  RegisterMaintenanceCommentCommand,
  TransitionMaintenanceTicketCommand
} from '../src/modules/maintenance/maintenance-application.service.js';
import { MaintenanceWorkflowService } from '../src/modules/maintenance/maintenance-workflow.service.js';

describe('MaintenanceController', () => {
  const portalSessionService = {
    resolveActor: (actor: unknown) => actor
  };
  const controller = new MaintenanceController({
    getCatalog: () => ({
      statuses: ['pending'],
      priorities: ['P1']
    }),
    createTicket: async (request: CreateMaintenanceTicketCommand) => request,
    searchTickets: async (request: unknown) => request,
    searchSummary: async (request: unknown) => request,
    getTicketDetail: async (request: unknown) => request,
    transitionTicket: async (request: TransitionMaintenanceTicketCommand) => request,
    registerComment: async (request: RegisterMaintenanceCommentCommand) => request,
    attachEvidence: async (request: AttachMaintenanceEvidenceCommand) => request,
    requestEvidenceAccess: async (request: unknown) => request
  } as unknown as MaintenanceApplicationService, portalSessionService as any);

  it('returns the maintenance catalog for clients', () => {
    expect(controller.getCatalog()).toEqual({
      statuses: ['pending'],
      priorities: ['P1']
    });
  });

  it('delegates create ticket requests to the application service', async () => {
    const request = {
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team' as const,
        assetIds: ['asset-1']
      },
      tenantId: 'tenant-a',
      input: {
        assetId: 'asset-1',
        category: 'corrective' as const,
        priority: 'P2' as const,
        description: 'Investigate starboard pump oscillation',
        origin: 'asset_field_team' as const,
        openedBy: 'field-1',
        openedAt: new Date('2026-05-13T12:00:00.000Z')
      }
    };

    await expect(controller.createTicket(undefined, request)).resolves.toStrictEqual(request);
  });

  it('normalizes string dates in create ticket requests', async () => {
    const request = {
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team' as const,
        assetIds: ['asset-1']
      },
      tenantId: 'tenant-a',
      input: {
        assetId: 'asset-1',
        category: 'corrective' as const,
        priority: 'P2' as const,
        description: 'Investigate starboard pump oscillation',
        origin: 'asset_field_team' as const,
        openedBy: 'field-1',
        openedAt: '2026-05-13T12:00:00.000Z'
      }
    };

    await expect(
      controller.createTicket(undefined, request as unknown as CreateMaintenanceTicketCommand)
    ).resolves.toStrictEqual({
      ...request,
      input: {
        ...request.input,
        openedAt: new Date('2026-05-13T12:00:00.000Z')
      }
    });
  });

  it('delegates transition requests to the application service', async () => {
    const request = {
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team' as const,
        assetIds: ['asset-1']
      },
      tenantId: 'tenant-a',
      ticketId: 'mt-1',
      input: {
        toStatus: 'in_progress' as const
      }
    };

    await expect(controller.transitionTicket(request.ticketId, undefined, request)).resolves.toStrictEqual(request);
  });

  it('normalizes string dates in maintenance comment requests', async () => {
    const request = {
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team' as const,
        assetIds: ['asset-1']
      },
      tenantId: 'tenant-a',
      ticketId: 'mt-1',
      input: {
        message: 'Aguardando retorno do fornecedor.',
        commentedBy: 'field-1',
        commentedAt: '2026-05-13T12:03:00.000Z'
      }
    };

    await expect(
      controller.registerComment(
        request.ticketId,
        undefined,
        request as unknown as RegisterMaintenanceCommentCommand
      )
    ).resolves.toStrictEqual({
      ...request,
      input: {
        ...request.input,
        commentedAt: new Date('2026-05-13T12:03:00.000Z')
      }
    });
  });

  it('delegates evidence attachment requests to the application service', async () => {
    const request = {
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team' as const,
        assetIds: ['asset-1']
      },
      tenantId: 'tenant-a',
      ticketId: 'mt-1',
      input: {
        type: 'diagnostic' as const,
        fileName: 'diagnostic-photo.jpg',
        mimeType: 'image/jpeg',
        fileSizeBytes: 1024,
        sha256: 'a'.repeat(64),
        uploadedBy: 'field-1',
        uploadedAt: new Date('2026-05-13T12:02:00.000Z')
      }
    };

    await expect(controller.attachEvidence(request.ticketId, undefined, request)).resolves.toStrictEqual(
      request
    );
  });

  it('normalizes string dates in evidence attachment requests', async () => {
    const request = {
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team' as const,
        assetIds: ['asset-1']
      },
      tenantId: 'tenant-a',
      ticketId: 'mt-1',
      input: {
        type: 'diagnostic' as const,
        fileName: 'diagnostic-photo.jpg',
        mimeType: 'image/jpeg',
        fileSizeBytes: 1024,
        sha256: 'a'.repeat(64),
        uploadedBy: 'field-1',
        uploadedAt: '2026-05-13T12:02:00.000Z'
      }
    };

    await expect(
      controller.attachEvidence(
        request.ticketId,
        undefined,
        request as unknown as AttachMaintenanceEvidenceCommand
      )
    ).resolves.toStrictEqual({
      ...request,
      input: {
        ...request.input,
        uploadedAt: new Date('2026-05-13T12:02:00.000Z')
      }
    });
  });

  it('delegates evidence access requests to the application service', async () => {
    const request = {
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team' as const,
        assetIds: ['asset-1']
      },
      tenantId: 'tenant-a',
      ticketId: 'mt-1',
      evidenceId: 'evidence-1'
    };

    await expect(controller.requestEvidenceAccess(request.ticketId, request.evidenceId, undefined, request)).resolves.toStrictEqual(
      request
    );
  });

  it('delegates maintenance queue search requests to the application service', async () => {
    const request = {
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team' as const,
        assetIds: ['asset-1']
      },
      tenantId: 'tenant-a',
      filters: {
        statuses: ['pending' as const]
      }
    };

    await expect(controller.searchTickets(undefined, request)).resolves.toStrictEqual(request);
  });

  it('delegates maintenance summary requests to the application service', async () => {
    const request = {
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team' as const,
        assetIds: ['asset-1']
      },
      tenantId: 'tenant-a'
    };

    await expect(controller.searchSummary(undefined, request)).resolves.toStrictEqual(request);
  });

  it('delegates maintenance detail requests to the application service', async () => {
    const request = {
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team' as const,
        assetIds: ['asset-1']
      },
      tenantId: 'tenant-a',
      ticketId: 'mt-1'
    };

    await expect(controller.getTicketDetail(request.ticketId, undefined, request)).resolves.toStrictEqual(
      request
    );
  });

  it('keeps the domain workflow service available for internal consumers', () => {
    const workflow = new MaintenanceWorkflowService();

    expect(workflow.getCatalog().statuses).toContain('pending');
  });
});
