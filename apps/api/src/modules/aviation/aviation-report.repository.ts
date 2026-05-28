import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../persistence/prisma.service.js';
import type { AviationReport } from './aviation-workflow.service.js';

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

export type AviationStatusTransitionRecord = {
  id: string;
  tenantId: string;
  aviationReportId: string;
  fromStatus?: AviationReport['status'];
  toStatus: AviationReport['status'];
  transitionedBy: string;
  at: Date;
  createdAt: Date;
};

export type AviationStatsResult = {
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  totalAogEvents: number;
  activeAogCount: number;
  totalReports: number;
};

export type AviationReportWriter = {
  create(tenantId: string, report: AviationReport): Promise<PersistedAviationReport>;
  findById(tenantId: string, reportId: string): Promise<PersistedAviationReport | null>;
  search(
    tenantId: string,
    filters?: {
      assetIds?: string[];
      statuses?: AviationReport['status'][];
      priorities?: AviationReport['priority'][];
      categories?: AviationReport['category'][];
    }
  ): Promise<PersistedAviationReport[]>;
  update(tenantId: string, reportId: string, report: AviationReport): Promise<PersistedAviationReport>;
  updateStatusWithTransitionHistory(
    tenantId: string,
    reportId: string,
    report: AviationReport,
    transition: AviationStatusTransitionWrite
  ): Promise<PersistedAviationReport>;
  getStats(tenantId: string): Promise<AviationStatsResult>;
  listTransitions(tenantId: string, reportId: string): Promise<AviationStatusTransitionRecord[]>;
};

type PrismaAviationReportDelegate = {
  create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>>;
  findFirst(args: { where: Record<string, unknown> }): Promise<Record<string, unknown> | null>;
  findMany(args: { where: Record<string, unknown>; orderBy: Record<string, unknown> }): Promise<Record<string, unknown>[]>;
  update(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<Record<string, unknown>>;
  groupBy(args: { by: string[]; where: Record<string, unknown>; _count: Record<string, unknown> }): Promise<Array<Record<string, unknown>>>;
  aggregate(args: { where: Record<string, unknown>; _sum?: Record<string, unknown>; _count?: Record<string, unknown> }): Promise<Record<string, unknown>>;
};

type PrismaAviationStatusTransitionDelegate = {
  create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>>;
  findMany(args: { where: Record<string, unknown>; orderBy: Record<string, unknown> }): Promise<Record<string, unknown>[]>;
};

type PrismaAviationClient = {
  aviationReport: PrismaAviationReportDelegate;
  aviationStatusTransition: PrismaAviationStatusTransitionDelegate;
  $transaction<T>(
    callback: (tx: {
      aviationReport: PrismaAviationReportDelegate;
      aviationStatusTransition: PrismaAviationStatusTransitionDelegate;
    }) => Promise<T>
  ): Promise<T>;
};

@Injectable()
export class PrismaAviationReportRepository implements AviationReportWriter {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaAviationClient
  ) {}

  async create(tenantId: string, report: AviationReport): Promise<PersistedAviationReport> {
    const created = await this.prisma.aviationReport.create({
      data: { tenantId, ...this.buildReportData(report) }
    });
    return created as PersistedAviationReport;
  }

  async findById(tenantId: string, reportId: string): Promise<PersistedAviationReport | null> {
    const found = await this.prisma.aviationReport.findFirst({
      where: { id: reportId, tenantId }
    });
    return (found as PersistedAviationReport | null) ?? null;
  }

  async search(
    tenantId: string,
    filters?: {
      assetIds?: string[];
      statuses?: AviationReport['status'][];
      priorities?: AviationReport['priority'][];
      categories?: AviationReport['category'][];
    }
  ): Promise<PersistedAviationReport[]> {
    if (filters?.assetIds && filters.assetIds.length === 0) return [];

    const where: Record<string, unknown> = { tenantId };
    if (filters?.assetIds?.length) where.assetId = { in: filters.assetIds };
    if (filters?.statuses?.length) where.status = { in: filters.statuses };
    if (filters?.priorities?.length) where.priority = { in: filters.priorities };
    if (filters?.categories?.length) where.category = { in: filters.categories };

    const found = await this.prisma.aviationReport.findMany({
      where,
      orderBy: { openedAt: 'desc' }
    });
    return found as PersistedAviationReport[];
  }

  async update(
    _tenantId: string,
    reportId: string,
    report: AviationReport
  ): Promise<PersistedAviationReport> {
    const updated = await this.prisma.aviationReport.update({
      where: { id: reportId },
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
        where: { id: reportId },
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

  async getStats(tenantId: string): Promise<AviationStatsResult> {
    const [statusGroups, priorityGroups, aogAggregate, activeAog] = await Promise.all([
      this.prisma.aviationReport.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { id: true }
      }),
      this.prisma.aviationReport.groupBy({
        by: ['priority'],
        where: { tenantId },
        _count: { id: true }
      }),
      this.prisma.aviationReport.aggregate({
        where: { tenantId },
        _sum: { groundCount: true },
        _count: { id: true }
      }),
      this.prisma.aviationReport.findMany({
        where: { tenantId, status: 'grounded' },
        orderBy: { openedAt: 'desc' }
      })
    ]);

    const typedStatusGroups = statusGroups as Array<{ status: unknown; _count: { id: number } }>;
    const typedPriorityGroups = priorityGroups as Array<{ priority: unknown; _count: { id: number } }>;
    const typedAogAggregate = aogAggregate as {
      _sum: { groundCount: number | null };
      _count: { id: number };
    };

    const byStatus: Record<string, number> = {
      pending: 0,
      in_progress: 0,
      grounded: 0,
      return_check: 0,
      returned: 0,
      cancelled: 0,
      reopened: 0
    };
    for (const group of typedStatusGroups) {
      byStatus[String(group.status)] = group._count.id;
    }

    const byPriority: Record<string, number> = { P1: 0, P2: 0, P3: 0, P4: 0 };
    for (const group of typedPriorityGroups) {
      byPriority[String(group.priority)] = group._count.id;
    }

    return {
      byStatus,
      byPriority,
      totalAogEvents: typedAogAggregate._sum.groundCount ?? 0,
      activeAogCount: activeAog.length,
      totalReports: typedAogAggregate._count.id
    };
  }

  async listTransitions(tenantId: string, reportId: string): Promise<AviationStatusTransitionRecord[]> {
    const found = await this.prisma.aviationStatusTransition.findMany({
      where: { tenantId, aviationReportId: reportId },
      orderBy: { at: 'asc' }
    });
    return found as AviationStatusTransitionRecord[];
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
      groundReason: report.groundReason
    };
  }
}
