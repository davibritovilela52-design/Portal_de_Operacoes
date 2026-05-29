import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../persistence/prisma.service.js';
import type { RealEstateReport } from './real-estate-workflow.service.js';

export type PersistedRealEstateReport = RealEstateReport & {
  id: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type RealEstateStatusTransitionWrite = {
  fromStatus?: RealEstateReport['status'];
  transitionedBy: string;
  at: Date;
};

export type RealEstateStatusTransitionRecord = {
  id: string;
  tenantId: string;
  realEstateReportId: string;
  fromStatus?: RealEstateReport['status'];
  toStatus: RealEstateReport['status'];
  transitionedBy: string;
  at: Date;
  createdAt: Date;
};

export type RealEstateStatsResult = {
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  totalBlockEvents: number;
  activeBlockCount: number;
  totalReports: number;
};

export type RealEstateReportWriter = {
  create(tenantId: string, report: RealEstateReport): Promise<PersistedRealEstateReport>;
  findById(tenantId: string, reportId: string): Promise<PersistedRealEstateReport | null>;
  search(
    tenantId: string,
    filters?: {
      assetIds?: string[];
      statuses?: RealEstateReport['status'][];
      priorities?: RealEstateReport['priority'][];
      categories?: RealEstateReport['category'][];
    }
  ): Promise<PersistedRealEstateReport[]>;
  update(tenantId: string, reportId: string, report: RealEstateReport): Promise<PersistedRealEstateReport>;
  updateStatusWithTransitionHistory(
    tenantId: string,
    reportId: string,
    report: RealEstateReport,
    transition: RealEstateStatusTransitionWrite
  ): Promise<PersistedRealEstateReport>;
  getStats(tenantId: string): Promise<RealEstateStatsResult>;
  listTransitions(tenantId: string, reportId: string): Promise<RealEstateStatusTransitionRecord[]>;
};

type PrismaRealEstateReportDelegate = {
  create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>>;
  findFirst(args: { where: Record<string, unknown> }): Promise<Record<string, unknown> | null>;
  findMany(args: { where: Record<string, unknown>; orderBy: Record<string, unknown> }): Promise<Record<string, unknown>[]>;
  update(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<Record<string, unknown>>;
  groupBy(args: { by: string[]; where: Record<string, unknown>; _count: Record<string, unknown> }): Promise<Array<Record<string, unknown>>>;
  aggregate(args: { where: Record<string, unknown>; _sum?: Record<string, unknown>; _count?: Record<string, unknown> }): Promise<Record<string, unknown>>;
};

type PrismaRealEstateStatusTransitionDelegate = {
  create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>>;
  findMany(args: { where: Record<string, unknown>; orderBy: Record<string, unknown> }): Promise<Record<string, unknown>[]>;
};

type PrismaRealEstateClient = {
  realEstateReport: PrismaRealEstateReportDelegate;
  realEstateStatusTransition: PrismaRealEstateStatusTransitionDelegate;
  $transaction<T>(
    callback: (tx: {
      realEstateReport: PrismaRealEstateReportDelegate;
      realEstateStatusTransition: PrismaRealEstateStatusTransitionDelegate;
    }) => Promise<T>
  ): Promise<T>;
};

@Injectable()
export class PrismaRealEstateReportRepository implements RealEstateReportWriter {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaRealEstateClient
  ) {}

  async create(tenantId: string, report: RealEstateReport): Promise<PersistedRealEstateReport> {
    const created = await this.prisma.realEstateReport.create({
      data: { tenantId, ...this.buildReportData(report) }
    });
    return created as PersistedRealEstateReport;
  }

  async findById(tenantId: string, reportId: string): Promise<PersistedRealEstateReport | null> {
    const found = await this.prisma.realEstateReport.findFirst({
      where: { id: reportId, tenantId }
    });
    return (found as PersistedRealEstateReport | null) ?? null;
  }

  async search(
    tenantId: string,
    filters?: {
      assetIds?: string[];
      statuses?: RealEstateReport['status'][];
      priorities?: RealEstateReport['priority'][];
      categories?: RealEstateReport['category'][];
    }
  ): Promise<PersistedRealEstateReport[]> {
    if (filters?.assetIds && filters.assetIds.length === 0) return [];

    const where: Record<string, unknown> = { tenantId };
    if (filters?.assetIds?.length) where.assetId = { in: filters.assetIds };
    if (filters?.statuses?.length) where.status = { in: filters.statuses };
    if (filters?.priorities?.length) where.priority = { in: filters.priorities };
    if (filters?.categories?.length) where.category = { in: filters.categories };

    const found = await this.prisma.realEstateReport.findMany({
      where,
      orderBy: { openedAt: 'desc' }
    });
    return found as PersistedRealEstateReport[];
  }

  async update(
    _tenantId: string,
    reportId: string,
    report: RealEstateReport
  ): Promise<PersistedRealEstateReport> {
    const updated = await this.prisma.realEstateReport.update({
      where: { id: reportId },
      data: this.buildReportData(report)
    });
    return updated as PersistedRealEstateReport;
  }

  async updateStatusWithTransitionHistory(
    tenantId: string,
    reportId: string,
    report: RealEstateReport,
    transition: RealEstateStatusTransitionWrite
  ): Promise<PersistedRealEstateReport> {
    return (await this.prisma.$transaction(async (tx) => {
      const updated = await tx.realEstateReport.update({
        where: { id: reportId },
        data: this.buildReportData(report)
      });
      await tx.realEstateStatusTransition.create({
        data: {
          tenantId,
          realEstateReportId: reportId,
          fromStatus: transition.fromStatus,
          toStatus: report.status,
          transitionedBy: transition.transitionedBy,
          at: transition.at
        }
      });
      return updated as PersistedRealEstateReport;
    })) as PersistedRealEstateReport;
  }

  async getStats(tenantId: string): Promise<RealEstateStatsResult> {
    const [statusGroups, priorityGroups, blockAggregate, activeBlocked] = await Promise.all([
      this.prisma.realEstateReport.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { id: true }
      }),
      this.prisma.realEstateReport.groupBy({
        by: ['priority'],
        where: { tenantId },
        _count: { id: true }
      }),
      this.prisma.realEstateReport.aggregate({
        where: { tenantId },
        _sum: { blockCount: true },
        _count: { id: true }
      }),
      this.prisma.realEstateReport.findMany({
        where: { tenantId, status: 'blocked' },
        orderBy: { openedAt: 'desc' }
      })
    ]);

    const typedStatusGroups = statusGroups as Array<{ status: unknown; _count: { id: number } }>;
    const typedPriorityGroups = priorityGroups as Array<{ priority: unknown; _count: { id: number } }>;
    const typedBlockAggregate = blockAggregate as {
      _sum: { blockCount: number | null };
      _count: { id: number };
    };

    const byStatus: Record<string, number> = {
      pending: 0,
      in_progress: 0,
      blocked: 0,
      under_review: 0,
      resolved: 0,
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
      totalBlockEvents: typedBlockAggregate._sum.blockCount ?? 0,
      activeBlockCount: activeBlocked.length,
      totalReports: typedBlockAggregate._count.id
    };
  }

  async listTransitions(tenantId: string, reportId: string): Promise<RealEstateStatusTransitionRecord[]> {
    const found = await this.prisma.realEstateStatusTransition.findMany({
      where: { tenantId, realEstateReportId: reportId },
      orderBy: { at: 'asc' }
    });
    return found as RealEstateStatusTransitionRecord[];
  }

  private buildReportData(report: RealEstateReport): Record<string, unknown> {
    return {
      assetId: report.assetId,
      title: report.title,
      category: report.category,
      priority: report.priority,
      description: report.description,
      notes: report.notes,
      propertySystem: report.propertySystem,
      origin: report.origin,
      openedBy: report.openedBy,
      openedAt: report.openedAt,
      status: report.status,
      kanbanSubstatus: report.kanbanSubstatus,
      blockCount: report.blockCount,
      blockReason: report.blockReason,
      returnToServiceEta: report.returnToServiceEta ?? null
    };
  }
}
