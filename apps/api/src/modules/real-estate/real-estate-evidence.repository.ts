import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../persistence/prisma.service.js';
import type { RealEstateEvidenceType } from './real-estate-workflow.service.js';

export type RealEstateEvidence = {
  type: RealEstateEvidenceType;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  storageKey: string;
  sha256: string;
  antivirusStatus: 'pending' | 'clean' | 'flagged';
  uploadedBy: string;
  uploadedAt: Date;
};

export type PersistedRealEstateEvidence = RealEstateEvidence & {
  id: string;
  tenantId: string;
  reportId: string;
  createdAt: Date;
};

export type RealEstateEvidenceWriter = {
  create(tenantId: string, reportId: string, evidence: RealEstateEvidence): Promise<PersistedRealEstateEvidence>;
  findById(tenantId: string, reportId: string, evidenceId: string): Promise<PersistedRealEstateEvidence | null>;
  listByReport(tenantId: string, reportId: string): Promise<PersistedRealEstateEvidence[]>;
  listByReportIds(tenantId: string, reportIds: string[]): Promise<(PersistedRealEstateEvidence & { reportId: string })[]>;
};

type PrismaRealEstateEvidenceDelegate = {
  create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>>;
  findFirst(args: { where: Record<string, unknown> }): Promise<Record<string, unknown> | null>;
  findMany(args: { where: Record<string, unknown>; orderBy: Record<string, unknown> }): Promise<Record<string, unknown>[]>;
};

@Injectable()
export class PrismaRealEstateEvidenceRepository implements RealEstateEvidenceWriter {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: { realEstateEvidence: PrismaRealEstateEvidenceDelegate }
  ) {}

  async create(tenantId: string, reportId: string, evidence: RealEstateEvidence): Promise<PersistedRealEstateEvidence> {
    const created = await this.prisma.realEstateEvidence.create({
      data: {
        tenantId,
        realEstateReportId: reportId,
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
    return { ...(created as PersistedRealEstateEvidence), reportId };
  }

  async findById(tenantId: string, reportId: string, evidenceId: string): Promise<PersistedRealEstateEvidence | null> {
    const found = await this.prisma.realEstateEvidence.findFirst({
      where: { id: evidenceId, tenantId, realEstateReportId: reportId }
    });
    return found ? ({ ...(found as PersistedRealEstateEvidence), reportId }) : null;
  }

  async listByReport(tenantId: string, reportId: string): Promise<PersistedRealEstateEvidence[]> {
    const found = await this.prisma.realEstateEvidence.findMany({
      where: { tenantId, realEstateReportId: reportId },
      orderBy: { uploadedAt: 'asc' }
    });
    return found.map((e) => ({ ...(e as PersistedRealEstateEvidence), reportId }));
  }

  async listByReportIds(
    tenantId: string,
    reportIds: string[]
  ): Promise<(PersistedRealEstateEvidence & { reportId: string })[]> {
    if (reportIds.length === 0) return [];
    const found = await this.prisma.realEstateEvidence.findMany({
      where: { tenantId, realEstateReportId: { in: reportIds } },
      orderBy: { uploadedAt: 'asc' }
    });
    return found.map((e) => {
      const rec = e as Record<string, unknown>;
      return { ...(rec as PersistedRealEstateEvidence), reportId: rec.realEstateReportId as string };
    });
  }
}
