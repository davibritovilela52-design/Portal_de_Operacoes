import { Inject, Injectable, Optional } from '@nestjs/common';

import {
  AccessActor,
  AccessDecisionReason,
  AccessPolicyService
} from '../access/access-policy.service.js';
import {
  CutoverApprovalSnapshot,
  type CutoverCheckpointRecord,
  type CutoverEvidenceRecord,
  type CutoverRunWriter,
  PrismaCutoverRunRepository,
  type PersistedCutoverRun
} from './cutover-run.repository.js';
import {
  CutoverGateBlocker,
  CutoverGateInput,
  CutoverGateService
} from './cutover-gate.service.js';

export type CutoverRunStatus = PersistedCutoverRun['status'];
export type CutoverDecision = Exclude<PersistedCutoverRun['goLiveDecision'], null>;

export type CutoverRunInput = {
  label: string;
  futureAgendaDaysMigrated: number;
  finalFreezeApplied: boolean;
  invalidCriticalAttachmentIds: string[];
  approvals: CutoverApprovalSnapshot;
  entityCounts: CutoverGateInput['entityCounts'];
  evidences: Array<{
    type: string;
    title: string;
    detail: string;
    reference: string;
    valid: boolean;
  }>;
};

export type SearchCutoverRunsCommand = {
  actor: AccessActor;
  tenantId: string;
};

export type SearchCutoverRunsCommandResult =
  | {
      runs: PersistedCutoverRun[];
    }
  | {
      runs: [];
      reason: 'FORBIDDEN';
      accessReason: AccessDecisionReason;
    };

export type GetCutoverRunDetailCommand = {
  actor: AccessActor;
  tenantId: string;
  runId: string;
};

export type GetCutoverRunDetailCommandResult =
  | {
      found: true;
      run: PersistedCutoverRun;
    }
  | {
      found: false;
      reason: 'FORBIDDEN' | 'NOT_FOUND';
      accessReason?: AccessDecisionReason;
    };

export type UpsertCutoverRunCommand = {
  actor: AccessActor;
  tenantId: string;
  runId?: string;
  input: CutoverRunInput;
};

export type UpsertCutoverRunCommandResult =
  | {
      saved: true;
      run: PersistedCutoverRun;
    }
  | {
      saved: false;
      reason: 'FORBIDDEN';
      accessReason: AccessDecisionReason;
    };

export type EvaluateCutoverRunCommand = {
  actor: AccessActor;
  tenantId: string;
  runId: string;
};

export type EvaluateCutoverRunCommandResult =
  | {
      approved: boolean;
      blockers: CutoverGateBlocker[];
      run: PersistedCutoverRun;
    }
  | {
      approved: false;
      blockers: [];
      reason: 'FORBIDDEN' | 'NOT_FOUND';
      accessReason?: AccessDecisionReason;
    };

export type RecordCutoverCheckpointCommand = {
  actor: AccessActor;
  tenantId: string;
  runId: string;
  input: {
    checkpoint: 'T+1' | 'T+4' | 'T+24';
    status: 'pending' | 'completed' | 'blocked';
    notes: string;
  };
};

export type RecordCutoverCheckpointCommandResult =
  | {
      recorded: true;
      checkpoint: CutoverCheckpointRecord;
    }
  | {
      recorded: false;
      reason: 'FORBIDDEN' | 'NOT_FOUND';
      accessReason?: AccessDecisionReason;
    };

export type RecordCutoverDecisionCommand = {
  actor: AccessActor;
  tenantId: string;
  runId: string;
  input: {
    decision: CutoverDecision;
  };
};

export type RecordCutoverDecisionCommandResult =
  | {
      decided: true;
      decision: CutoverDecision;
      legacyPortalMode: 'read_write' | 'read_only';
      run: PersistedCutoverRun;
    }
  | {
      decided: false;
      reason: 'FORBIDDEN' | 'NOT_FOUND' | 'GO_LIVE_BLOCKED';
      accessReason?: AccessDecisionReason;
      blockers?: CutoverGateBlocker[];
    };

export type LegacyPortalWritePolicy =
  | {
      allowed: true;
      reason: 'ALLOWED';
    }
  | {
      allowed: false;
      reason: 'LEGACY_PORTAL_READ_ONLY';
    };

