import { randomUUID } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';

import type { AccessActor, AccessDecisionReason } from '../access/access-policy.service.js';
import { AccessPolicyService } from '../access/access-policy.service.js';
import { EvidenceSecurityService } from '../governance/evidence-security.service.js';
import { appendMaintenanceTicketComment } from '../maintenance/maintenance-ticket-comments.js';
import type { RealEstateEvidenceType, RealEstateReport, CreateRealEstateReportInput } from './real-estate-workflow.service.js';
import { RealEstateWorkflowService } from './real-estate-workflow.service.js';
import type { RealEstateEvidenceWriter, PersistedRealEstateEvidence } from './real-estate-evidence.repository.js';
import { PrismaRealEstateEvidenceRepository } from './real-estate-evidence.repository.js';
import type {
  RealEstateReportWriter,
  RealEstateStatsResult,
  RealEstateStatusTransitionRecord,
  PersistedRealEstateReport
} from './real-estate-report.repository.js';
import { PrismaRealEstateReportRepository } from './real-estate-report.repository.js';

export type RealEstateReportQueueView = {
  id: string;
  assetId: string;
  title: string;
  category: RealEstateReport['category'];
  priority: RealEstateReport['priority'];
  origin: RealEstateReport['origin'];
  openedBy: string;
  openedAt: Date;
  status: RealEstateReport['status'];
  kanbanSubstatus?: RealEstateReport['kanbanSubstatus'];
  blockCount: number;
  blockReason?: RealEstateReport['blockReason'];
  returnToServiceEta?: Date;
  updatedAt: Date;
  evidenceCount: number;
  evidenceTypes: RealEstateEvidenceType[];
};

export type SearchRealEstateReportsCommand = {
  actor: AccessActor;
  tenantId: string;
  filters?: {
    assetIds?: string[];
    statuses?: RealEstateReport['status'][];
    priorities?: RealEstateReport['priority'][];
    categories?: RealEstateReport['category'][];
  };
};

export type SearchRealEstateReportsCommandResult =
  | { reports: RealEstateReportQueueView[] }
  | { reports: []; reason: 'FORBIDDEN'; accessReason: AccessDecisionReason };

export type GetRealEstateStatsCommand = {
  actor: AccessActor;
  tenantId: string;
};

export type GetRealEstateStatsCommandResult =
  | { found: true; stats: RealEstateStatsResult }
  | { found: false; reason: 'FORBIDDEN'; accessReason: AccessDecisionReason };

export type CreateRealEstateReportCommand = {
  actor: AccessActor;
  tenantId: string;
  input: CreateRealEstateReportInput;
};

export type CreateRealEstateReportCommandResult =
  | { created: true; reason: 'CREATED'; report: RealEstateReport }
  | { created: false; reason: 'FORBIDDEN'; accessReason: AccessDecisionReason }
  | { created: false; reason: 'REQUIRED_FIELDS_MISSING'; missingFields: string[] };

export type TransitionRealEstateReportCommand = {
  actor: AccessActor;
  tenantId: string;
  reportId: string;
  input: {
    toStatus: RealEstateReport['status'];
    kanbanSubstatus?: RealEstateReport['kanbanSubstatus'];
    justification?: string;
    blockReason?: RealEstateReport['blockReason'];
    returnToServiceEta?: Date | string;
  };
};

export type TransitionRealEstateReportCommandResult =
  | { allowed: true; reason: 'ALLOWED'; report: RealEstateReport }
  | { allowed: false; reason: 'FORBIDDEN'; accessReason: AccessDecisionReason }
  | { allowed: false; reason: 'NOT_FOUND' }
  | { allowed: false; reason: string };

export type RegisterRealEstateCommentCommand = {
  actor: AccessActor;
  tenantId: string;
  reportId: string;
  input: { message: string; commentedBy: string; commentedAt: Date };
};

export type RegisterRealEstateCommentCommandResult =
  | { registered: true; reason: 'REGISTERED'; notes?: string }
  | { registered: false; reason: 'FORBIDDEN'; accessReason: AccessDecisionReason }
  | { registered: false; reason: 'NOT_FOUND' | 'COMMENT_REQUIRED' };

