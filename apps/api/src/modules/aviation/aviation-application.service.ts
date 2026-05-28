import { randomUUID } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';

import type { AccessActor, AccessDecisionReason } from '../access/access-policy.service.js';
import { AccessPolicyService } from '../access/access-policy.service.js';
import { EvidenceSecurityService } from '../governance/evidence-security.service.js';
import { appendMaintenanceTicketComment } from '../maintenance/maintenance-ticket-comments.js';
import type { AviationEvidenceType, AviationReport, CreateAviationReportInput } from './aviation-workflow.service.js';
import { AviationWorkflowService } from './aviation-workflow.service.js';
import type { AviationEvidenceWriter, PersistedAviationEvidence } from './aviation-evidence.repository.js';
import { PrismaAviationEvidenceRepository } from './aviation-evidence.repository.js';
import type {
  AviationReportWriter,
  AviationStatusTransitionRecord,
  PersistedAviationReport
} from './aviation-report.repository.js';
import { PrismaAviationReportRepository } from './aviation-report.repository.js';

export type AviationReportQueueView = {
  id: string;
  assetId: string;
  title: string;
  category: AviationReport['category'];
  priority: AviationReport['priority'];
  origin: AviationReport['origin'];
  openedBy: string;
  openedAt: Date;
  status: AviationReport['status'];
  kanbanSubstatus?: AviationReport['kanbanSubstatus'];
  groundCount: number;
  groundReason?: AviationReport['groundReason'];
  updatedAt: Date;
  evidenceCount: number;
  evidenceTypes: AviationEvidenceType[];
};

export type SearchAviationReportsCommand = {
  actor: AccessActor;
  tenantId: string;
  filters?: {
    assetIds?: string[];
    statuses?: AviationReport['status'][];
    priorities?: AviationReport['priority'][];
    categories?: AviationReport['category'][];
  };
};

export type SearchAviationReportsCommandResult =
  | { reports: AviationReportQueueView[] }
  | { reports: []; reason: 'FORBIDDEN'; accessReason: AccessDecisionReason };

export type CreateAviationReportCommand = {
  actor: AccessActor;
  tenantId: string;
  input: CreateAviationReportInput;
};

export type CreateAviationReportCommandResult =
  | { created: true; reason: 'CREATED'; report: AviationReport }
  | { created: false; reason: 'FORBIDDEN'; accessReason: AccessDecisionReason }
  | { created: false; reason: 'REQUIRED_FIELDS_MISSING'; missingFields: string[] };

export type TransitionAviationReportCommand = {
  actor: AccessActor;
  tenantId: string;
  reportId: string;
  input: {
    toStatus: AviationReport['status'];
    kanbanSubstatus?: AviationReport['kanbanSubstatus'];
    justification?: string;
    groundReason?: AviationReport['groundReason'];
  };
};

export type TransitionAviationReportCommandResult =
  | { allowed: true; reason: 'ALLOWED'; report: AviationReport }
  | { allowed: false; reason: 'FORBIDDEN'; accessReason: AccessDecisionReason }
  | { allowed: false; reason: 'NOT_FOUND' }
  | { allowed: false; reason: string };

export type RegisterAviationCommentCommand = {
  actor: AccessActor;
  tenantId: string;
  reportId: string;
  input: { message: string; commentedBy: string; commentedAt: Date };
};

export type RegisterAviationCommentCommandResult =
  | { registered: true; reason: 'REGISTERED'; notes?: string }
  | { registered: false; reason: 'FORBIDDEN'; accessReason: AccessDecisionReason }
  | { registered: false; reason: 'NOT_FOUND' | 'COMMENT_REQUIRED' };

export type AttachAviationEvidenceCommand = {
  actor: AccessActor;
  tenantId: string;
  reportId: string;
  input: Omit<PersistedAviationEvidence, 'id' | 'tenantId' | 'reportId' | 'createdAt' | 'storageKey' | 'antivirusStatus'>;
};

export type AttachAviationEvidenceCommandResult =
  | { attached: true; reason: 'ATTACHED' }
  | { attached: false; reason: 'FORBIDDEN'; accessReason: AccessDecisionReason }
  | { attached: false; reason: 'NOT_FOUND' }
  | { attached: false; reason: 'UPLOAD_POLICY_BLOCKED'; uploadReason: string };

export type GetAviationReportDetailCommand = {
  actor: AccessActor;
  tenantId: string;
  reportId: string;
};

export type AviationReportDetailView = AviationReportQueueView & {
  notes?: string;
  aircraftSystem?: string;
  evidences: PersistedAviationEvidence[];
};

export type GetAviationReportDetailCommandResult =
  | { found: true; report: AviationReportDetailView }
  | { found: false; reason: 'FORBIDDEN'; accessReason: AccessDecisionReason }
  | { found: false; reason: 'NOT_FOUND' };

export type GetAviationTransitionHistoryCommand = {
  actor: AccessActor;
  tenantId: string;
  reportId: string;
};

export type GetAviationTransitionHistoryCommandResult =
  | { found: true; transitions: AviationStatusTransitionRecord[] }
  | { found: false; reason: 'FORBIDDEN'; accessReason: AccessDecisionReason }
  | { found: false; reason: 'NOT_FOUND' };

@Injectable()
export class AviationApplicationService {
  constructor(
    private readonly accessPolicyService: AccessPolicyService,
    private readonly aviationWorkflowService: AviationWorkflowService,
    @Inject(PrismaAviationReportRepository)
    private readonly reportRepository: AviationReportWriter,
    @Inject(PrismaAviationEvidenceRepository)
    private readonly evidenceRepository: AviationEvidenceWriter,
    private readonly evidenceSecurityService: EvidenceSecurityService
  ) {}

