import { describe, expect, it } from 'vitest';

import { AccessPolicyService } from '../src/modules/access/access-policy.service.js';
import { EvidenceSecurityService } from '../src/modules/governance/evidence-security.service.js';
import { MaintenanceApplicationService } from '../src/modules/maintenance/maintenance-application.service.js';
import { parseMaintenanceTicketNotes } from '../src/modules/maintenance/maintenance-ticket-comments.js';
import {
  MaintenanceEvidence,
  MaintenanceTicket,
  MaintenanceWorkflowService
} from '../src/modules/maintenance/maintenance-workflow.service.js';

describe('MaintenanceApplicationService', () => {
  const createdRecords: Array<{ tenantId: string; ticket: MaintenanceTicket }> = [];
  const updatedRecords: Array<{ tenantId: string; ticketId: string; ticket: MaintenanceTicket }> = [];
  const statusTransitionRecords: Array<{
    tenantId: string;
    ticketId: string;
    ticket: MaintenanceTicket;
    transition: {
      fromStatus?: MaintenanceTicket['status'];
      transitionedBy: string;
      at: Date;
    };
  }> = [];
  const attachedEvidence: Array<{
    tenantId: string;
    ticketId: string;
    evidence: MaintenanceEvidence;
  }> = [];
  const service = new MaintenanceApplicationService(
    new AccessPolicyService(),
    new MaintenanceWorkflowService(),
    {
      create: async (tenantId: string, ticket: MaintenanceTicket) => {
        createdRecords.push({ tenantId, ticket });

        return ticket;
      },
      findById: async (tenantId: string, ticketId: string) => {
        if (tenantId !== 'tenant-a' || !['mt-1', 'mt-2'].includes(ticketId)) {
          return null;
        }

        return {
          id: ticketId,
          tenantId: 'tenant-a',
          assetId: 'asset-1',
          title: 'Pump oscillation diagnostic',
          category: 'corrective',
          priority: 'P2',
          description: 'Investigate starboard pump oscillation',
          notes: 'Awaiting quay access for deeper inspection.',
          legacyTicketCode: 'M-42',
          legacyMetadata: {
            legacyRowId: '42',
            requestedCategory: 'warranty',
            maintenanceSystem: 'electrical'
          },
          origin: 'asset_field_team',
          openedBy: 'field-1',
          openedAt: new Date('2026-05-13T12:00:00.000Z'),
          status: 'pending',
          kanbanSubstatus: 'call_opening',
          currentSubstep: undefined,
          freezeCount: 0,
          createdAt: new Date('2026-05-13T12:01:00.000Z'),
          updatedAt: new Date('2026-05-13T12:01:00.000Z')
        };
      },
      update: async (tenantId: string, ticketId: string, ticket: MaintenanceTicket) => {
        updatedRecords.push({ tenantId, ticketId, ticket });

        return {
          id: ticketId,
          tenantId,
          ...ticket,
          createdAt: new Date('2026-05-13T12:01:00.000Z'),
          updatedAt: new Date('2026-05-13T12:05:00.000Z')
        };
      },
      updateStatusWithTransitionHistory: async (
        tenantId: string,
        ticketId: string,
        ticket: MaintenanceTicket,
        transition: {
          fromStatus?: MaintenanceTicket['status'];
          transitionedBy: string;
          at: Date;
        }
      ) => {
        statusTransitionRecords.push({ tenantId, ticketId, ticket, transition });

        return {
          id: ticketId,
          tenantId,
          ...ticket,
          createdAt: new Date('2026-05-13T12:01:00.000Z'),
          updatedAt: new Date('2026-05-13T12:05:00.000Z')
        };
      },
      listByTenant: async (tenantId: string) => {
        if (tenantId !== 'tenant-a') {
          return [];
        }

        return [
          {
            id: 'mt-1',
            tenantId,
            assetId: 'asset-1',
            title: 'Pump oscillation diagnostic',
            category: 'corrective' as const,
            priority: 'P2' as const,
            description: 'Investigate starboard pump oscillation',
            notes: 'Awaiting quay access for deeper inspection.',
            legacyTicketCode: 'M-42',
            legacyMetadata: {
              legacyRowId: '42',
              requestedCategory: 'warranty',
              maintenanceSystem: 'electrical'
            },
            origin: 'asset_field_team' as const,
            openedBy: 'field-1',
            openedAt: new Date('2026-05-13T12:00:00.000Z'),
            status: 'pending' as const,
            kanbanSubstatus: 'call_opening' as const,
            currentSubstep: undefined,
            freezeCount: 0,
            createdAt: new Date('2026-05-13T12:01:00.000Z'),
            updatedAt: new Date('2026-05-13T12:01:00.000Z')
          },
          {
            id: 'mt-2',
            tenantId,
            assetId: 'asset-2',
            title: 'Critical release inspection',
            category: 'inspection' as const,
            priority: 'P1' as const,
            description: 'Critical inspection before release',
            origin: 'central_operations' as const,
            openedBy: 'central-1',
            openedAt: new Date('2026-05-14T08:00:00.000Z'),
            status: 'frozen' as const,
            kanbanSubstatus: 'accounts_freeze' as const,
            currentSubstep: undefined,
            freezeCount: 2,
            frozenReason: 'awaiting_central_operations_decision' as const,
            createdAt: new Date('2026-05-14T08:01:00.000Z'),
            updatedAt: new Date('2026-05-14T08:01:00.000Z')
          }
        ];
      },
      search: async (
        tenantId: string,
        filters?: {
          assetIds?: string[];
          statuses?: MaintenanceTicket['status'][];
          priorities?: MaintenanceTicket['priority'][];
          categories?: MaintenanceTicket['category'][];
        }
      ) => {
        const tickets =
          tenantId !== 'tenant-a'
            ? []
            : [
                {
                  id: 'mt-1',
                  tenantId,
                  assetId: 'asset-1',
                  title: 'Pump oscillation diagnostic',
                  category: 'corrective' as const,
                  priority: 'P2' as const,
                  description: 'Investigate starboard pump oscillation',
                  notes: 'Awaiting quay access for deeper inspection.',
                  legacyTicketCode: 'M-42',
                  legacyMetadata: {
                    legacyRowId: '42',
                    requestedCategory: 'warranty',
                    maintenanceSystem: 'electrical'
                  },
                  origin: 'asset_field_team' as const,
                  openedBy: 'field-1',
                  openedAt: new Date('2026-05-13T12:00:00.000Z'),
                  status: 'pending' as const,
                  kanbanSubstatus: 'call_opening' as const,
                  currentSubstep: undefined,
                  freezeCount: 0,
                  createdAt: new Date('2026-05-13T12:01:00.000Z'),
                  updatedAt: new Date('2026-05-13T12:01:00.000Z')
                },
                {
                  id: 'mt-2',
                  tenantId,
                  assetId: 'asset-2',
                  title: 'Critical release inspection',
                  category: 'inspection' as const,
                  priority: 'P1' as const,
                  description: 'Critical inspection before release',
                  origin: 'central_operations' as const,
                  openedBy: 'central-1',
                  openedAt: new Date('2026-05-14T08:00:00.000Z'),
                  status: 'frozen' as const,
                  kanbanSubstatus: 'accounts_freeze' as const,
                  currentSubstep: undefined,
                  freezeCount: 2,
                  frozenReason: 'awaiting_central_operations_decision' as const,
                  createdAt: new Date('2026-05-14T08:01:00.000Z'),
                  updatedAt: new Date('2026-05-14T08:01:00.000Z')
                }
              ];

        return tickets.filter(
          (ticket) =>
            (!filters?.assetIds?.length || filters.assetIds.includes(ticket.assetId)) &&
            (!filters?.statuses?.length || filters.statuses.includes(ticket.status)) &&
            (!filters?.priorities?.length || filters.priorities.includes(ticket.priority)) &&
            (!filters?.categories?.length || filters.categories.includes(ticket.category))
        );
      }
    },
    {
      listByTicketIds: async (_tenantId: string, ticketIds: string[]) =>
        [
          {
            id: 'cost-1',
            tenantId: 'tenant-a',
            maintenanceTicketId: 'mt-1',
            supplierId: null,
            description: 'Diagnostic labor',
            amount: 3200,
            currency: 'BRL',
            invoiceNumber: null,
            invoiceDate: null,
            registeredBy: 'central-1',
            registeredAt: new Date('2026-05-13T15:00:00.000Z'),
            createdAt: new Date('2026-05-13T15:00:00.000Z')
          },
          {
            id: 'cost-2',
            tenantId: 'tenant-a',
            maintenanceTicketId: 'mt-2',
            supplierId: 'supplier-2',
            description: 'Critical inspection',
            amount: 7800,
            currency: 'BRL',
            invoiceNumber: null,
            invoiceDate: null,
            registeredBy: 'central-2',
            registeredAt: new Date('2026-05-14T10:00:00.000Z'),
            createdAt: new Date('2026-05-14T10:00:00.000Z')
          }
        ].filter((cost) => ticketIds.includes(cost.maintenanceTicketId))
    },
    {
      create: async (tenantId: string, ticketId: string, evidence: MaintenanceEvidence) => {
        attachedEvidence.push({ tenantId, ticketId, evidence });

        return {
          id: 'evidence-1',
          tenantId,
          ticketId,
          ...evidence,
          createdAt: new Date('2026-05-13T12:03:00.000Z')
        };
      },
      listByTicket: async (tenantId: string, ticketId: string) => {
        if (tenantId !== 'tenant-a' || ticketId !== 'mt-1') {
          return [];
        }

        return [
          {
            id: 'evidence-1',
            tenantId,
            ticketId,
            type: 'diagnostic' as const,
            fileName: 'diagnostic-photo.jpg',
            mimeType: 'image/jpeg',
            fileSizeBytes: 1024,
            storageKey: 'maintenance/mt-1/diagnostic-photo.jpg',
            sha256: 'a'.repeat(64),
            antivirusStatus: 'clean' as const,
            uploadedBy: 'field-1',
            uploadedAt: new Date('2026-05-13T12:02:00.000Z'),
            createdAt: new Date('2026-05-13T12:03:00.000Z')
          }
        ];
      },
      listByTicketIds: async (tenantId: string, ticketIds: string[]) =>
        ticketIds.includes('mt-1')
          ? [
              {
                id: 'evidence-1',
                tenantId,
                ticketId: 'mt-1',
                type: 'diagnostic' as const,
                fileName: 'diagnostic-photo.jpg',
                mimeType: 'image/jpeg',
                fileSizeBytes: 1024,
                storageKey: 'maintenance/mt-1/diagnostic-photo.jpg',
                sha256: 'a'.repeat(64),
                antivirusStatus: 'clean' as const,
                uploadedBy: 'field-1',
                uploadedAt: new Date('2026-05-13T12:02:00.000Z'),
                createdAt: new Date('2026-05-13T12:03:00.000Z')
              }
            ]
          : [],
      findById: async (tenantId: string, ticketId: string, evidenceId: string) => {
        if (tenantId !== 'tenant-a' || ticketId !== 'mt-1' || evidenceId !== 'evidence-1') {
          return null;
        }

        return {
          id: 'evidence-1',
          tenantId,
          ticketId,
          type: 'diagnostic' as const,
          fileName: 'diagnostic-photo.jpg',
          mimeType: 'image/jpeg',
          fileSizeBytes: 1024,
          storageKey: 'maintenance/mt-1/diagnostic-photo.jpg',
          sha256: 'a'.repeat(64),
          antivirusStatus: 'clean' as const,
          uploadedBy: 'field-1',
          uploadedAt: new Date('2026-05-13T12:02:00.000Z'),
          createdAt: new Date('2026-05-13T12:03:00.000Z')
        };
      }
    },
    new EvidenceSecurityService()
  );

  it('creates and persists a maintenance ticket when the actor has asset scope permission', async () => {
    createdRecords.length = 0;

    const result = await service.createTicket({
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team',
        assetIds: ['asset-1']
      },
      tenantId: 'tenant-a',
      input: {
        assetId: 'asset-1',
        category: 'corrective',
        priority: 'P2',
        description: 'Investigate starboard pump oscillation',
        origin: 'asset_field_team',
        openedBy: 'field-1',
        openedAt: new Date('2026-05-13T12:00:00.000Z')
      }
    });

    expect(result).toEqual({
      created: true,
      reason: 'CREATED',
      ticket: {
        assetId: 'asset-1',
        category: 'corrective',
        priority: 'P2',
        description: 'Investigate starboard pump oscillation',
        origin: 'asset_field_team',
        openedBy: 'field-1',
        openedAt: new Date('2026-05-13T12:00:00.000Z'),
        status: 'pending',
        kanbanSubstatus: 'call_opening',
        freezeCount: 0
      }
    });
    expect(createdRecords).toEqual([
      {
        tenantId: 'tenant-a',
        ticket: {
          assetId: 'asset-1',
          category: 'corrective',
          priority: 'P2',
          description: 'Investigate starboard pump oscillation',
          origin: 'asset_field_team',
          openedBy: 'field-1',
          openedAt: new Date('2026-05-13T12:00:00.000Z'),
          status: 'pending',
          kanbanSubstatus: 'call_opening',
          freezeCount: 0
        }
      }
    ]);
  });

  it('blocks ticket creation when the actor does not have asset scope permission', async () => {
    createdRecords.length = 0;

    const result = await service.createTicket({
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team',
        assetIds: ['asset-1']
      },
      tenantId: 'tenant-a',
      input: {
        assetId: 'asset-2',
        category: 'corrective',
        priority: 'P2',
        description: 'Investigate starboard pump oscillation',
        origin: 'asset_field_team',
        openedBy: 'field-1',
        openedAt: new Date('2026-05-13T12:00:00.000Z')
      }
    });

    expect(result).toEqual({
      created: false,
      reason: 'FORBIDDEN',
      accessReason: 'ASSET_SCOPE_MISMATCH'
    });
    expect(createdRecords).toEqual([]);
  });

  it('transitions and persists a maintenance ticket when the actor has scope to update the asset', async () => {
    updatedRecords.length = 0;
    statusTransitionRecords.length = 0;
    attachedEvidence.length = 0;

    const result = await service.transitionTicket({
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team',
        assetIds: ['asset-1']
      },
      tenantId: 'tenant-a',
      ticketId: 'mt-1',
      input: {
        toStatus: 'in_progress',
        kanbanSubstatus: 'service_execution'
      }
    });

    expect(result).toEqual({
      allowed: true,
      reason: 'ALLOWED',
      escalationRequired: false,
      ticket: {
        assetId: 'asset-1',
        title: 'Pump oscillation diagnostic',
        category: 'corrective',
        priority: 'P2',
        description: 'Investigate starboard pump oscillation',
        notes: 'Awaiting quay access for deeper inspection.',
        legacyTicketCode: 'M-42',
        legacyMetadata: {
          legacyRowId: '42',
          requestedCategory: 'warranty',
          maintenanceSystem: 'electrical'
        },
        origin: 'asset_field_team',
        openedBy: 'field-1',
        openedAt: new Date('2026-05-13T12:00:00.000Z'),
        status: 'in_progress',
        kanbanSubstatus: 'service_execution',
        currentSubstep: 'realizacao_servico_reparo',
        freezeCount: 0,
        frozenReason: undefined
      }
    });
    expect(updatedRecords).toEqual([]);
    expect(statusTransitionRecords).toHaveLength(1);
    expect(statusTransitionRecords[0]).toMatchObject({
      tenantId: 'tenant-a',
      ticketId: 'mt-1',
      ticket: {
        assetId: 'asset-1',
        title: 'Pump oscillation diagnostic',
        category: 'corrective',
        priority: 'P2',
        description: 'Investigate starboard pump oscillation',
        notes: 'Awaiting quay access for deeper inspection.',
        legacyTicketCode: 'M-42',
        legacyMetadata: {
          legacyRowId: '42',
          requestedCategory: 'warranty',
          maintenanceSystem: 'electrical'
        },
        origin: 'asset_field_team',
        openedBy: 'field-1',
        openedAt: new Date('2026-05-13T12:00:00.000Z'),
        status: 'in_progress',
        kanbanSubstatus: 'service_execution',
        currentSubstep: 'realizacao_servico_reparo',
        freezeCount: 0,
        frozenReason: undefined
      },
      transition: {
        fromStatus: 'pending',
        transitionedBy: 'field-1'
      }
    });
    expect(statusTransitionRecords[0]?.transition.at).toBeInstanceOf(Date);
  });

  it('persists same-status kanban updates without adding transition history', async () => {
    const ticketStore = new Map<
      string,
      MaintenanceTicket & {
        id: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
      }
    >([
      [
        'mt-payment',
        {
          id: 'mt-payment',
          tenantId: 'tenant-a',
          assetId: 'asset-1',
          title: 'Supplier payment follow-up',
          category: 'corrective' as const,
          priority: 'P2' as const,
          description: 'Track final supplier payment confirmation.',
          origin: 'central_operations' as const,
          openedBy: 'central-1',
          openedAt: new Date('2026-05-13T12:00:00.000Z'),
          status: 'payment' as const,
          kanbanSubstatus: 'payment_request' as const,
          freezeCount: 0,
          createdAt: new Date('2026-05-13T12:01:00.000Z'),
          updatedAt: new Date('2026-05-13T12:01:00.000Z')
        }
      ]
    ]);
    const sameStatusUpdates: Array<{
      tenantId: string;
      ticketId: string;
      ticket: MaintenanceTicket;
    }> = [];
    const sameStatusHistory: Array<{
      tenantId: string;
      ticketId: string;
      ticket: MaintenanceTicket;
    }> = [];
    const sameStatusService = new MaintenanceApplicationService(
      new AccessPolicyService(),
      new MaintenanceWorkflowService(),
      {
        create: async () => {
          throw new Error('not used');
        },
        findById: async (tenantId: string, ticketId: string) => {
          const ticket = ticketStore.get(ticketId);
          return ticket?.tenantId === tenantId ? ticket : null;
        },
        listByTenant: async () => [...ticketStore.values()],
        search: async () => [...ticketStore.values()],
        update: async (tenantId: string, ticketId: string, ticket: MaintenanceTicket) => {
          const existing = ticketStore.get(ticketId);
          if (!existing || existing.tenantId !== tenantId) {
            throw new Error('ticket not found');
          }

          const updated = {
            ...existing,
            ...ticket,
            id: ticketId,
            tenantId,
            updatedAt: new Date('2026-05-13T12:05:00.000Z')
          };
          ticketStore.set(ticketId, updated);
          sameStatusUpdates.push({ tenantId, ticketId, ticket });
          return updated;
        },
        updateStatusWithTransitionHistory: async (
          tenantId: string,
          ticketId: string,
          ticket: MaintenanceTicket
        ) => {
          sameStatusHistory.push({ tenantId, ticketId, ticket });
          return {
            ...(ticketStore.get(ticketId) as MaintenanceTicket & {
              id: string;
              tenantId: string;
              createdAt: Date;
              updatedAt: Date;
            }),
            ...ticket,
            id: ticketId,
            tenantId,
            updatedAt: new Date('2026-05-13T12:05:00.000Z')
          };
        }
      },
      {
        listByTicketIds: async () => []
      },
      {
        create: async () => {
          throw new Error('not used');
        },
        listByTicket: async () => [],
        listByTicketIds: async () => [],
        findById: async () => null
      },
      new EvidenceSecurityService()
    );

    const result = await sameStatusService.transitionTicket({
      actor: {
        userId: 'central-1',
        tenantId: 'tenant-a',
        role: 'central_operations',
        assetIds: []
      },
      tenantId: 'tenant-a',
      ticketId: 'mt-payment',
      input: {
        toStatus: 'payment',
        kanbanSubstatus: 'payment_receipt'
      }
    });

    expect(result).toMatchObject({
      allowed: true,
      reason: 'ALLOWED',
      ticket: {
        status: 'payment',
        kanbanSubstatus: 'payment_receipt'
      }
    });
    expect(sameStatusUpdates).toHaveLength(1);
    expect(sameStatusHistory).toEqual([]);
  });

  it('updates the current substep and exposes it in ticket detail once the ticket is in progress', async () => {
    const actor = {
      userId: 'field-1',
      tenantId: 'tenant-a',
      role: 'asset_field_team' as const,
      assetIds: ['asset-1']
    };
    const ticketStore = new Map<
      string,
      MaintenanceTicket & {
        id: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
      }
    >([
      [
        'mt-1',
        {
          id: 'mt-1',
          tenantId: 'tenant-a',
          assetId: 'asset-1',
          title: 'Pump oscillation diagnostic',
          category: 'corrective' as const,
          priority: 'P2' as const,
          description: 'Investigate starboard pump oscillation',
          notes: 'Awaiting quay access for deeper inspection.',
          legacyTicketCode: 'M-42',
          legacyMetadata: {
            legacyRowId: '42',
            requestedCategory: 'warranty',
            maintenanceSystem: 'electrical'
          },
          origin: 'asset_field_team' as const,
          openedBy: 'field-1',
          openedAt: new Date('2026-05-13T12:00:00.000Z'),
          status: 'pending' as const,
          kanbanSubstatus: 'call_opening' as const,
          currentSubstep: undefined,
          freezeCount: 0,
          createdAt: new Date('2026-05-13T12:01:00.000Z'),
          updatedAt: new Date('2026-05-13T12:01:00.000Z')
        }
      ]
    ]);
    const evidences = [
      {
        id: 'evidence-1',
        tenantId: 'tenant-a',
        ticketId: 'mt-1',
        type: 'diagnostic' as const,
        fileName: 'diagnostic-photo.jpg',
        mimeType: 'image/jpeg',
        fileSizeBytes: 1024,
        storageKey: 'maintenance/mt-1/diagnostic-photo.jpg',
        sha256: 'a'.repeat(64),
        antivirusStatus: 'clean' as const,
        uploadedBy: 'field-1',
        uploadedAt: new Date('2026-05-13T12:02:00.000Z'),
        createdAt: new Date('2026-05-13T12:03:00.000Z')
      }
    ];
    const statefulService = new MaintenanceApplicationService(
      new AccessPolicyService(),
      new MaintenanceWorkflowService(),
      {
        create: async () => {
          throw new Error('not used');
        },
        findById: async (tenantId: string, ticketId: string) => {
          const ticket = ticketStore.get(ticketId);
          return ticket?.tenantId === tenantId ? ticket : null;
        },
        listByTenant: async (tenantId: string) =>
          [...ticketStore.values()].filter((ticket) => ticket.tenantId === tenantId),
        search: async (
          tenantId: string,
          filters?: {
            assetIds?: string[];
            statuses?: MaintenanceTicket['status'][];
            priorities?: MaintenanceTicket['priority'][];
            categories?: MaintenanceTicket['category'][];
          }
        ) =>
          [...ticketStore.values()].filter(
            (ticket) =>
              ticket.tenantId === tenantId &&
              (!filters?.assetIds?.length || filters.assetIds.includes(ticket.assetId)) &&
              (!filters?.statuses?.length || filters.statuses.includes(ticket.status)) &&
              (!filters?.priorities?.length || filters.priorities.includes(ticket.priority)) &&
              (!filters?.categories?.length || filters.categories.includes(ticket.category))
          ),
        update: async (tenantId: string, ticketId: string, ticket: MaintenanceTicket) => {
          const existing = ticketStore.get(ticketId);
          if (!existing || existing.tenantId !== tenantId) {
            throw new Error('ticket not found');
          }

          const updated = {
            ...existing,
            ...ticket,
            id: ticketId,
            tenantId,
            updatedAt: new Date('2026-05-13T12:05:00.000Z')
          };
          ticketStore.set(ticketId, updated);
          return updated;
        },
        updateStatusWithTransitionHistory: async (
          tenantId: string,
          ticketId: string,
          ticket: MaintenanceTicket
        ) => {
          const existing = ticketStore.get(ticketId);
          if (!existing || existing.tenantId !== tenantId) {
            throw new Error('ticket not found');
          }

          const updated = {
            ...existing,
            ...ticket,
            id: ticketId,
            tenantId,
            updatedAt: new Date('2026-05-13T12:05:00.000Z')
          };
          ticketStore.set(ticketId, updated);
          return updated;
        }
      },
      {
        listByTicketIds: async () => []
      },
      {
        create: async () => {
          throw new Error('not used');
        },
        listByTicket: async (tenantId: string, ticketId: string) =>
          tenantId === 'tenant-a' && ticketId === 'mt-1' ? evidences : [],
        listByTicketIds: async (tenantId: string, ticketIds: string[]) =>
          tenantId === 'tenant-a'
            ? evidences.filter((evidence) => ticketIds.includes(evidence.ticketId))
            : [],
        findById: async () => null
      },
      new EvidenceSecurityService()
    );

    const transitionResult = await statefulService.transitionTicket({
      actor,
      tenantId: 'tenant-a',
      ticketId: 'mt-1',
      input: {
        toStatus: 'in_progress'
      }
    });
    expect(transitionResult).toMatchObject({
      allowed: true,
      reason: 'ALLOWED',
      ticket: {
        status: 'in_progress',
        kanbanSubstatus: 'ticket_qualification',
        currentSubstep: undefined
      }
    });

    const substepResult = await statefulService.updateSubstep({
      actor,
      tenantId: 'tenant-a',
      ticketId: 'mt-1',
      input: {
        currentSubstep: 'diagnostico_presencial'
      }
    });
    expect(substepResult).toMatchObject({
      allowed: true,
      reason: 'ALLOWED',
      ticket: {
        status: 'in_progress',
        kanbanSubstatus: 'onsite_diagnosis',
        currentSubstep: 'diagnostico_presencial'
      }
    });

    const detailResult = await statefulService.getTicketDetail({
      actor,
      tenantId: 'tenant-a',
      ticketId: 'mt-1'
    });
    expect(detailResult).toMatchObject({
      found: true
    });
    if (detailResult.found) {
      expect(detailResult.ticket.status).toBe('in_progress');
      expect(detailResult.ticket.kanbanSubstatus).toBe('onsite_diagnosis');
      expect(detailResult.ticket.currentSubstep).toBe('diagnostico_presencial');
    }
  });

  it('rejects substep updates when the ticket is not in progress', async () => {
    updatedRecords.length = 0;

    const result = await service.updateSubstep({
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team',
        assetIds: ['asset-1']
      },
      tenantId: 'tenant-a',
      ticketId: 'mt-1',
      input: {
        currentSubstep: 'diagnostico_presencial'
      }
    });

    expect(result).toEqual({
      allowed: false,
      reason: 'SUBSTEP_NOT_APPLICABLE'
    });
    expect(updatedRecords).toEqual([]);
  });

  it('returns not found when attempting to transition a missing ticket', async () => {
    updatedRecords.length = 0;

    const result = await service.transitionTicket({
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team',
        assetIds: ['asset-1']
      },
      tenantId: 'tenant-a',
      ticketId: 'mt-404',
      input: {
        toStatus: 'in_progress'
      }
    });

    expect(result).toEqual({
      allowed: false,
      reason: 'NOT_FOUND'
    });
    expect(updatedRecords).toEqual([]);
  });

  it('blocks transition when required evidence is missing for the target phase', async () => {
    updatedRecords.length = 0;

    const result = await service.transitionTicket({
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team',
        assetIds: ['asset-1']
      },
      tenantId: 'tenant-a',
      ticketId: 'mt-2',
      input: {
        toStatus: 'in_progress'
      }
    });

    expect(result).toEqual({
      allowed: false,
      reason: 'REQUIRED_EVIDENCE_MISSING',
      missingEvidenceTypes: ['diagnostic']
    });
    expect(updatedRecords).toEqual([]);
  });

  it('appends a persisted comment to ticket notes when the actor has scope', async () => {
    updatedRecords.length = 0;

    const result = await service.registerComment({
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team',
        assetIds: ['asset-1']
      },
      tenantId: 'tenant-a',
      ticketId: 'mt-1',
      input: {
        message: 'Fornecedor acionado para retorno ate o fim do dia.',
        commentedBy: 'field-1',
        commentedAt: new Date('2026-05-13T12:03:00.000Z')
      }
    });

    expect(result).toMatchObject({
      registered: true,
      reason: 'REGISTERED'
    });
    expect(updatedRecords).toHaveLength(1);
    expect(updatedRecords[0]?.ticket.notes).toContain('Awaiting quay access for deeper inspection.');

    const parsedNotes = parseMaintenanceTicketNotes(updatedRecords[0]?.ticket.notes);

    expect(parsedNotes.summary).toBe('Awaiting quay access for deeper inspection.');
    expect(parsedNotes.comments).toHaveLength(1);
    expect(parsedNotes.comments[0]).toMatchObject({
      author: 'field-1',
      message: 'Fornecedor acionado para retorno ate o fim do dia.',
      at: '2026-05-13T12:03:00.000Z'
    });
  });

  it('attaches evidence metadata when the actor has scope to update the ticket asset', async () => {
    attachedEvidence.length = 0;
    updatedRecords.length = 0;

    const result = await service.attachEvidence({
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team',
        assetIds: ['asset-1']
      },
      tenantId: 'tenant-a',
      ticketId: 'mt-1',
      input: {
        type: 'diagnostic',
        fileName: 'diagnostic-photo.jpg',
        mimeType: 'image/jpeg',
        fileSizeBytes: 1024,
        sha256: 'a'.repeat(64),
        uploadedBy: 'field-1',
        uploadedAt: new Date('2026-05-13T12:02:00.000Z')
      }
    });

    expect(result).toEqual({
      attached: true,
      reason: 'ATTACHED',
      evidence: {
        type: 'diagnostic',
        fileName: 'diagnostic-photo.jpg',
        mimeType: 'image/jpeg',
        fileSizeBytes: 1024,
        storageKey: 'maintenance/mt-1/aaaaaaaaaaaa-diagnostic-photo.jpg',
        sha256: 'a'.repeat(64),
        antivirusStatus: 'pending',
        uploadedBy: 'field-1',
        uploadedAt: new Date('2026-05-13T12:02:00.000Z')
      }
    });
    expect(attachedEvidence).toEqual([
      {
        tenantId: 'tenant-a',
        ticketId: 'mt-1',
        evidence: {
          type: 'diagnostic',
          fileName: 'diagnostic-photo.jpg',
          mimeType: 'image/jpeg',
          fileSizeBytes: 1024,
          storageKey: 'maintenance/mt-1/aaaaaaaaaaaa-diagnostic-photo.jpg',
          sha256: 'a'.repeat(64),
          antivirusStatus: 'pending',
          uploadedBy: 'field-1',
          uploadedAt: new Date('2026-05-13T12:02:00.000Z')
        }
      }
    ]);
    expect(updatedRecords).toEqual([
      {
        tenantId: 'tenant-a',
        ticketId: 'mt-1',
        ticket: {
          assetId: 'asset-1',
          title: 'Pump oscillation diagnostic',
          category: 'corrective',
          priority: 'P2',
          description: 'Investigate starboard pump oscillation',
          notes: 'Awaiting quay access for deeper inspection.',
          legacyTicketCode: 'M-42',
          legacyMetadata: {
            legacyRowId: '42',
            requestedCategory: 'warranty',
            maintenanceSystem: 'electrical'
          },
          origin: 'asset_field_team',
          openedBy: 'field-1',
          openedAt: new Date('2026-05-13T12:00:00.000Z'),
          status: 'pending',
          kanbanSubstatus: 'call_opening',
          currentSubstep: undefined,
          freezeCount: 0,
          frozenReason: undefined
        }
      }
    ]);
  });

  it('blocks evidence attachment when upload security policy fails', async () => {
    attachedEvidence.length = 0;
    updatedRecords.length = 0;

    const result = await service.attachEvidence({
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team',
        assetIds: ['asset-1']
      },
      tenantId: 'tenant-a',
      ticketId: 'mt-1',
      input: {
        type: 'diagnostic',
        fileName: 'diagnostic-tool.exe',
        mimeType: 'application/x-msdownload',
        fileSizeBytes: 1024,
        sha256: 'b'.repeat(64),
        uploadedBy: 'field-1',
        uploadedAt: new Date('2026-05-13T12:02:00.000Z')
      }
    });

    expect(result).toEqual({
      attached: false,
      reason: 'UPLOAD_POLICY_BLOCKED',
      uploadReason: 'MIME_TYPE_NOT_ALLOWED'
    });
    expect(attachedEvidence).toEqual([]);
    expect(updatedRecords).toEqual([]);
  });

  it('issues mediated evidence access for actors with scope on the ticket asset', async () => {
    const result = await service.requestEvidenceAccess({
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team',
        assetIds: ['asset-1']
      },
      tenantId: 'tenant-a',
      ticketId: 'mt-1',
      evidenceId: 'evidence-1'
    });

    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.access.storageKey).toBe('maintenance/mt-1/diagnostic-photo.jpg');
      expect(result.access.token).toBeTruthy();
      expect(result.access.expiresAt.getTime()).toBeGreaterThan(Date.now());
    }
  });

  it('lists maintenance tickets in tenant scope and filters asset field team results to assigned assets', async () => {
    const result = await (
      service as MaintenanceApplicationService & {
        searchTickets: (command: {
          actor: {
            userId: string;
            tenantId: string;
            role: 'asset_field_team';
            assetIds: string[];
          };
          tenantId: string;
          filters: {
            statuses: ['pending', 'frozen'];
          };
        }) => Promise<unknown>;
      }
    ).searchTickets({
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team',
        assetIds: ['asset-1']
      },
      tenantId: 'tenant-a',
      filters: {
        statuses: ['pending', 'frozen']
      }
    });

    expect(result).toEqual({
      tickets: [
        {
          id: 'mt-1',
          legacyRowId: '42',
          assetId: 'asset-1',
          title: 'Pump oscillation diagnostic',
          category: 'warranty',
          priority: 'P2',
          description: 'Investigate starboard pump oscillation',
          maintenanceSystem: 'electrical',
          origin: 'asset_field_team',
          openedBy: 'field-1',
          openedAt: new Date('2026-05-13T12:00:00.000Z'),
          status: 'pending',
          kanbanSubstatus: 'call_opening',
          currentSubstep: undefined,
          freezeCount: 0,
          frozenReason: undefined,
          updatedAt: new Date('2026-05-13T12:01:00.000Z'),
          evidenceCount: 1,
          evidenceTypes: ['diagnostic']
        }
      ]
    });
  });

  it('lists scoped maintenance costs for the authorized actor', async () => {
    const result = await service.searchSummary({
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team',
        assetIds: ['asset-1']
      },
      tenantId: 'tenant-a'
    });

    expect(result).toEqual({
      costs: [
        {
          id: 'cost-1',
          maintenanceTicketId: 'mt-1',
          assetId: 'asset-1',
          description: 'Diagnostic labor',
          amount: 3200,
          currency: 'BRL',
          registeredBy: 'central-1',
          registeredAt: new Date('2026-05-13T15:00:00.000Z')
        }
      ]
    });
  });

  it('returns maintenance ticket detail with attached evidences for an authorized actor', async () => {
    const result = await (
      service as MaintenanceApplicationService & {
        getTicketDetail: (command: {
          actor: {
            userId: string;
            tenantId: string;
            role: 'asset_field_team';
            assetIds: string[];
          };
          tenantId: string;
          ticketId: string;
        }) => Promise<unknown>;
      }
    ).getTicketDetail({
      actor: {
        userId: 'field-1',
        tenantId: 'tenant-a',
        role: 'asset_field_team',
        assetIds: ['asset-1']
      },
      tenantId: 'tenant-a',
      ticketId: 'mt-1'
    });

    expect(result).toEqual({
      found: true,
      ticket: {
        id: 'mt-1',
        legacyRowId: '42',
        assetId: 'asset-1',
        title: 'Pump oscillation diagnostic',
        category: 'warranty',
        priority: 'P2',
        description: 'Investigate starboard pump oscillation',
        maintenanceSystem: 'electrical',
        notes: 'Awaiting quay access for deeper inspection.',
        legacyTicketCode: 'M-42',
        origin: 'asset_field_team',
        openedBy: 'field-1',
        openedAt: new Date('2026-05-13T12:00:00.000Z'),
        status: 'pending',
        kanbanSubstatus: 'call_opening',
        currentSubstep: undefined,
        freezeCount: 0,
        frozenReason: undefined,
        updatedAt: new Date('2026-05-13T12:01:00.000Z'),
        evidenceCount: 1,
        evidenceTypes: ['diagnostic'],
        evidences: [
          {
            id: 'evidence-1',
            tenantId: 'tenant-a',
            ticketId: 'mt-1',
            type: 'diagnostic',
            fileName: 'diagnostic-photo.jpg',
            mimeType: 'image/jpeg',
            fileSizeBytes: 1024,
            storageKey: 'maintenance/mt-1/diagnostic-photo.jpg',
            sha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            antivirusStatus: 'clean',
            uploadedBy: 'field-1',
            uploadedAt: new Date('2026-05-13T12:02:00.000Z'),
            createdAt: new Date('2026-05-13T12:03:00.000Z')
          }
        ]
      }
    });
  });
});
