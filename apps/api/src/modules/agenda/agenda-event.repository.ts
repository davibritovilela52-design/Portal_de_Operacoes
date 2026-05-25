import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../persistence/prisma.service.js';
import { AgendaEvent } from './agenda-scheduling.service.js';

export type PersistedAgendaEvent = AgendaEvent & {
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type AgendaEventWriter = {
  create(tenantId: string, event: AgendaEvent): Promise<unknown>;
  delete(tenantId: string, eventId: string): Promise<boolean>;
  findById(tenantId: string, eventId: string): Promise<PersistedAgendaEvent | null>;
  listByTenant(tenantId: string): Promise<PersistedAgendaEvent[]>;
  search(
    tenantId: string,
    filters?: {
      assetIds?: string[];
      types?: AgendaEvent['type'][];
      startsAt?: Date;
      endsAt?: Date;
    }
  ): Promise<PersistedAgendaEvent[]>;
  listByAssetWindow(
    tenantId: string,
    assetId: string,
    startsAt: Date,
    endsAt: Date
  ): Promise<PersistedAgendaEvent[]>;
  update(tenantId: string, eventId: string, event: AgendaEvent): Promise<PersistedAgendaEvent>;
};

@Injectable()
export class PrismaAgendaEventRepository implements AgendaEventWriter {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: {
      agendaEvent: {
        create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>>;
        deleteMany(args: { where: Record<string, unknown> }): Promise<{ count: number }>;
        findFirst(args: { where: Record<string, unknown> }): Promise<Record<string, unknown> | null>;
        findMany(args: {
          where: Record<string, unknown>;
          orderBy: Record<string, unknown>;
        }): Promise<Record<string, unknown>[]>;
        update(args: {
          where: Record<string, unknown>;
          data: Record<string, unknown>;
        }): Promise<Record<string, unknown>>;
      };
    }
  ) {}

  async create(tenantId: string, event: AgendaEvent): Promise<PersistedAgendaEvent> {
    const created = await this.prisma.agendaEvent.create({
      data: {
        id: event.id,
        tenantId,
        assetId: event.assetId,
        type: event.type,
        title: event.title,
        description: event.description,
        legacyMetadata: event.legacyMetadata,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        safeMinimumBreached: event.safeMinimumBreached ?? false,
        provisional: event.provisional ?? false,
        validatedAt: event.validatedAt
      }
    });

    return created as PersistedAgendaEvent;
  }

  async delete(tenantId: string, eventId: string): Promise<boolean> {
    const result = await this.prisma.agendaEvent.deleteMany({
      where: {
        id: eventId,
        tenantId
      }
    });

    return result.count > 0;
  }

  async findById(tenantId: string, eventId: string): Promise<PersistedAgendaEvent | null> {
    const found = await this.prisma.agendaEvent.findFirst({
      where: {
        id: eventId,
        tenantId
      }
    });

    return (found as PersistedAgendaEvent | null) ?? null;
  }

  async listByTenant(tenantId: string): Promise<PersistedAgendaEvent[]> {
    return this.search(tenantId);
  }

  async search(
    tenantId: string,
    filters?: {
      assetIds?: string[];
      types?: AgendaEvent['type'][];
      startsAt?: Date;
      endsAt?: Date;
    }
  ): Promise<PersistedAgendaEvent[]> {
    if (filters?.assetIds && filters.assetIds.length === 0) {
      return [];
    }

    const where: Record<string, unknown> = {
      tenantId
    };

    if (filters?.assetIds?.length) {
      where.assetId = {
        in: filters.assetIds
      };
    }

    if (filters?.types?.length) {
      where.type = {
        in: filters.types
      };
    }

    if (filters?.startsAt) {
      where.endsAt = {
        gt: filters.startsAt
      };
    }

    if (filters?.endsAt) {
      where.startsAt = {
        lt: filters.endsAt
      };
    }

    const found = await this.prisma.agendaEvent.findMany({
      where,
      orderBy: {
        startsAt: 'asc'
      }
    });

    return found as PersistedAgendaEvent[];
  }

  async listByAssetWindow(
    tenantId: string,
    assetId: string,
    startsAt: Date,
    endsAt: Date
  ): Promise<PersistedAgendaEvent[]> {
    const found = await this.prisma.agendaEvent.findMany({
      where: {
        tenantId,
        assetId,
        startsAt: {
          lt: endsAt
        },
        endsAt: {
          gt: startsAt
        }
      },
      orderBy: {
        startsAt: 'asc'
      }
    });

    return found as PersistedAgendaEvent[];
  }

  async update(
    _tenantId: string,
    eventId: string,
    event: AgendaEvent
  ): Promise<PersistedAgendaEvent> {
    const updated = await this.prisma.agendaEvent.update({
      where: {
        id: eventId
      },
      data: {
        assetId: event.assetId,
        type: event.type,
        title: event.title,
        description: event.description,
        legacyMetadata: event.legacyMetadata,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        safeMinimumBreached: event.safeMinimumBreached ?? false,
        provisional: event.provisional ?? false,
        validatedAt: event.validatedAt
      }
    });

    return updated as PersistedAgendaEvent;
  }
}