@Injectable()
export class CutoverApplicationService {
  constructor(
    private readonly cutoverGateService: CutoverGateService,
    @Inject(PrismaCutoverRunRepository)
    private readonly cutoverRunRepository: CutoverRunWriter,
    @Optional()
    private readonly accessPolicyService: AccessPolicyService = new AccessPolicyService()
  ) {}

  async searchRuns(
    command: SearchCutoverRunsCommand
  ): Promise<SearchCutoverRunsCommandResult> {
    const accessDecision = this.accessPolicyService.authorize({
      actor: command.actor,
      action: 'cutover.run.read',
      subject: {
        tenantId: command.tenantId
      }
    });

    if (!accessDecision.allowed) {
      return {
        runs: [],
        reason: 'FORBIDDEN',
        accessReason: accessDecision.reason
      };
    }

    return {
      runs: await this.cutoverRunRepository.listRunsByTenant(command.tenantId)
    };
  }

  async getRunDetail(
    command: GetCutoverRunDetailCommand
  ): Promise<GetCutoverRunDetailCommandResult> {
    const accessDecision = this.accessPolicyService.authorize({
      actor: command.actor,
      action: 'cutover.run.read',
      subject: {
        tenantId: command.tenantId
      }
    });

    if (!accessDecision.allowed) {
      return {
        found: false,
        reason: 'FORBIDDEN',
        accessReason: accessDecision.reason
      };
    }

    const run = await this.cutoverRunRepository.findRunById(command.tenantId, command.runId);

    if (!run) {
      return {
        found: false,
        reason: 'NOT_FOUND'
      };
    }

    return {
      found: true,
      run
    };
  }

  async upsertRun(
    command: UpsertCutoverRunCommand
  ): Promise<UpsertCutoverRunCommandResult> {
    const accessDecision = this.accessPolicyService.authorize({
      actor: command.actor,
      action: 'cutover.run.manage',
      subject: {
        tenantId: command.tenantId
      }
    });

    if (!accessDecision.allowed) {
      return {
        saved: false,
        reason: 'FORBIDDEN',
        accessReason: accessDecision.reason
      };
    }

    const run = await this.cutoverRunRepository.upsertRun(command.tenantId, {
      runId: command.runId,
      label: command.input.label,
      futureAgendaDaysMigrated: command.input.futureAgendaDaysMigrated,
      finalFreezeApplied: command.input.finalFreezeApplied,
      invalidCriticalAttachmentIds: command.input.invalidCriticalAttachmentIds,
      approvals: normalizeCutoverApprovals(command.input.approvals),
      entityCounts: command.input.entityCounts,
      evidences: normalizeCutoverEvidences(command.input.evidences),
      createdBy: command.actor.userId
    });

    return {
      saved: true,
      run
    };
  }

  async evaluateRun(
    command: EvaluateCutoverRunCommand
  ): Promise<EvaluateCutoverRunCommandResult> {
    const accessDecision = this.accessPolicyService.authorize({
      actor: command.actor,
      action: 'cutover.run.evaluate',
      subject: {
        tenantId: command.tenantId
      }
    });

    if (!accessDecision.allowed) {
      return {
        approved: false,
        blockers: [],
        reason: 'FORBIDDEN',
        accessReason: accessDecision.reason
      };
    }

    const run = await this.cutoverRunRepository.findRunById(command.tenantId, command.runId);

    if (!run) {
      return {
        approved: false,
        blockers: [],
        reason: 'NOT_FOUND'
      };
    }

    const gateDecision = this.cutoverGateService.evaluateGate(toGateInput(run));
    const updatedRun = await this.cutoverRunRepository.updateRunEvaluation(
      command.tenantId,
      command.runId,
      {
        approved: gateDecision.approved,
        blockers: gateDecision.blockers,
        status: gateDecision.approved ? 'approved' : 'blocked'
      }
    );

    return {
      approved: gateDecision.approved,
      blockers: gateDecision.blockers,
      run: updatedRun
    };
  }

  async recordCheckpoint(
    command: RecordCutoverCheckpointCommand
  ): Promise<RecordCutoverCheckpointCommandResult> {
    const accessDecision = this.accessPolicyService.authorize({
      actor: command.actor,
      action: 'cutover.checkpoint.record',
      subject: {
        tenantId: command.tenantId
      }
    });

    if (!accessDecision.allowed) {
      return {
        recorded: false,
        reason: 'FORBIDDEN',
        accessReason: accessDecision.reason
      };
    }

    const run = await this.cutoverRunRepository.findRunById(command.tenantId, command.runId);

    if (!run) {
      return {
        recorded: false,
        reason: 'NOT_FOUND'
      };
    }

    const checkpoint = await this.cutoverRunRepository.recordCheckpoint(
      command.tenantId,
      command.runId,
      {
        checkpoint: command.input.checkpoint,
        status: command.input.status,
        notes: command.input.notes,
        recordedBy: command.actor.userId,
        recordedAt: new Date()
      }
    );

    return {
      recorded: true,
      checkpoint
    };
  }

