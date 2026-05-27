import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../persistence/prisma.service.js';
import type { AviationEvidenceType } from './aviation-workflow.service.js';

export type AviationEvidence = {
  type: AviationEvidenceType;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  storageKey: string;
  sha256: string;
  antivirusStatus: 'pending' | 'clean' | 'flagged';
  uploadedBy: string;
  uploadedAt: Date;
};

export type PersistedAviationEvidence = AviationEvidence & {
  id: string;
  tenantId: string;
  reportId: string;
  createdAt: Date;
};

export type AviationEvidenceWriter = {
  create(tenantId: string, reportId: string, evidence: AviationEvidence): Promise<PersistedAviationEvidence>;
  findById(tenantId: string, reportId: string, evidenceId: string): Promise<PersistedAviationEvidence | null>;
  listByReport(tenantId: string, reportId: string): Promise<PersistedAviationEvidence[]>;
  listByReportIds(tenantId: string, reportIds: string[]): Promise<(PersistedAviationEvidence & { reportId: string })[]>;
};

type PrismaAviationEvidenceDelegate = {
  create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>>;
  findFirst(args: { where: Record<string, unknown> }): Promise<Record<string, unknown> | null>;
  findMany(args: { where: Record<string, unknown>; orderBy: Record<string, unknown> }): Promise<Record<string, unknown>[]>;
};

@Injectable()
export class PrismaAviationEvidenceRepository implements AviationEvidenceWriter {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: { aviationEvidence: PrismaAviationEvidenceDelegate }
  ) {}

  async create(tenantId: string, reportId: string, evidence: AviationEvidence): Promise<PersistedAviationEvidence> {
    const created = await this.prisma.aviationEvidence.create({
      data: {
        tenantId,
        aviationReportId: reportId,
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
    return { ...(created as PersistedAviationEvidence), reportId };
  }

  async findById(tenantId: string, reportId: string, evidenceId: string): Promise<PersistedAviationEvidence | null> {
    const found = await this.prisma.aviationEvidence.findFirst({
      where: { id: evidenceId, tenantId, aviationReportId: reportId }
    });
    return found ? ({ ...(found as PersistedAviationEvidence), reportId }) : null;
  }

  async listByReport(tenantId: string, reportId: string): Promise<PersistedAviationEvidence[]> {
    const found = await this.prisma.aviationEvidence.findMany({
      where: { tenantId, aviationReportId: reportId },
      orderBy: { uploadedAt: 'asc' }
    });
    return found.map((e) => ({ ...(e as PersistedAviationEvidence), reportId }));
  }

  async listByReportIds(
    tenantId: string,
    reportIds: string[]
  ): Promise<(PersistedAviationEvidence & { reportId: string })[]> {
    if (reportIds.length === 0) return [];
    const found = await this.prisma.aviationEvidence.findMany({
      where: { tenantId, aviationReportId: { in: reportIds } },
      orderBy: { uploadedAt: 'asc' }
    });
    return found.map((e) => {
      const rec = e as Record<string, unknown>;
      return { ...(rec as PersistedAviationEvidence), reportId: rec.aviationReportId as string };
    });
  }
}
