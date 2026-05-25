import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../persistence/prisma.service.js';
import { Rectification } from './audit-governance.service.js';

export type PersistedAuditRectification = Rectification & {
  id: string;
  tenantId: string;
  createdAt: Date;
};

export type AuditRectificationWriter = {
  listByTenant(tenantId: string): Promise<PersistedAuditRectification[]>;
  create(tenantId: string, rectification: Rectification): Promise<unknown>;
};

@Injectable()
export class PrismaAuditRectificationRepository implements AuditRectificationWriter {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: {
      auditRectification: {
        create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>>;
        findMany(args: {
          where: { tenantId: string };
          orderBy: { createdAt: 'asc' | 'desc' };
        }): Promise<Record<string, unknown>[]>;
      };
    }
  ) {}

  async listByTenant(tenantId: string): Promise<PersistedAuditRectification[]> {
    const entries = await this.prisma.auditRectification.findMany({
      where: {
        tenantId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return entries as PersistedAuditRectification[];
  }

  async create(
    tenantId: string,
    rectification: Rectification
  ): Promise<PersistedAuditRectification> {
    const created = await this.prisma.auditRectification.create({
      data: {
        tenantId,
        recordId: rectification.recordId,
        sourceVersion: rectification.sourceVersion,
        targetVersion: rectification.targetVersion,
        changedBy: rectification.changedBy,
        reason: rectification.reason,
        afterSnapshot: rectification.afterSnapshot
      }
    });

    return created as PersistedAuditRectification;
  }
}