export type AttachRealEstateEvidenceCommand = {
  actor: AccessActor;
  tenantId: string;
  reportId: string;
  input: Omit<PersistedRealEstateEvidence, 'id' | 'tenantId' | 'reportId' | 'createdAt' | 'storageKey' | 'antivirusStatus'>;
};

export type AttachRealEstateEvidenceCommandResult =
  | { attached: true; reason: 'ATTACHED' }
  | { attached: false; reason: 'FORBIDDEN'; accessReason: AccessDecisionReason }
  | { attached: false; reason: 'NOT_FOUND' }
  | { attached: false; reason: 'UPLOAD_POLICY_BLOCKED'; uploadReason: string };

export type GetRealEstateReportDetailCommand = {
  actor: AccessActor;
  tenantId: string;
  reportId: string;
};

export type RealEstateReportDetailView = RealEstateReportQueueView & {
  notes?: string;
  propertySystem?: string;
  evidences: PersistedRealEstateEvidence[];
};

export type GetRealEstateReportDetailCommandResult =
  | { found: true; report: RealEstateReportDetailView }
  | { found: false; reason: 'FORBIDDEN'; accessReason: AccessDecisionReason }
  | { found: false; reason: 'NOT_FOUND' };

export type GetRealEstateTransitionHistoryCommand = {
  actor: AccessActor;
  tenantId: string;
  reportId: string;
};

export type GetRealEstateTransitionHistoryCommandResult =
  | { found: true; transitions: RealEstateStatusTransitionRecord[] }
  | { found: false; reason: 'FORBIDDEN'; accessReason: AccessDecisionReason }
  | { found: false; reason: 'NOT_FOUND' };

@Injectable()
export class RealEstateApplicationService {
  constructor(
    private readonly accessPolicyService: AccessPolicyService,
    private readonly realEstateWorkflowService: RealEstateWorkflowService,
    @Inject(PrismaRealEstateReportRepository)
    private readonly reportRepository: RealEstateReportWriter,
    @Inject(PrismaRealEstateEvidenceRepository)
    private readonly evidenceRepository: RealEstateEvidenceWriter,
    private readonly evidenceSecurityService: EvidenceSecurityService
  ) {}

  getCatalog() {
    return this.realEstateWorkflowService.getCatalog();
  }

  async searchReports(command: SearchRealEstateReportsCommand): Promise<SearchRealEstateReportsCommandResult> {
    const decision = this.accessPolicyService.authorize({
      actor: command.actor,
      action: 'real-estate.report.search',
      subject: { tenantId: command.tenantId }
    });

    if (!decision.allowed) {
      return { reports: [], reason: 'FORBIDDEN', accessReason: decision.reason };
    }

    const reports = await this.reportRepository.search(command.tenantId, {
      ...command.filters,
      assetIds: this.resolveVisibleAssetIds(command.actor, command.filters?.assetIds)
    });

    const evidences = await this.evidenceRepository.listByReportIds(
      command.tenantId,
      reports.map((r) => r.id)
    );

    const evidencesByReportId = new Map<string, PersistedRealEstateEvidence[]>();
    for (const ev of evidences) {
      const bucket = evidencesByReportId.get(ev.reportId) ?? [];
      bucket.push(ev);
      evidencesByReportId.set(ev.reportId, bucket);
    }

    return {
      reports: reports.map((r) => this.toQueueView(r, evidencesByReportId.get(r.id) ?? []))
    };
  }

  async getStats(command: GetRealEstateStatsCommand): Promise<GetRealEstateStatsCommandResult> {
    if (command.actor.role === 'asset_field_team') {
      return { found: false, reason: 'FORBIDDEN', accessReason: 'ROLE_NOT_ALLOWED' };
    }

    const decision = this.accessPolicyService.authorize({
      actor: command.actor,
      action: 'real-estate.report.search',
      subject: { tenantId: command.tenantId }
    });

    if (!decision.allowed) {
      return { found: false, reason: 'FORBIDDEN', accessReason: decision.reason };
    }

    const stats = await this.reportRepository.getStats(command.tenantId);
    return { found: true, stats };
  }

