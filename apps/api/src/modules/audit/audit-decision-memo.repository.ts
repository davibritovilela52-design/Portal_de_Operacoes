import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../persistence/prisma.service.js';
import { AuditDecisionMemo } from './audit-governance.service.js';

export type PersistedAuditDecisionMemo = AuditDecisionMemo & {
  id: string;
  tenantId: string;
  action: string;
  aggregateType: string;
  aggregateId: string;
  assetId?: string;
  createdAt: Date;
};

export type AuditDecisionMemoWriter = {
  listByTenant(tenantId: string): Promise<PersistedAuditDecisionMemo[]>;
  create(
    tenantId: string,
    action: string,
    aggregateType: string,
    aggregateId: string,
    assetId: string | undefined,
    memo: AuditDecisionMemo
  ): Promise<PersistedAuditDecisionMemo>;
};

@Injectable()
export class PrismaAuditDecisionMemoRepository implements AuditDecisionMemoWriter {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: {
      auditDecisionMemo: {
        create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>>;
        findMany(args: {
          where: { tenantId: string };
          orderBy: { createdAt: 'asc' | 'desc' };
        }): Promise<Record<string, unknown>[]>;
      };
    }
  ) {}

  async listByTenant(tenantId: string): Promise<PersistedAuditDecisionMemo[]> {
    const entries = await this.prisma.auditDecisionMemo.findMany({
      where: {
        tenantId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return entries as PersistedAuditDecisionMemo[];
  }

  async create(
    tenantId: string,
    action: string,
    aggregateType: string,
    aggregateId: string,
    assetId: string | undefined,
    memo: AuditDecisionMemo
  ): Promise<PersistedAuditDecisionMemo> {
    const created = await this.prisma.auditDecisionMemo.create({
      data: {
        tenantId,
        action,
        aggregateType,
        aggregateId,
        assetId,
        context: memo.context,
        decision: memo.decision,
        decidedBy: memo.decidedBy,
        alternativesConsidered: memo.alternativesConsidered,
        expectedImpact: memo.expectedImpact,
        status: memo.status
      }
    });

    return created as PersistedAuditDecisionMemo;
  }
}
