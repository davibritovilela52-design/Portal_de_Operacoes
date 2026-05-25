import { Inject, Injectable } from '@nestjs/common';

import {
  AccessActor,
  AccessDecisionReason,
  AccessPolicyService
} from '../access/access-policy.service.js';
import {
  AuditDecisionMemo,
  AuditGovernanceService,
  CriticalActionDecision,
  CriticalActionJustification,
  ImmutableCompletedRecord,
  RectificationDecision,
  RectificationInput
} from './audit-governance.service.js';
import {
  PersistedAuditDecisionMemo,
  AuditDecisionMemoWriter,
  PrismaAuditDecisionMemoRepository
} from './audit-decision-memo.repository.js';
import {
  PersistedAuditRectification,
  AuditRectificationWriter,
  PrismaAuditRectificationRepository
} from './audit-rectification.repository.js';

export type CreateRectificationCommand = {
  actor: AccessActor;
  tenantId: string;
  record: ImmutableCompletedRecord;
  input: RectificationInput;
};

export type CreateRectificationCommandResult =
  | RectificationDecision
  | {
      created: false;
      reason: 'FORBIDDEN';
      accessReason: AccessDecisionReason;
    };

export type CreateDecisionMemoCommand = {
  actor: AccessActor;
  tenantId: string;
  action: string;
  aggregateType: string;
  aggregateId: string;
  assetId?: string;
  justification: CriticalActionJustification;
};

export type CreateDecisionMemoCommandResult =
  | {
      confirmed: true;
      memo: AuditDecisionMemo;
    }
  | {
      confirmed: false;
      reason: Extract<CriticalActionDecision, { allowed: false }>['reason'];
    }
  | {
      confirmed: false;
      reason: 'FORBIDDEN';
      accessReason: AccessDecisionReason;
    };

export type AuditLedgerEntryType = 'decision_memo' | 'rectification';

export type SearchAuditLedgerCommand = {
  actor: AccessActor;
  tenantId: string;
  filters?: {
    types?: AuditLedgerEntryType[];
  };
};

export type AuditLedgerEntryView =
  | {
      id: string;
      type: 'decision_memo';
      title: string;
      summary: string;
      actor: string;
      at: Date;
      assetId?: string;
      aggregateType: string;
      aggregateId: string;
      status: AuditDecisionMemo['status'];
    }
  | {
      id: string;
      type: 'rectification';
      title: string;
      summary: string;
      actor: string;
      at: Date;
      recordId: string;
      sourceVersion: number;
      targetVersion: number;
    };

export type SearchAuditLedgerCommandResult = {
  entries: AuditLedgerEntryView[];
};

@Injectable()
export class AuditApplicationService {
  constructor(
    private readonly accessPolicyService: AccessPolicyService,
    private readonly auditGovernanceService: AuditGovernanceService,
    @Inject(PrismaAuditRectificationRepository)
    private readonly auditRectificationRepository: AuditRectificationWriter,
    @Inject(PrismaAuditDecisionMemoRepository)
    private readonly auditDecisionMemoRepository: AuditDecisionMemoWriter
  ) {}

  getCatalog(): ReturnType<AuditGovernanceService['getCatalog']> {
    return this.auditGovernanceService.getCatalog();
  }

  async searchAuditLedger(
    command: SearchAuditLedgerCommand
  ): Promise<SearchAuditLedgerCommandResult> {
    const accessDecision = this.accessPolicyService.authorize({
      actor: command.actor,
      action: 'audit.ledger.search',
      subject: {
        tenantId: command.tenantId
      }
    });

    if (!accessDecision.allowed) {
      return {
        entries: []
      };
    }

    const allowedTypes = new Set(command.filters?.types ?? ['decision_memo', 'rectification']);
    const [decisionMemos, rectifications] = await Promise.all([
      allowedTypes.has('decision_memo')
        ? this.auditDecisionMemoRepository.listByTenant(command.tenantId)
        : Promise.resolve([]),
      allowedTypes.has('rectification')
        ? this.auditRectificationRepository.listByTenant(command.tenantId)
        : Promise.resolve([])
    ]);

    const entries = [
      ...decisionMemos.map((memo) => this.mapDecisionMemoEntry(memo)),
      ...rectifications.map((rectification) => this.mapRectificationEntry(rectification))
    ]
      .filter((entry) => this.canActorReadAuditEntry(command.actor, entry))
      .sort((left, right) => right.at.getTime() - left.at.getTime());

    return {
      entries
    };
  }

  async createRectification(
    command: CreateRectificationCommand
  ): Promise<CreateRectificationCommandResult> {
    const accessDecision = this.accessPolicyService.authorize({
      actor: command.actor,
      action: 'audit.rectification.create',
      subject: {
        tenantId: command.tenantId
      }
    });

    if (!accessDecision.allowed) {
      return {
        created: false,
        reason: 'FORBIDDEN',
        accessReason: accessDecision.reason
      };
    }

    const result = this.auditGovernanceService.createRectification(command.record, command.input);

    if (result.created) {
      await this.auditRectificationRepository.create(command.tenantId, result.rectification);
    }

    return result;
  }

  async createDecisionMemo(
    command: CreateDecisionMemoCommand
  ): Promise<CreateDecisionMemoCommandResult> {
    const accessDecision = this.accessPolicyService.authorize({
      actor: command.actor,
      action: 'audit.decision_memo.create',
      subject: {
        tenantId: command.tenantId,
        assetId: command.assetId
      }
    });

    if (!accessDecision.allowed) {
      return {
        confirmed: false,
        reason: 'FORBIDDEN',
        accessReason: accessDecision.reason
      };
    }

    const criticalActionDecision = this.auditGovernanceService.evaluateCriticalAction(
      command.action,
      command.justification
    );

    if (!criticalActionDecision.allowed) {
      return {
        confirmed: false,
        reason: criticalActionDecision.reason
      };
    }

    const result = this.auditGovernanceService.confirmDecisionMemo(command.justification);

    await this.auditDecisionMemoRepository.create(
      command.tenantId,
      command.action,
      command.aggregateType,
      command.aggregateId,
      command.assetId,
      result.memo
    );

    return result;
  }

  private canActorReadAuditEntry(actor: AccessActor, entry: AuditLedgerEntryView): boolean {
    if (actor.role !== 'asset_field_team') {
      return true;
    }

    return 'assetId' in entry && typeof entry.assetId === 'string'
      ? actor.assetIds.includes(entry.assetId)
      : false;
  }

  private mapDecisionMemoEntry(memo: PersistedAuditDecisionMemo): AuditLedgerEntryView {
    return {
      id: memo.id,
      type: 'decision_memo',
      title: `${memo.action} · ${memo.aggregateType}`,
      summary: memo.decision,
      actor: memo.decidedBy,
      at: memo.createdAt,
      assetId: memo.assetId,
      aggregateType: memo.aggregateType,
      aggregateId: memo.aggregateId,
      status: memo.status
    };
  }

  private mapRectificationEntry(
    rectification: PersistedAuditRectification
  ): AuditLedgerEntryView {
    return {
      id: rectification.id,
      type: 'rectification',
      title: `Retificacao v${rectification.sourceVersion}->v${rectification.targetVersion}`,
      summary: rectification.reason,
      actor: rectification.changedBy,
      at: rectification.createdAt,
      recordId: rectification.recordId,
      sourceVersion: rectification.sourceVersion,
      targetVersion: rectification.targetVersion
    };
  }
}