  async createReport(command: CreateRealEstateReportCommand): Promise<CreateRealEstateReportCommandResult> {
    const decision = this.accessPolicyService.authorize({
      actor: command.actor,
      action: 'real-estate.report.create',
      subject: { tenantId: command.tenantId, assetId: command.input.assetId }
    });

    if (!decision.allowed) {
      return { created: false, reason: 'FORBIDDEN', accessReason: decision.reason };
    }

    const result = this.realEstateWorkflowService.createReport(command.input);

    if (!result.created) {
      return result;
    }

    await this.reportRepository.create(command.tenantId, result.report);
    return result;
  }

  async transitionReport(command: TransitionRealEstateReportCommand): Promise<TransitionRealEstateReportCommandResult> {
    const current = await this.reportRepository.findById(command.tenantId, command.reportId);

    if (!current) return { allowed: false, reason: 'NOT_FOUND' };

    const decision = this.accessPolicyService.authorize({
      actor: command.actor,
      action: 'real-estate.report.transition',
      subject: { tenantId: command.tenantId, assetId: current.assetId }
    });

    if (!decision.allowed) {
      return { allowed: false, reason: 'FORBIDDEN', accessReason: decision.reason };
    }

    const evidences = await this.evidenceRepository.listByReport(command.tenantId, command.reportId);

    const eta = command.input.returnToServiceEta
      ? command.input.returnToServiceEta instanceof Date
        ? command.input.returnToServiceEta
        : new Date(command.input.returnToServiceEta)
      : undefined;

    const result = this.realEstateWorkflowService.transition(
      this.toDomainReport(current),
      { ...command.input, returnToServiceEta: eta },
      evidences.map((e) => e.type)
    );

    if (!result.allowed) return result;

    if (result.report.status === current.status) {
      await this.reportRepository.update(command.tenantId, command.reportId, result.report);
    } else {
      await this.reportRepository.updateStatusWithTransitionHistory(
        command.tenantId,
        command.reportId,
        result.report,
        { fromStatus: current.status, transitionedBy: command.actor.userId, at: new Date() }
      );
    }

    return result;
  }

  async registerComment(command: RegisterRealEstateCommentCommand): Promise<RegisterRealEstateCommentCommandResult> {
    const current = await this.reportRepository.findById(command.tenantId, command.reportId);

    if (!current) return { registered: false, reason: 'NOT_FOUND' };

    const decision = this.accessPolicyService.authorize({
      actor: command.actor,
      action: 'real-estate.report.comment',
      subject: { tenantId: command.tenantId, assetId: current.assetId }
    });

    if (!decision.allowed) {
      return { registered: false, reason: 'FORBIDDEN', accessReason: decision.reason };
    }

    if (!command.input.message.trim()) {
      return { registered: false, reason: 'COMMENT_REQUIRED' };
    }

    const nextReport = this.toDomainReport(current);
    nextReport.notes = appendMaintenanceTicketComment(nextReport.notes, {
      id: `comment-${randomUUID().slice(0, 8)}`,
      author: command.input.commentedBy.trim(),
      message: command.input.message.trim(),
      at: command.input.commentedAt.toISOString()
    });

    const updated = await this.reportRepository.update(command.tenantId, command.reportId, nextReport);

    return {
      registered: true,
      reason: 'REGISTERED',
      notes: typeof updated.notes === 'string' ? updated.notes : undefined
    };
  }

  async attachEvidence(command: AttachRealEstateEvidenceCommand): Promise<AttachRealEstateEvidenceCommandResult> {
    const current = await this.reportRepository.findById(command.tenantId, command.reportId);

    if (!current) return { attached: false, reason: 'NOT_FOUND' };

    const decision = this.accessPolicyService.authorize({
      actor: command.actor,
      action: 'real-estate.evidence.attach',
      subject: { tenantId: command.tenantId, assetId: current.assetId }
    });

    if (!decision.allowed) {
      return { attached: false, reason: 'FORBIDDEN', accessReason: decision.reason };
    }

    const uploadDecision = this.evidenceSecurityService.validateUpload(command.input as never);

    if (!uploadDecision.allowed) {
      return { attached: false, reason: 'UPLOAD_POLICY_BLOCKED', uploadReason: uploadDecision.reason };
    }

    const prepared = this.evidenceSecurityService.prepareEvidenceUpload(command.reportId, command.input as never);
    await this.evidenceRepository.create(command.tenantId, command.reportId, { ...command.input, ...prepared } as never);

    return { attached: true, reason: 'ATTACHED' };
  }