  async recordDecision(
    command: RecordCutoverDecisionCommand
  ): Promise<RecordCutoverDecisionCommandResult> {
    const accessDecision = this.accessPolicyService.authorize({
      actor: command.actor,
      action: 'cutover.run.decide',
      subject: {
        tenantId: command.tenantId
      }
    });

    if (!accessDecision.allowed) {
      return {
        decided: false,
        reason: 'FORBIDDEN',
        accessReason: accessDecision.reason
      };
    }

    const run = await this.cutoverRunRepository.findRunById(command.tenantId, command.runId);

    if (!run) {
      return {
        decided: false,
        reason: 'NOT_FOUND'
      };
    }

    if (command.input.decision === 'go') {
      const gateDecision = this.cutoverGateService.evaluateGate(toGateInput(run));

      if (!gateDecision.approved) {
        return {
          decided: false,
          reason: 'GO_LIVE_BLOCKED',
          blockers: gateDecision.blockers
        };
      }
    }

    const persistedRun = await this.cutoverRunRepository.recordDecision(
      command.tenantId,
      command.runId,
      {
        decision: command.input.decision,
        status: command.input.decision === 'go' ? 'completed' : 'blocked',
        decidedBy: command.actor.userId,
        decisionAt: new Date()
      }
    );

    return {
      decided: true,
      decision: command.input.decision,
      legacyPortalMode: command.input.decision === 'go' ? 'read_only' : 'read_write',
      run: persistedRun
    };
  }

  async canWriteLegacyPortal(tenantId: string): Promise<LegacyPortalWritePolicy> {
    const latestGoRun =
      await this.cutoverRunRepository.findLatestCompletedGoRunByTenant(tenantId);

    if (latestGoRun) {
      return {
        allowed: false,
        reason: 'LEGACY_PORTAL_READ_ONLY'
      };
    }

    return {
      allowed: true,
      reason: 'ALLOWED'
    };
  }
}

function toGateInput(run: PersistedCutoverRun): CutoverGateInput {
  return {
    entityCounts: run.entityCounts,
    invalidCriticalAttachmentIds: run.invalidCriticalAttachmentIds,
    futureAgendaDaysMigrated: run.futureAgendaDaysMigrated,
    finalFreezeApplied: run.finalFreezeApplied,
    approvals: {
      centralOperations: run.approvals.centralOperations.approved,
      technicalCoordination: run.approvals.technicalCoordination.approved,
      portalAdmin: run.approvals.portalAdmin.approved
    }
  };
}

function normalizeCutoverEvidences(
  evidences: Array<{
    type: string;
    title: string;
    detail: string;
    reference: string;
    valid: boolean;
  }>
): Array<Omit<CutoverEvidenceRecord, 'id' | 'createdAt'>> {
  return evidences
    .map((evidence) => ({
      type: evidence.type.trim(),
      title: evidence.title.trim(),
      detail: evidence.detail.trim(),
      reference: evidence.reference.trim(),
      valid: evidence.valid
    }))
    .filter(
      (evidence) =>
        evidence.type.length > 0 &&
        evidence.title.length > 0 &&
        evidence.detail.length > 0 &&
        evidence.reference.length > 0
    );
}

function normalizeCutoverApprovals(
  approvals: CutoverRunInput['approvals']
): CutoverApprovalSnapshot {
  return {
    centralOperations: normalizeApprovalRecord(approvals.centralOperations),
    technicalCoordination: normalizeApprovalRecord(approvals.technicalCoordination),
    portalAdmin: normalizeApprovalRecord(approvals.portalAdmin)
  };
}

function normalizeApprovalRecord(input: {
  approved: boolean;
  approvedBy: string | null;
  approvedAt: string | Date | null;
}) {
  return {
    approved: input.approved,
    approvedBy: input.approvedBy,
    approvedAt: normalizeOptionalDate(input.approvedAt)
  };
}

function normalizeOptionalDate(value: string | Date | null): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
