import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../persistence/prisma.service.js';
import { AviationEvidenceType } from './aviation-workflow.service.js';

export type PersistedAviationEvidence = {
  id: string;
  tenantId: string;
  aviationReportId: string;
  type: AviationEvidenceType;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  storageKey: string;
  sha256: string;
  antivirusStatus: 'pending' | 'clean' | 'flagged';
  uploadedBy: string;
  uploadedAt: Date;
  createdAt: Date;
};

export type AviationEvidenceReader = {
  listByReport(tenantId: string, reportId: string): Promise<PersistedAviationEvidence[]>;
};

type PrismaAviationEvidenceDelegate = {
  findMany(args: {
    where: Record<string, unknown>;
    orderBy: Record<string, unknown>;
  }): Promise<Record<string, unknown>[]>;
};

type PrismaAviationEvidenceClient = {
  aviationEvidence: PrismaAviationEvidenceDelegate;
};

@Injectable()
export class PrismaAviationEvidenceRepository implements AviationEvidenceReader {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaAviationEvidenceClient
  ) {}

  async listByReport(
    tenantId: string,
    reportId: string
  ): Promise<PersistedAviationEvidence[]> {
    const evidences = await this.prisma.aviationEvidence.findMany({
      where: {
        tenantId,
        aviationReportId: reportId
      },
      orderBy: {
        uploadedAt: 'asc'
      }
    });

    return evidences as PersistedAviationEvidence[];
  }
}
