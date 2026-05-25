import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../persistence/prisma.service.js';

export type PersistedMaintenanceCost = {
  id: string;
  tenantId: string;
  maintenanceTicketId: string;
  supplierId?: string | null;
  description: string;
  amount: number;
  currency: string;
  invoiceNumber?: string | null;
  invoiceDate?: Date | null;
  registeredBy: string;
  registeredAt: Date;
  createdAt: Date;
};

export type MaintenanceCostReader = {
  listByTicketIds(tenantId: string, ticketIds: string[]): Promise<PersistedMaintenanceCost[]>;
};

@Injectable()
export class PrismaMaintenanceCostRepository implements MaintenanceCostReader {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: {
      maintenanceCost: {
        findMany(args: {
          where: Record<string, unknown>;
          orderBy: Record<string, unknown>;
        }): Promise<Record<string, unknown>[]>;
      };
    }
  ) {}

  async listByTicketIds(
    tenantId: string,
    ticketIds: string[]
  ): Promise<PersistedMaintenanceCost[]> {
    if (ticketIds.length === 0) {
      return [];
    }

    const found = await this.prisma.maintenanceCost.findMany({
      where: {
        tenantId,
        maintenanceTicketId: {
          in: ticketIds
        }
      },
      orderBy: {
        registeredAt: 'desc'
      }
    });

    return found.map((cost) => ({
      id: String(cost.id),
      tenantId: String(cost.tenantId),
      maintenanceTicketId: String(cost.maintenanceTicketId),
      supplierId: typeof cost.supplierId === 'string' ? cost.supplierId : null,
      description: String(cost.description),
      amount: Number(String(cost.amount)),
      currency: String(cost.currency),
      invoiceNumber: typeof cost.invoiceNumber === 'string' ? cost.invoiceNumber : null,
      invoiceDate: cost.invoiceDate instanceof Date ? cost.invoiceDate : null,
      registeredBy: String(cost.registeredBy),
      registeredAt:
        cost.registeredAt instanceof Date ? cost.registeredAt : new Date(String(cost.registeredAt)),
      createdAt: cost.createdAt instanceof Date ? cost.createdAt : new Date(String(cost.createdAt))
    }));
  }
}
