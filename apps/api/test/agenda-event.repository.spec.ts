import { describe, expect, it, vi } from 'vitest';

import { PrismaAgendaEventRepository } from '../src/modules/agenda/agenda-event.repository.js';

describe('PrismaAgendaEventRepository', () => {
  it('maps an agenda event into the Prisma create payload with tenant scope', async () => {
    const create = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
      ...data,
      createdAt: new Date('2026-05-13T14:01:00.000Z'),
      updatedAt: new Date('2026-05-13T14:01:00.000Z')
    }));

    const repository = new PrismaAgendaEventRepository({
      agendaEvent: {
        create,
        deleteMany: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn()
      }
    });

    const event = {
      id: 'event-1',
      assetId: 'asset-1',
      type: 'utilization' as const,
      startsAt: new Date('2026-05-13T14:00:00.000Z'),
      endsAt: new Date('2026-05-13T16:00:00.000Z')
    };

    const result = await repository.create('tenant-a', event);

    expect(create).toHaveBeenCalledWith({
      data: {
        id: 'event-1',
        tenantId: 'tenant-a',
        assetId: 'asset-1',
        type: 'utilization',
        startsAt: new Date('2026-05-13T14:00:00.000Z'),
        endsAt: new Date('2026-05-13T16:00:00.000Z'),
        safeMinimumBreached: false,
        provisional: false,
        validatedAt: undefined
      }
    });
    expect(result).toEqual({
      id: 'event-1',
      tenantId: 'tenant-a',
      assetId: 'asset-1',
      type: 'utilization',
      startsAt: new Date('2026-05-13T14:00:00.000Z'),
      endsAt: new Date('2026-05-13T16:00:00.000Z'),
      safeMinimumBreached: false,
      provisional: false,
      createdAt: new Date('2026-05-13T14:01:00.000Z'),
      updatedAt: new Date('2026-05-13T14:01:00.000Z')
    });
  });

  it('lists overlapping agenda events for an asset window and updates an existing event', async () => {
    const findMany = vi.fn(async () => [
      {
        id: 'event-1',
        tenantId: 'tenant-a',
        assetId: 'asset-1',
        type: 'utilization',
        startsAt: new Date('2026-05-13T14:00:00.000Z'),
        endsAt: new Date('2026-05-13T16:00:00.000Z'),
        safeMinimumBreached: false,
        provisional: false,
        validatedAt: null,
        createdAt: new Date('2026-05-13T14:01:00.000Z'),
        updatedAt: new Date('2026-05-13T14:01:00.000Z')
      }
    ]);
    const update = vi.fn(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => ({
      id: where.id,
      tenantId: 'tenant-a',
      ...data,
      createdAt: new Date('2026-05-13T14:01:00.000Z'),
      updatedAt: new Date('2026-05-13T15:00:00.000Z')
    }));

    const repository = new PrismaAgendaEventRepository({
      agendaEvent: {
        create: vi.fn(),
        deleteMany: vi.fn(),
        findFirst: vi.fn(),
        findMany,
        update
      }
    });

    const found = await repository.listByAssetWindow(
      'tenant-a',
      'asset-1',
      new Date('2026-05-13T13:30:00.000Z'),
      new Date('2026-05-13T15:30:00.000Z')
    );
    const updated = await repository.update('tenant-a', 'event-1', {
      id: 'event-1',
      assetId: 'asset-1',
      type: 'utilization',
      startsAt: new Date('2026-05-13T16:00:00.000Z'),
      endsAt: new Date('2026-05-13T18:00:00.000Z')
    });

    expect(findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-a',
        assetId: 'asset-1',
        startsAt: {
          lt: new Date('2026-05-13T15:30:00.000Z')
        },
        endsAt: {
          gt: new Date('2026-05-13T13:30:00.000Z')
        }
      },
      orderBy: {
        startsAt: 'asc'
      }
    });
    expect(update).toHaveBeenCalledWith({
      where: {
        id: 'event-1'
      },
      data: {
        assetId: 'asset-1',
        type: 'utilization',
        startsAt: new Date('2026-05-13T16:00:00.000Z'),
        endsAt: new Date('2026-05-13T18:00:00.000Z'),
        safeMinimumBreached: false,
        provisional: false,
        validatedAt: undefined
      }
    });
    expect(found).toEqual([
      {
        id: 'event-1',
        tenantId: 'tenant-a',
        assetId: 'asset-1',
        type: 'utilization',
        startsAt: new Date('2026-05-13T14:00:00.000Z'),
        endsAt: new Date('2026-05-13T16:00:00.000Z'),
        safeMinimumBreached: false,
        provisional: false,
        validatedAt: null,
        createdAt: new Date('2026-05-13T14:01:00.000Z'),
        updatedAt: new Date('2026-05-13T14:01:00.000Z')
      }
    ]);
    expect(updated).toEqual({
      id: 'event-1',
      tenantId: 'tenant-a',
      assetId: 'asset-1',
      type: 'utilization',
      startsAt: new Date('2026-05-13T16:00:00.000Z'),
      endsAt: new Date('2026-05-13T18:00:00.000Z'),
      safeMinimumBreached: false,
      provisional: false,
      createdAt: new Date('2026-05-13T14:01:00.000Z'),
      updatedAt: new Date('2026-05-13T15:00:00.000Z')
    });
  });

  it('lists tenant-scoped agenda events ordered by start time', async () => {
    const findMany = vi.fn(async () => [
      {
        id: 'event-7',
        tenantId: 'tenant-a',
        assetId: 'asset-7',
        type: 'operational_block',
        startsAt: new Date('2026-05-14T09:00:00.000Z'),
        endsAt: new Date('2026-05-14T11:00:00.000Z'),
        safeMinimumBreached: false,
        provisional: true,
        validatedAt: null,
        createdAt: new Date('2026-05-14T09:00:00.000Z'),
        updatedAt: new Date('2026-05-14T09:10:00.000Z')
      }
    ]);

    const repository = new PrismaAgendaEventRepository({
      agendaEvent: {
        create: vi.fn(),
        deleteMany: vi.fn(),
        findFirst: vi.fn(),
        findMany,
        update: vi.fn()
      }
    } as never);

    const listed = await (repository as PrismaAgendaEventRepository & {
      listByTenant: (tenantId: string) => Promise<unknown>;
    }).listByTenant('tenant-a');

    expect(findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-a'
      },
      orderBy: {
        startsAt: 'asc'
      }
    });
    expect(listed).toEqual([
      {
        id: 'event-7',
        tenantId: 'tenant-a',
        assetId: 'asset-7',
        type: 'operational_block',
        startsAt: new Date('2026-05-14T09:00:00.000Z'),
        endsAt: new Date('2026-05-14T11:00:00.000Z'),
        safeMinimumBreached: false,
        provisional: true,
        validatedAt: null,
        createdAt: new Date('2026-05-14T09:00:00.000Z'),
        updatedAt: new Date('2026-05-14T09:10:00.000Z')
      }
    ]);
  });
});
