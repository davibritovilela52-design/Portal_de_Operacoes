import { Inject, Injectable } from '@nestjs/common';

import type { CutoverGateBlocker, CutoverEntityCount } from './cutover-gate.service.js';
import { PrismaService } from '../persistence/prisma.service.js';

export type CutoverApprovalSnapshot = {
  centralOperations: {
    approved: boolean;
    approvedBy: string | null;
    approvedAt: Date | null;
  };
  technicalCoordination: {
    approved: boolean;
    approvedBy: string | null;
    approvedAt: Date | null;
  };
  portalAdmin: {
    approved: boolean;
    approvedBy: string | null;
    approvedAt: Date | null;
  };
};

export type CutoverEvidenceRecord = {
  id: string;
  type: string;
  title: string;
  detail: string;
  reference: string;
  valid: boolean;
  createdAt: Date;
};

export type CutoverCheckpointRecord = {
  id: string;
  checkpoint: 'T+1' | 'T+4' | 'T+24';
  status: 'pending' | 'completed' | 'blocked';
  notes: string;
  recordedBy: string;
  recordedAt: Date;
};

export type PersistedCutoverRun = {
  id: string;
  tenantId: string;
  label: string;
  status: 'draft' | 'approved' | 'blocked' | 'completed';
  goLiveDecision: 'go' | 'no_go' | null;
  decisionAt: Date | null;
  decidedBy: string | null;
  futureAgendaDaysMigrated: number;
  finalFreezeApplied: boolean;
  invalidCriticalAttachmentIds: string[];
  approvals: CutoverApprovalSnapshot;
  lastEvaluationApproved: boolean | null;
  lastEvaluationBlockers: CutoverGateBlocker[];
  entityCounts: CutoverEntityCount[];
  evidences: CutoverEvidenceRecord[];
  checkpoints: CutoverCheckpointRecord[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type UpsertCutoverRunInput = {
  runId?: string;
  label: string;
  futureAgendaDaysMigrated: number;
  finalFreezeApplied: boolean;
  invalidCriticalAttachmentIds: string[];
  approvals: CutoverApprovalSnapshot;
  entityCounts: CutoverEntityCount[];
  evidences: Array<{
    type: string;
    title: string;
    detail: string;
    reference: string;
    valid: boolean;
  }>;
  createdBy: string;
};

export type UpdateCutoverEvaluationInput = {
  approved: boolean;
  blockers: CutoverGateBlocker[];
  status: 'approved' | 'blocked';
};

export type RecordCutoverCheckpointInput = {
  checkpoint: 'T+1' | 'T+4' | 'T+24';
  status: 'pending' | 'completed' | 'blocked';
  notes: string;
  recordedBy: string;
  recordedAt: Date;
};

export type RecordCutoverDecisionInput = {
  decision: 'go' | 'no_go';
  status: 'blocked' | 'completed';
  decidedBy: string;
  decisionAt: Date;
};

export type CutoverRunWriter = {
  listRunsByTenant(tenantId: string): Promise<PersistedCutoverRun[]>;
  findRunById(tenantId: string, runId: string): Promise<PersistedCutoverRun | null>;
  upsertRun(tenantId: string, input: UpsertCutoverRunInput): Promise<PersistedCutoverRun>;
  updateRunEvaluation(
    tenantId: string,
    runId: string,
    input: UpdateCutoverEvaluationInput
  ): Promise<PersistedCutoverRun>;
  recordCheckpoint(
    tenantId: string,
    runId: string,
    input: RecordCutoverCheckpointInput
  ): Promise<CutoverCheckpointRecord>;
  recordDecision(
    tenantId: string,
    runId: string,
    input: RecordCutoverDecisionInput
  ): Promise<PersistedCutoverRun>;
  findLatestCompletedGoRunByTenant(tenantId: string): Promise<PersistedCutoverRun | null>;
};

@Injectable()
export class PrismaCutoverRunRepository implements CutoverRunWriter {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: {
      cutoverRun: {
        create(args: { data: Record<string, unknown>; include: Record<string, unknown> }): Promise<Record<string, unknown>>;
        findMany(args: { where: Record<string, unknown>; include: Record<string, unknown>; orderBy: Record<string, unknown> }): Promise<Record<string, unknown>[]>;
        findFirst(args: { where: Record<string, unknown>; include: Record<string, unknown>; orderBy?: Record<string, unknown> }): Promise<Record<string, unknown> | null>;
        update(args: { where: Record<string, unknown>; data: Record<string, unknown>; include: Record<string, unknown> }): Promise<Record<string, unknown>>;
      };
      cutoverCheckpoint: {
        upsert(args: {
          where: Record<string, unknown>;
          create: Record<string, unknown>;
          update: Record<string, unknown>;
        }): Promise<Record<string, unknown>>;
      };
    }
  ) {}

  async listRunsByTenant(tenantId: string): Promise<PersistedCutoverRun[]> {
    const runs = await this.prisma.cutoverRun.findMany({
      where: {
        tenantId
      },
      include: includeCutoverRunRelations,
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return runs.map((run) => this.toPersistedCutoverRun(run));
  }

  async findRunById(tenantId: string, runId: string): Promise<PersistedCutoverRun | null> {
    const found = await this.prisma.cutoverRun.findFirst({
      where: {
        tenantId,
        id: runId
      },
      include: includeCutoverRunRelations
    });

    return found ? this.toPersistedCutoverRun(found) : null;
  }

  async upsertRun(tenantId: string, input: UpsertCutoverRunInput): Promise<PersistedCutoverRun> {
    const evidenceCreates = input.evidences.map((evidence) => ({
      type: evidence.type,
      title: evidence.title,
      detail: evidence.detail,
      reference: evidence.reference,
      valid: evidence.valid
    }));

    if (!input.runId) {
      const created = await this.prisma.cutoverRun.create({
        data: {
          tenantId,
          label: input.label,
          status: 'draft',
          futureAgendaDaysMigrated: input.futureAgendaDaysMigrated,
          finalFreezeApplied: input.finalFreezeApplied,
          invalidCriticalAttachmentIds: input.invalidCriticalAttachmentIds,
          approvalsJson: serializeApprovals(input.approvals),
          createdBy: input.createdBy,
          entityCounts: {
            create: input.entityCounts.map((entityCount) => ({
              entity: entityCount.entity,
              sourceCount: entityCount.sourceCount,
              migratedCount: entityCount.migratedCount
            }))
          },
          evidences: evidenceCreates.length > 0 ? { create: evidenceCreates } : undefined
        },
        include: includeCutoverRunRelations
      });

      return this.toPersistedCutoverRun(created);
    }

    const updated = await this.prisma.cutoverRun.update({
      where: {
        id: input.runId
      },
      data: {
        label: input.label,
        futureAgendaDaysMigrated: input.futureAgendaDaysMigrated,
        finalFreezeApplied: input.finalFreezeApplied,
        invalidCriticalAttachmentIds: input.invalidCriticalAttachmentIds,
        approvalsJson: serializeApprovals(input.approvals),
        status: 'draft',
        lastEvaluationApproved: null,
        lastEvaluationBlockers: null,
        goLiveDecision: null,
        decisionAt: null,
        decidedBy: null,
        entityCounts: {
          deleteMany: {},
          create: input.entityCounts.map((entityCount) => ({
            entity: entityCount.entity,
            sourceCount: entityCount.sourceCount,
            migratedCount: entityCount.migratedCount
          }))
        },
        evidences: evidenceCreates.length > 0 ? { create: evidenceCreates } : undefined
      },
      include: includeCutoverRunRelations
    });

    return this.toPersistedCutoverRun(updated);
  }

  async updateRunEvaluation(
    _tenantId: string,
    runId: string,
    input: UpdateCutoverEvaluationInput
  ): Promise<PersistedCutoverRun> {
    const updated = await this.prisma.cutoverRun.update({
      where: {
        id: runId
      },
      data: {
        status: input.status,
        lastEvaluationApproved: input.approved,
        lastEvaluationBlockers: input.blockers
      },
      include: includeCutoverRunRelations
    });

    return this.toPersistedCutoverRun(updated);
  }

  async recordCheckpoint(
    _runTenantId: string,
    runId: string,
    input: RecordCutoverCheckpointInput
  ): Promise<CutoverCheckpointRecord> {
    const checkpoint = await this.prisma.cutoverCheckpoint.upsert({
      where: {
        cutoverRunId_checkpoint: {
          cutoverRunId: runId,
          checkpoint: input.checkpoint
        }
      },
      create: {
        cutoverRunId: runId,
        checkpoint: input.checkpoint,
        status: input.status,
        notes: input.notes,
        recordedBy: input.recordedBy,
        recordedAt: input.recordedAt
      },
      update: {
        status: input.status,
        notes: input.notes,
        recordedBy: input.recordedBy,
        recordedAt: input.recordedAt
      }
    });

    return this.toCheckpointRecord(checkpoint);
  }

  async recordDecision(
    _tenantId: string,
    runId: string,
    input: RecordCutoverDecisionInput
  ): Promise<PersistedCutoverRun> {
    const updated = await this.prisma.cutoverRun.update({
      where: {
        id: runId
      },
      data: {
        status: input.status,
        goLiveDecision: input.decision,
        decidedBy: input.decidedBy,
        decisionAt: input.decisionAt
      },
      include: includeCutoverRunRelations
    });

    return this.toPersistedCutoverRun(updated);
  }

  async findLatestCompletedGoRunByTenant(tenantId: string): Promise<PersistedCutoverRun | null> {
    const found = await this.prisma.cutoverRun.findFirst({
      where: {
        tenantId,
        status: 'completed',
        goLiveDecision: 'go'
      },
      include: includeCutoverRunRelations,
      orderBy: {
        decisionAt: 'desc'
      }
    });

    return found ? this.toPersistedCutoverRun(found) : null;
  }

  private toPersistedCutoverRun(record: Record<string, unknown>): PersistedCutoverRun {
    const typedRecord = record as Record<string, unknown> & {
      approvalsJson: unknown;
      lastEvaluationBlockers?: unknown;
      entityCounts?: Array<Record<string, unknown>>;
      evidences?: Array<Record<string, unknown>>;
      checkpoints?: Array<Record<string, unknown>>;
    };

    return {
      id: typedRecord.id as string,
      tenantId: typedRecord.tenantId as string,
      label: typedRecord.label as string,
      status: typedRecord.status as PersistedCutoverRun['status'],
      goLiveDecision: (typedRecord.goLiveDecision as PersistedCutoverRun['goLiveDecision']) ?? null,
      decisionAt: (typedRecord.decisionAt as Date | null | undefined) ?? null,
      decidedBy: (typedRecord.decidedBy as string | null | undefined) ?? null,
      futureAgendaDaysMigrated: typedRecord.futureAgendaDaysMigrated as number,
      finalFreezeApplied: typedRecord.finalFreezeApplied as boolean,
      invalidCriticalAttachmentIds: Array.isArray(typedRecord.invalidCriticalAttachmentIds)
        ? [...(typedRecord.invalidCriticalAttachmentIds as string[])]
        : [],
      approvals: deserializeApprovals(typedRecord.approvalsJson),
      lastEvaluationApproved:
        typeof typedRecord.lastEvaluationApproved === 'boolean'
          ? (typedRecord.lastEvaluationApproved as boolean)
          : null,
      lastEvaluationBlockers: Array.isArray(typedRecord.lastEvaluationBlockers)
        ? (typedRecord.lastEvaluationBlockers as CutoverGateBlocker[])
        : [],
      entityCounts: (typedRecord.entityCounts ?? []).map((entityCount) => ({
        entity: entityCount.entity as string,
        sourceCount: entityCount.sourceCount as number,
        migratedCount: entityCount.migratedCount as number
      })),
      evidences: (typedRecord.evidences ?? []).map((evidence) => ({
        id: evidence.id as string,
        type: evidence.type as string,
        title: evidence.title as string,
        detail: evidence.detail as string,
        reference: evidence.reference as string,
        valid: evidence.valid as boolean,
        createdAt: evidence.createdAt as Date
      })),
      checkpoints: (typedRecord.checkpoints ?? []).map((checkpoint) =>
        this.toCheckpointRecord(checkpoint)
      ),
      createdBy: typedRecord.createdBy as string,
      createdAt: typedRecord.createdAt as Date,
      updatedAt: typedRecord.updatedAt as Date
    };
  }

  private toCheckpointRecord(record: Record<string, unknown>): CutoverCheckpointRecord {
    return {
      id: record.id as string,
      checkpoint: record.checkpoint as CutoverCheckpointRecord['checkpoint'],
      status: record.status as CutoverCheckpointRecord['status'],
      notes: record.notes as string,
      recordedBy: record.recordedBy as string,
      recordedAt: record.recordedAt as Date
    };
  }
}

const includeCutoverRunRelations = {
  entityCounts: {
    orderBy: {
      entity: 'asc'
    }
  },
  evidences: {
    orderBy: {
      createdAt: 'asc'
    }
  },
  checkpoints: {
    orderBy: {
      recordedAt: 'asc'
    }
  }
};

function serializeApprovals(approvals: CutoverApprovalSnapshot) {
  return {
    centralOperations: {
      approved: approvals.centralOperations.approved,
      approvedBy: approvals.centralOperations.approvedBy,
      approvedAt: approvals.centralOperations.approvedAt?.toISOString() ?? null
    },
    technicalCoordination: {
      approved: approvals.technicalCoordination.approved,
      approvedBy: approvals.technicalCoordination.approvedBy,
      approvedAt: approvals.technicalCoordination.approvedAt?.toISOString() ?? null
    },
    portalAdmin: {
      approved: approvals.portalAdmin.approved,
      approvedBy: approvals.portalAdmin.approvedBy,
      approvedAt: approvals.portalAdmin.approvedAt?.toISOString() ?? null
    }
  };
}

function deserializeApprovals(value: unknown): CutoverApprovalSnapshot {
  const source = (value ?? {}) as Record<string, Record<string, unknown>>;

  return {
    centralOperations: deserializeApprovalRecord(source.centralOperations),
    technicalCoordination: deserializeApprovalRecord(source.technicalCoordination),
    portalAdmin: deserializeApprovalRecord(source.portalAdmin)
  };
}

function deserializeApprovalRecord(value: Record<string, unknown> | undefined) {
  return {
    approved: value?.approved === true,
    approvedBy: typeof value?.approvedBy === 'string' ? value.approvedBy : null,
    approvedAt:
      typeof value?.approvedAt === 'string' ? new Date(value.approvedAt) : null
  };
}
