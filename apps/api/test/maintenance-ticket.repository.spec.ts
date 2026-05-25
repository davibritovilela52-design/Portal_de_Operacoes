import { describe, expect, it, vi } from 'vitest';

import { PrismaMaintenanceTicketRepository } from '../src/modules/maintenance/maintenance-ticket.repository.js';

describe('PrismaMaintenanceTicketRepository', () => {
  it('maps a maintenance ticket into the Prisma create payload with tenant scope', async () => {
    const create = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'mt-1',
      ...data,
      createdAt: new Date('2026-05-13T12:01:00.000Z'),
      updatedAt: new Date('2026-05-13T12:01:00.000Z')
    }));

    const repository = new PrismaMaintenanceTicketRepository({
      maintenanceTicket: {
        create,
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn()
      },
      maintenanceStatusTransition: {
        create: vi.fn()
      },
      $transaction: vi.fn()
    } as never);

    const ticket = {
      assetId: 'asset-1',
      category: 'corrective' as const,
      priority: 'P2' as const,
      description: 'Investigate starboard pump oscillation',
      origin: 'asset_field_team' as const,
      openedBy: 'field-1',
      openedAt: new Date('2026-05-13T12:00:00.000Z'),
      status: 'in_progress' as const,
      kanbanSubstatus: 'ticket_qualification' as const,
      currentSubstep: 'qualificacao_do_chamado' as const,
      freezeCount: 0
    };

    const result = await repository.create('tenant-a', ticket);

    expect(create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-a',
        assetId: 'asset-1',
        category: 'corrective',
        priority: 'P2',
        description: 'Investigate starboard pump oscillation',
        origin: 'asset_field_team',
        openedBy: 'field-1',
        openedAt: new Date('2026-05-13T12:00:00.000Z'),
        status: 'in_progress',
        kanbanSubstatus: 'ticket_qualification',
        currentSubstep: 'qualificacao_do_chamado',
        freezeCount: 0,
        frozenReason: undefined
      }
    });
    expect(result).toEqual({
      id: 'mt-1',
      tenantId: 'tenant-a',
      assetId: 'asset-1',
      category: 'corrective',
      priority: 'P2',
      description: 'Investigate starboard pump oscillation',
      origin: 'asset_field_team',
      openedBy: 'field-1',
      openedAt: new Date('2026-05-13T12:00:00.000Z'),
      status: 'in_progress',
      kanbanSubstatus: 'ticket_qualification',
      currentSubstep: 'qualificacao_do_chamado',
      freezeCount: 0,
      createdAt: new Date('2026-05-13T12:01:00.000Z'),
      updatedAt: new Date('2026-05-13T12:01:00.000Z')
    });
  });

  it('loads and updates a maintenance ticket by id for status transitions', async () => {
    const findFirst = vi.fn(async ({ where }: { where: Record<string, unknown> }) => ({
      id: 'mt-1',
      tenantId: where.tenantId,
      assetId: 'asset-1',
      category: 'corrective',
      priority: 'P2',
      description: 'Investigate starboard pump oscillation',
      origin: 'asset_field_team',
      openedBy: 'field-1',
      openedAt: new Date('2026-05-13T12:00:00.000Z'),
      status: 'pending',
      freezeCount: 0,
      createdAt: new Date('2026-05-13T12:01:00.000Z'),
      updatedAt: new Date('2026-05-13T12:01:00.000Z')
    }));
    const update = vi.fn(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => ({
      id: where.id,
      tenantId: 'tenant-a',
      ...data,
      createdAt: new Date('2026-05-13T12:01:00.000Z'),
      updatedAt: new Date('2026-05-13T12:05:00.000Z')
    }));

    const repository = new PrismaMaintenanceTicketRepository({
      maintenanceTicket: {
        create: vi.fn(),
        findFirst,
        findMany: vi.fn(),
        update
      },
      maintenanceStatusTransition: {
        create: vi.fn()
      },
      $transaction: vi.fn()
    } as never);

    const found = await repository.findById('tenant-a', 'mt-1');
    const updated = await repository.update('tenant-a', 'mt-1', {
      assetId: 'asset-1',
      category: 'corrective',
      priority: 'P2',
      description: 'Investigate starboard pump oscillation',
      origin: 'asset_field_team',
      openedBy: 'field-1',
      openedAt: new Date('2026-05-13T12:00:00.000Z'),
      status: 'in_progress',
      kanbanSubstatus: 'onsite_diagnosis',
      currentSubstep: 'diagnostico_presencial',
      freezeCount: 0
    });

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: 'mt-1',
        tenantId: 'tenant-a'
      }
    });
    expect(update).toHaveBeenCalledWith({
      where: {
        id: 'mt-1'
      },
      data: {
        assetId: 'asset-1',
        category: 'corrective',
        priority: 'P2',
        description: 'Investigate starboard pump oscillation',
        origin: 'asset_field_team',
        openedBy: 'field-1',
        openedAt: new Date('2026-05-13T12:00:00.000Z'),
        status: 'in_progress',
        kanbanSubstatus: 'onsite_diagnosis',
        currentSubstep: 'diagnostico_presencial',
        freezeCount: 0,
        frozenReason: undefined
      }
    });
    expect(found?.status).toBe('pending');
    expect(updated).toEqual({
      id: 'mt-1',
      tenantId: 'tenant-a',
      assetId: 'asset-1',
      category: 'corrective',
      priority: 'P2',
      description: 'Investigate starboard pump oscillation',
      origin: 'asset_field_team',
      openedBy: 'field-1',
      openedAt: new Date('2026-05-13T12:00:00.000Z'),
      status: 'in_progress',
      kanbanSubstatus: 'onsite_diagnosis',
      currentSubstep: 'diagnostico_presencial',
      freezeCount: 0,
      createdAt: new Date('2026-05-13T12:01:00.000Z'),
      updatedAt: new Date('2026-05-13T12:05:00.000Z')
    });
  });

  it('lists tenant-scoped maintenance tickets ordered by openedAt descending', async () => {
    const findMany = vi.fn(async () => [
      {
        id: 'mt-2',
        tenantId: 'tenant-a',
        assetId: 'asset-2',
        category: 'inspection',
        priority: 'P1',
        description: 'Critical inspection',
        origin: 'central_operations',
        openedBy: 'central-1',
        openedAt: new Date('2026-05-14T08:00:00.000Z'),
        status: 'pending',
        freezeCount: 0,
        frozenReason: null,
        createdAt: new Date('2026-05-14T08:01:00.000Z'),
        updatedAt: new Date('2026-05-14T08:01:00.000Z')
      }
    ]);

    const repository = new PrismaMaintenanceTicketRepository({
      maintenanceTicket: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany,
        update: vi.fn()
      },
      maintenanceStatusTransition: {
        create: vi.fn()
      },
      $transaction: vi.fn()
    } as never);

    const listed = await (repository as PrismaMaintenanceTicketRepository & {
      listByTenant: (tenantId: string) => Promise<unknown>;
    }).listByTenant('tenant-a');

    expect(findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-a'
      },
      orderBy: {
        openedAt: 'desc'
      }
    });
    expect(listed).toEqual([
      {
        id: 'mt-2',
        tenantId: 'tenant-a',
        assetId: 'asset-2',
        category: 'inspection',
        priority: 'P1',
        description: 'Critical inspection',
        origin: 'central_operations',
        openedBy: 'central-1',
        openedAt: new Date('2026-05-14T08:00:00.000Z'),
        status: 'pending',
        freezeCount: 0,
        frozenReason: null,
        createdAt: new Date('2026-05-14T08:01:00.000Z'),
        updatedAt: new Date('2026-05-14T08:01:00.000Z')
      }
    ]);
  });

  it('persists the ticket update and transition history in a single transaction', async () => {
    const update = vi.fn(
      async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => ({
        id: where.id,
        tenantId: 'tenant-a',
        ...data,
        createdAt: new Date('2026-05-13T12:01:00.000Z'),
        updatedAt: new Date('2026-05-13T12:05:00.000Z')
      })
    );
    const createTransition = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'transition-1',
      ...data,
      createdAt: new Date('2026-05-13T12:05:00.000Z')
    }));
    const $transaction = vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        maintenanceTicket: {
          update
        },
        maintenanceStatusTransition: {
          create: createTransition
        }
      })
    );

    const repository = new PrismaMaintenanceTicketRepository({
      maintenanceTicket: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update
      },
      maintenanceStatusTransition: {
        create: createTransition
      },
      $transaction
    } as never);

    const at = new Date('2026-05-13T12:05:00.000Z');
    const updated = await repository.updateStatusWithTransitionHistory(
      'tenant-a',
      'mt-1',
      {
        assetId: 'asset-1',
        category: 'corrective',
        priority: 'P2',
        description: 'Investigate starboard pump oscillation',
        origin: 'asset_field_team',
        openedBy: 'field-1',
        openedAt: new Date('2026-05-13T12:00:00.000Z'),
        status: 'in_progress',
        kanbanSubstatus: 'ticket_qualification',
        currentSubstep: undefined,
        freezeCount: 0
      },
      {
        fromStatus: 'pending',
        transitionedBy: 'field-1',
        at
      }
    );

    expect($transaction).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({
      where: {
        id: 'mt-1'
      },
      data: {
        assetId: 'asset-1',
        title: undefined,
        category: 'corrective',
        priority: 'P2',
        urgency: undefined,
        description: 'Investigate starboard pump oscillation',
        notes: undefined,
        legacyTicketCode: undefined,
        legacyMetadata: undefined,
        origin: 'asset_field_team',
        openedBy: 'field-1',
        openedAt: new Date('2026-05-13T12:00:00.000Z'),
        status: 'in_progress',
        kanbanSubstatus: 'ticket_qualification',
        currentSubstep: undefined,
        freezeCount: 0,
        frozenReason: undefined
      }
    });
    expect(createTransition).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-a',
        maintenanceTicketId: 'mt-1',
        fromStatus: 'pending',
        toStatus: 'in_progress',
        transitionedBy: 'field-1',
        at
      }
    });
    expect(updated).toEqual({
      id: 'mt-1',
      tenantId: 'tenant-a',
      assetId: 'asset-1',
      category: 'corrective',
      priority: 'P2',
      description: 'Investigate starboard pump oscillation',
      origin: 'asset_field_team',
      openedBy: 'field-1',
      openedAt: new Date('2026-05-13T12:00:00.000Z'),
      status: 'in_progress',
      kanbanSubstatus: 'ticket_qualification',
      currentSubstep: undefined,
      freezeCount: 0,
      createdAt: new Date('2026-05-13T12:01:00.000Z'),
      updatedAt: new Date('2026-05-13T12:05:00.000Z')
    });
  });
});