  getCatalog() {
    return this.aviationWorkflowService.getCatalog();
  }

  async searchReports(command: SearchAviationReportsCommand): Promise<SearchAviationReportsCommandResult> {
    const decision = this.accessPolicyService.authorize({
      actor: command.actor,
      action: 'aviation.report.search',
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

    const evidencesByReportId = new Map<string, PersistedAviationEvidence[]>();
    for (const ev of evidences) {
      const bucket = evidencesByReportId.get(ev.reportId) ?? [];
      bucket.push(ev);
      evidencesByReportId.set(ev.reportId, bucket);
    }

    return {
      reports: reports.map((r) => this.toQueueView(r, evidencesByReportId.get(r.id) ?? []))
    };
  }

  async createReport(command: CreateAviationReportCommand): Promise<CreateAviationReportCommandResult> {
    const decision = this.accessPolicyService.authorize({
      actor: command.actor,
      action: 'aviation.report.create',
      subject: { tenantId: command.tenantId, assetId: command.input.assetId }
    });

    if (!decision.allowed) {
      return { created: false, reason: 'FORBIDDEN', accessReason: decision.reason };
    }

    const result = this.aviationWorkflowService.createReport(command.input);

    if (!result.created) {
      return result;
    }

    await this.reportRepository.create(command.tenantId, result.report);
    return result;
  }

  async transitionReport(command: TransitionAviationReportCommand): Promise<TransitionAviationReportCommandResult> {
    const current = await this.reportRepository.findById(command.tenantId, command.reportId);

    if (!current) return { allowed: false, reason: 'NOT_FOUND' };

    const decision = this.accessPolicyService.authorize({
      actor: command.actor,
      action: 'aviation.report.transition',
      subject: { tenantId: command.tenantId, assetId: current.assetId }
    });

    if (!decision.allowed) {
      return { allowed: false, reason: 'FORBIDDEN', accessReason: decision.reason };
    }

    const evidences = await this.evidenceRepository.listByReport(command.tenantId, command.reportId);

    const result = this.aviationWorkflowService.transition(
      this.toDomainReport(current),
      command.input,
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

  async registerComment(command: RegisterAviationCommentCommand): Promise<RegisterAviationCommentCommandResult> {
    const current = await this.reportRepository.findById(command.tenantId, command.reportId);

    if (!current) return { registered: false, reason: 'NOT_FOUND' };

    const decision = this.accessPolicyService.authorize({
      actor: command.actor,
      action: 'aviation.report.comment',
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

  async attachEvidence(command: AttachAviationEvidenceCommand): Promise<AttachAviationEvidenceCommandResult> {
    const current = await this.reportRepository.findById(command.tenantId, command.reportId);

    if (!current) return { attached: false, reason: 'NOT_FOUND' };

    const decision = this.accessPolicyService.authorize({
      actor: command.actor,
      action: 'aviation.evidence.attach',
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

  async getReportDetail(command: GetAviationReportDetailCommand): Promise<GetAviationReportDetailCommandResult> {
    const current = await this.reportRepository.findById(command.tenantId, command.reportId);

    if (!current) return { found: false, reason: 'NOT_FOUND' };

    const decision = this.accessPolicyService.authorize({
      actor: command.actor,
      action: 'aviation.report.read',
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
        aircraftSystem: typeof current.aircraftSystem === 'string' ? current.aircraftSystem : undefined,
        evidences
      }
    };
  }

  async getTransitionHistory(
    command: GetAviationTransitionHistoryCommand
  ): Promise<GetAviationTransitionHistoryCommandResult> {
    const current = await this.reportRepository.findById(command.tenantId, command.reportId);

    if (!current) return { found: false, reason: 'NOT_FOUND' };

    const decision = this.accessPolicyService.authorize({
      actor: command.actor,
      action: 'aviation.report.read',
      subject: { tenantId: command.tenantId, assetId: current.assetId }
    });

    if (!decision.allowed) {
      return { found: false, reason: 'FORBIDDEN', accessReason: decision.reason };
    }

    const transitions = await this.reportRepository.listTransitions(command.tenantId, command.reportId);
    return { found: true, transitions };
  }

  private toDomainReport(persisted: PersistedAviationReport): AviationReport {
    return {
      assetId: persisted.assetId,
      title: persisted.title ?? undefined,
      category: persisted.category,
      priority: persisted.priority,
      description: persisted.description,
      notes: persisted.notes ?? undefined,
      aircraftSystem: persisted.aircraftSystem ?? undefined,
      origin: persisted.origin,
      openedBy: persisted.openedBy,
      openedAt: persisted.openedAt,
      status: persisted.status,
      kanbanSubstatus: persisted.kanbanSubstatus ?? undefined,
      groundCount: persisted.groundCount,
      groundReason: persisted.groundReason ?? undefined
    };
  }

  private resolveVisibleAssetIds(actor: AccessActor, requestedAssetIds?: string[]): string[] | undefined {
    if (actor.role !== 'asset_field_team') return requestedAssetIds;
    if (!requestedAssetIds?.length) return actor.assetIds;
    return requestedAssetIds.filter((id) => actor.assetIds.includes(id));
  }

  private toQueueView(
    report: PersistedAviationReport,
    evidences: PersistedAviationEvidence[]
  ): AviationReportQueueView {
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
      groundCount: report.groundCount,
      groundReason: report.groundReason ?? undefined,
      updatedAt: report.updatedAt,
      evidenceCount: evidences.length,
      evidenceTypes: [...new Set(evidences.map((e) => e.type))]
    };
  }
}
