import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../persistence/prisma.service.js';
import { MaintenanceEvidence } from './maintenance-workflow.service.js';

export type PersistedMaintenanceEvidence = MaintenanceEvidence & {
  id: string;
  tenantId: string;
  ticketId: string;
  createdAt: Date;
};

export type MaintenanceEvidenceWriter = {
  create(
    tenantId: string,
    ticketId: string,
    evidence: MaintenanceEvidence
  ): Promise<PersistedMaintenanceEvidence>;
  listByTicket(tenantId: string, ticketId: string): Promise<PersistedMaintenanceEvidence[]>;
  listByTicketIds(
    tenantId: string,
    ticketIds: string[]
  ): Promise<PersistedMaintenanceEvidence[]>;
  findById(
    tenantId: string,
    ticketId: string,
    evidenceId: string
  ): Promise<PersistedMaintenanceEvidence | null>;
};

@Injectable()
export class PrismaMaintenanceEvidenceRepository implements MaintenanceEvidenceWriter {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: {
      maintenanceEvidence: {
        create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>>;
        findMany(args: {
          where: Record<string, unknown>;
          orderBy: Record<string, unknown>;
        }): Promise<Record<string, unknown>[]>;
        findFirst?: (args: {
          where: Record<string, unknown>;
        }) => Promise<Record<string, unknown> | null>;
      };
    }
  ) {}

  async create(
    tenantId: string,
    ticketId: string,
    evidence: MaintenanceEvidence
  ): Promise<PersistedMaintenanceEvidence> {
    const created = await this.prisma.maintenanceEvidence.create({
      data: {
        tenantId,
        maintenanceTicketId: ticketId,
        type: evidence.type,
        fileName: evidence.fileName,
        mimeType: evidence.mimeType,
        fileSizeBytes: evidence.fileSizeBytes,
        storageKey: evidence.storageKey,
        sha256: evidence.sha256,
        antivirusStatus: evidence.antivirusStatus,
        uploadedBy: evidence.uploadedBy,
        uploadedAt: evidence.uploadedAt
      }
    });

    return this.toPersistedEvidence(created);
  }

  async listByTicket(
    tenantId: string,
    ticketId: string
  ): Promise<PersistedMaintenanceEvidence[]> {
    return this.listByTicketIds(tenantId, [ticketId]);
  }

  async listByTicketIds(
    tenantId: string,
    ticketIds: string[]
  ): Promise<PersistedMaintenanceEvidence[]> {
    if (ticketIds.length === 0) {
      return [];
    }

    const found = await this.prisma.maintenanceEvidence.findMany({
      where: {
        tenantId,
        maintenanceTicketId: {
          in: ticketIds
        }
      },
      orderBy: {
        uploadedAt: 'asc'
      }
    });

    return found.map((record) => this.toPersistedEvidence(record));
  }

  async findById(
    tenantId: string,
    ticketId: string,
    evidenceId: string
  ): Promise<PersistedMaintenanceEvidence | null> {
    if (!this.prisma.maintenanceEvidence.findFirst) {
      return null;
    }

    const found = await this.prisma.maintenanceEvidence.findFirst({
      where: {
        id: evidenceId,
        tenantId,
        maintenanceTicketId: ticketId
      }
    });

    return found ? this.toPersistedEvidence(found) : null;
  }

  private toPersistedEvidence(record: Record<string, unknown>): PersistedMaintenanceEvidence {
    const { maintenanceTicketId, ...persisted } = record as Record<string, unknown> & {
      maintenanceTicketId: string;
    };

    return {
      ...(persisted as Omit<PersistedMaintenanceEvidence, 'ticketId'>),
      ticketId: maintenanceTicketId
    };
  }
}
