import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../persistence/prisma.service.js';
import { AviationReport } from './aviation-workflow.service.js';

export type PersistedAviationReport = AviationReport & {
  id: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type AviationStatusTransitionWrite = {
  fromStatus?: AviationReport['status'];
  transitionedBy: string;
  at: Date;
};

export type AviationReportWriter = {
  create(tenantId: string, report: AviationReport): Promise<unknown>;
  findById(tenantId: string, reportId: string): Promise<PersistedAviationReport | null>;
  listByTenant(tenantId: string): Promise<PersistedAviationReport[]>;
  search(
    tenantId: string,
    filters?: {
      assetIds?: string[];
      statuses?: AviationReport['status'][];
      priorities?: AviationReport['priority'][];
      categories?: AviationReport['category'][];
    }
  ): Promise<PersistedAviationReport[]>;
  update(
    tenantId: string,
    reportId: string,
    report: AviationReport
  ): Promise<PersistedAviationReport>;
  updateStatusWithTransitionHistory(
    tenantId: string,
    reportId: string,
    report: AviationReport,
    transition: AviationStatusTransitionWrite
  ): Promise<PersistedAviationReport>;
};

type PrismaAviationReportDelegate = {
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

type PrismaAviationStatusTransitionDelegate = {
  create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>>;
};

type PrismaAviationReportTransactionClient = {
  aviationReport: PrismaAviationReportDelegate;
  aviationStatusTransition: PrismaAviationStatusTransitionDelegate;
};

type PrismaAviationReportClient = PrismaAviationReportTransactionClient & {
  $transaction<T>(callback: (tx: PrismaAviationReportTransactionClient) => Promise<T>): Promise<T>;
};

@Injectable()
export class PrismaAviationReportRepository implements AviationReportWriter {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaAviationReportClient
  ) {}

  async create(tenantId: string, report: AviationReport): Promise<PersistedAviationReport> {
    const created = await this.prisma.aviationReport.create({
      data: {
        tenantId,
        ...this.buildReportData(report)
      }
    });

    return created as PersistedAviationReport;
  }

  async findById(
    tenantId: string,
    reportId: string
  ): Promise<PersistedAviationReport | null> {
    const found = await this.prisma.aviationReport.findFirst({
      where: {
        id: reportId,
        tenantId
      }
    });

    return (found as PersistedAviationReport | null) ?? null;
  }

  async listByTenant(tenantId: string): Promise<PersistedAviationReport[]> {
    return this.search(tenantId);
  }

  async search(
    tenantId: string,
    filters?: {
      assetIds?: AviationReport['assetId'][];
      statuses?: AviationReport['status'][];
      priorities?: AviationReport['priority'][];
      categories?: AviationReport['category'][];
    }
  ): Promise<PersistedAviationReport[]> {
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

    const found = await this.prisma.aviationReport.findMany({
      where,
      orderBy: {
        openedAt: 'desc'
      }
    });

    return found as PersistedAviationReport[];
  }

  async update(
    _tenantId: string,
    reportId: string,
    report: AviationReport
  ): Promise<PersistedAviationReport> {
    const updated = await this.prisma.aviationReport.update({
      where: {
        id: reportId
      },
      data: this.buildReportData(report)
    });

    return updated as PersistedAviationReport;
  }

  async updateStatusWithTransitionHistory(
    tenantId: string,
    reportId: string,
    report: AviationReport,
    transition: AviationStatusTransitionWrite
  ): Promise<PersistedAviationReport> {
    return (await this.prisma.$transaction(async (tx) => {
      const updated = await tx.aviationReport.update({
        where: {
          id: reportId
        },
        data: this.buildReportData(report)
      });

      await tx.aviationStatusTransition.create({
        data: {
          tenantId,
          aviationReportId: reportId,
          fromStatus: transition.fromStatus,
          toStatus: report.status,
          transitionedBy: transition.transitionedBy,
          at: transition.at
        }
      });

      return updated as PersistedAviationReport;
    })) as PersistedAviationReport;
  }

  private buildReportData(report: AviationReport): Record<string, unknown> {
    return {
      assetId: report.assetId,
      title: report.title,
      category: report.category,
      priority: report.priority,
      description: report.description,
      notes: report.notes,
      aircraftSystem: report.aircraftSystem,
      origin: report.origin,
      openedBy: report.openedBy,
      openedAt: report.openedAt,
      status: report.status,
      kanbanSubstatus: report.kanbanSubstatus,
      groundCount: report.groundCount,
      groundReason: report.groundReason,
      returnToServiceEta: report.returnToServiceEta ?? null
    };
  }
}
