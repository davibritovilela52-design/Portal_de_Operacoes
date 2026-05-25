import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../persistence/prisma.service.js';
import { MaintenanceTicket } from './maintenance-workflow.service.js';

export type PersistedMaintenanceTicket = MaintenanceTicket & {
  id: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type MaintenanceStatusTransitionWrite = {
  fromStatus?: MaintenanceTicket['status'];
  transitionedBy: string;
  at: Date;
};

export type MaintenanceTicketWriter = {
  create(tenantId: string, ticket: MaintenanceTicket): Promise<unknown>;
  findById(tenantId: string, ticketId: string): Promise<PersistedMaintenanceTicket | null>;
  listByTenant(tenantId: string): Promise<PersistedMaintenanceTicket[]>;
  search(
    tenantId: string,
    filters?: {
      assetIds?: string[];
      statuses?: MaintenanceTicket['status'][];
      priorities?: MaintenanceTicket['priority'][];
      categories?: MaintenanceTicket['category'][];
    }
  ): Promise<PersistedMaintenanceTicket[]>;
  update(
    tenantId: string,
    ticketId: string,
    ticket: MaintenanceTicket
  ): Promise<PersistedMaintenanceTicket>;
  updateStatusWithTransitionHistory(
    tenantId: string,
    ticketId: string,
    ticket: MaintenanceTicket,
    transition: MaintenanceStatusTransitionWrite
  ): Promise<PersistedMaintenanceTicket>;
};

type PrismaMaintenanceTicketDelegate = {
  create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>>;
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

type PrismaMaintenanceStatusTransitionDelegate = {
  create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>>;
};

type PrismaMaintenanceTicketTransactionClient = {
  maintenanceTicket: PrismaMaintenanceTicketDelegate;
  maintenanceStatusTransition: PrismaMaintenanceStatusTransitionDelegate;
};

type PrismaMaintenanceTicketClient = PrismaMaintenanceTicketTransactionClient & {
  $transaction<T>(
    callback: (tx: PrismaMaintenanceTicketTransactionClient) => Promise<T>
  ): Promise<T>;
};

@Injectable()
export class PrismaMaintenanceTicketRepository implements MaintenanceTicketWriter {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaMaintenanceTicketClient
  ) {}

  async create(tenantId: string, ticket: MaintenanceTicket): Promise<PersistedMaintenanceTicket> {
    const created = await this.prisma.maintenanceTicket.create({
      data: {
        tenantId,
        ...this.buildTicketData(ticket)
      }
    });

    return created as PersistedMaintenanceTicket;
  }

  async findById(
    tenantId: string,
    ticketId: string
  ): Promise<PersistedMaintenanceTicket | null> {
    const found = await this.prisma.maintenanceTicket.findFirst({
      where: {
        id: ticketId,
        tenantId
      }
    });

    return (found as PersistedMaintenanceTicket | null) ?? null;
  }

  async listByTenant(tenantId: string): Promise<PersistedMaintenanceTicket[]> {
    return this.search(tenantId);
  }

  async search(
    tenantId: string,
    filters?: {
      assetIds?: MaintenanceTicket['assetId'][];
      statuses?: MaintenanceTicket['status'][];
      priorities?: MaintenanceTicket['priority'][];
      categories?: MaintenanceTicket['category'][];
    }
  ): Promise<PersistedMaintenanceTicket[]> {
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

    if (filters?.statuses?.length) {
      where.status = {
        in: filters.statuses
      };
    }

    if (filters?.priorities?.length) {
      where.priority = {
        in: filters.priorities
      };
    }

    if (filters?.categories?.length) {
      where.category = {
        in: filters.categories
      };
    }

    const found = await this.prisma.maintenanceTicket.findMany({
      where,
      orderBy: {
        openedAt: 'desc'
      }
    });

    return found as PersistedMaintenanceTicket[];
  }

  async update(
    _tenantId: string,
    ticketId: string,
    ticket: MaintenanceTicket
  ): Promise<PersistedMaintenanceTicket> {
    const updated = await this.prisma.maintenanceTicket.update({
      where: {
        id: ticketId
      },
      data: this.buildTicketData(ticket)
    });

    return updated as PersistedMaintenanceTicket;
  }

  async updateStatusWithTransitionHistory(
    tenantId: string,
    ticketId: string,
    ticket: MaintenanceTicket,
    transition: MaintenanceStatusTransitionWrite
  ): Promise<PersistedMaintenanceTicket> {
    return (await this.prisma.$transaction(async (tx) => {
      const updated = await tx.maintenanceTicket.update({
        where: {
          id: ticketId
        },
        data: this.buildTicketData(ticket)
      });

      await tx.maintenanceStatusTransition.create({
        data: {
          tenantId,
          maintenanceTicketId: ticketId,
          fromStatus: transition.fromStatus,
          toStatus: ticket.status,
          transitionedBy: transition.transitionedBy,
          at: transition.at
        }
      });

      return updated as PersistedMaintenanceTicket;
    })) as PersistedMaintenanceTicket;
  }

  private buildTicketData(ticket: MaintenanceTicket): Record<string, unknown> {
    return {
      assetId: ticket.assetId,
      title: ticket.title,
      category: ticket.category,
      priority: ticket.priority,
      urgency: ticket.urgency,
      description: ticket.description,
      notes: ticket.notes,
      legacyTicketCode: ticket.legacyTicketCode,
      legacyMetadata: ticket.legacyMetadata,
      origin: ticket.origin,
      openedBy: ticket.openedBy,
      openedAt: ticket.openedAt,
      status: ticket.status,
      kanbanSubstatus: ticket.kanbanSubstatus,
      currentSubstep: ticket.currentSubstep,
      freezeCount: ticket.freezeCount,
      frozenReason: ticket.frozenReason
    };
  }
}