  async getReportDetail(command: GetRealEstateReportDetailCommand): Promise<GetRealEstateReportDetailCommandResult> {
    const current = await this.reportRepository.findById(command.tenantId, command.reportId);

    if (!current) return { found: false, reason: 'NOT_FOUND' };

    const decision = this.accessPolicyService.authorize({
      actor: command.actor,
      action: 'real-estate.report.read',
      subject: { tenantId: command.tenantId, assetId: current.assetId }
    });

    if (!decision.allowed) {
      return { found: false, reason: 'FORBIDDEN', accessReason: decision.reason };
    }

    const evidences = await this.evidenceRepository.listByReport(command.tenantId, command.reportId);

    return {
      found: true,
      report: {
        ...this.toQueueView(current, evidences),
        notes: typeof current.notes === 'string' ? current.notes : undefined,
        propertySystem: typeof current.propertySystem === 'string' ? current.propertySystem : undefined,
        evidences
      }
    };
  }

  async getTransitionHistory(
    command: GetRealEstateTransitionHistoryCommand
  ): Promise<GetRealEstateTransitionHistoryCommandResult> {
    const current = await this.reportRepository.findById(command.tenantId, command.reportId);

    if (!current) return { found: false, reason: 'NOT_FOUND' };

    const decision = this.accessPolicyService.authorize({
      actor: command.actor,
      action: 'real-estate.report.read',
      subject: { tenantId: command.tenantId, assetId: current.assetId }
    });

    if (!decision.allowed) {
      return { found: false, reason: 'FORBIDDEN', accessReason: decision.reason };
    }

    const transitions = await this.reportRepository.listTransitions(command.tenantId, command.reportId);
    return { found: true, transitions };
  }

  private toDomainReport(persisted: PersistedRealEstateReport): RealEstateReport {
    return {
      assetId: persisted.assetId,
      title: persisted.title ?? undefined,
      category: persisted.category,
      priority: persisted.priority,
      description: persisted.description,
      notes: persisted.notes ?? undefined,
      propertySystem: persisted.propertySystem ?? undefined,
      origin: persisted.origin,
      openedBy: persisted.openedBy,
      openedAt: persisted.openedAt,
      status: persisted.status,
      kanbanSubstatus: persisted.kanbanSubstatus ?? undefined,
      blockCount: persisted.blockCount,
      blockReason: persisted.blockReason ?? undefined,
      returnToServiceEta:
        (persisted as Record<string, unknown>).returnToServiceEta instanceof Date
          ? ((persisted as Record<string, unknown>).returnToServiceEta as Date)
          : undefined
    };
  }

  private resolveVisibleAssetIds(actor: AccessActor, requestedAssetIds?: string[]): string[] | undefined {
    if (actor.role !== 'asset_field_team') return requestedAssetIds;
    if (!requestedAssetIds?.length) return actor.assetIds;
    return requestedAssetIds.filter((id) => actor.assetIds.includes(id));
  }

  private toQueueView(
    report: PersistedRealEstateReport,
    evidences: PersistedRealEstateEvidence[]
  ): RealEstateReportQueueView {
    return {
      id: report.id,
      assetId: report.assetId,
      title: report.title?.trim() || report.description,
      category: report.category,
      priority: report.priority,
      origin: report.origin,
      openedBy: report.openedBy,
      openedAt: report.openedAt,
      status: report.status,
      kanbanSubstatus: report.kanbanSubstatus ?? undefined,
      blockCount: report.blockCount,
      blockReason: report.blockReason ?? undefined,
      returnToServiceEta: report.returnToServiceEta ?? undefined,
      updatedAt: report.updatedAt,
      evidenceCount: evidences.length,
      evidenceTypes: [...new Set(evidences.map((e) => e.type))]
    };
  }
}
