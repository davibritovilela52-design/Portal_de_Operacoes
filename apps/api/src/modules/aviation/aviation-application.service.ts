import { Inject, Injectable } from '@nestjs/common';

import {
  AccessActor,
  AccessDecisionReason,
  AccessPolicyService
} from '../access/access-policy.service.js';
import {
  AviationReport,
  AviationWorkflowService,
  CreateAviationReportInput,
  CreateAviationReportResult
} from './aviation-workflow.service.js';
import {
  AviationReportWriter,
  PersistedAviationReport,
  PrismaAviationReportRepository
} from './aviation-report.repository.js';
import {
  AviationEvidenceReader,
  PersistedAviationEvidence,
  PrismaAviationEvidenceRepository
} from './aviation-evidence.repository.js';

export type CreateAviationReportCommand = {
  actor: AccessActor;
  tenantId: string;
  input: CreateAviationReportInput;
};

export type CreateAviationReportCommandResult =
  | CreateAviationReportResult
  | {
      created: false;
      reason: 'FORBIDDEN';
      accessReason: AccessDecisionReason;
    };

export type TransitionAviationReportCommand = {
  actor: AccessActor;
  tenantId: string;
  reportId: string;
  input: {
    toStatus: AviationReport['status'];
    kanbanSubstatus?: AviationReport['kanbanSubstatus'];
    justification?: string;
    groundReason?: AviationReport['groundReason'];
    returnToServiceEta?: Date | string;
  };
};

export type TransitionAviationReportCommandResult =
  | ReturnType<AviationWorkflowService['transition']>
  | {
      allowed: false;
      reason: 'FORBIDDEN';
      accessReason: AccessDecisionReason;
    }
  | {
      allowed: false;
      reason: 'NOT_FOUND';
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

export type AviationReportQueueView = {
  id: string;
  assetId: string;
  title?: string;
  category: AviationReport['category'];
  priority: AviationReport['priority'];
  description: string;
  notes?: string;
  aircraftSystem?: string;
  origin: AviationReport['origin'];
  openedBy: string;
  openedAt: Date;
  status: AviationReport['status'];
  kanbanSubstatus?: AviationReport['kanbanSubstatus'];
  groundCount: number;
  groundReason?: AviationReport['groundReason'];
  returnToServiceEta?: Date;
  updatedAt: Date;
};

export type SearchAviationReportsCommandResult =
  | {
      reports: AviationReportQueueView[];
    }
  | {
      reports: [];
      reason: 'FORBIDDEN';
      accessReason: AccessDecisionReason;
    };

export type GetAviationReportDetailCommand = {
  actor: AccessActor;
  tenantId: string;
  reportId: string;
};

export type AviationReportDetailView = AviationReportQueueView & {
  evidences: PersistedAviationEvidence[];
};

export type GetAviationReportDetailCommandResult =
  | {
      found: true;
      report: AviationReportDetailView;
    }
  | {
      found: false;
      reason: 'FORBIDDEN';
      accessReason: AccessDecisionReason;
    }
  | {
      found: false;
      reason: 'NOT_FOUND';
    };

@Injectable()
export class AviationApplicationService {
  constructor(
    private readonly accessPolicyService: AccessPolicyService,
    private readonly aviationWorkflowService: AviationWorkflowService,
    @Inject(PrismaAviationReportRepository)
    private readonly aviationReportRepository: AviationReportWriter,
    @Inject(PrismaAviationEvidenceRepository)
    private readonly aviationEvidenceRepository: AviationEvidenceReader
  ) {}

  getCatalog(): ReturnType<AviationWorkflowService['getCatalog']> {
    return this.aviationWorkflowService.getCatalog();
  }

  async searchReports(
    command: SearchAviationReportsCommand
  ): Promise<SearchAviationReportsCommandResult> {
    const accessDecision = this.accessPolicyService.authorize({
      actor: command.actor,
      action: 'aviation.report.search',
      subject: {
        tenantId: command.tenantId
      }
    });

    if (!accessDecision.allowed) {
      return {
        reports: [],
        reason: 'FORBIDDEN',
        accessReason: accessDecision.reason
      };
    }

    const reports = await this.aviationReportRepository.search(command.tenantId, {
      ...command.filters,
      assetIds: this.resolveVisibleAssetIds(command.actor, command.filters?.assetIds)
    });

    return {
      reports: reports.map((report) => this.toQueueView(report))
    };
  }

  async createReport(
    command: CreateAviationReportCommand
  ): Promise<CreateAviationReportCommandResult> {
    const accessDecision = this.accessPolicyService.authorize({
      actor: command.actor,
      action: 'aviation.report.create',
      subject: {
        tenantId: command.tenantId,
        assetId: command.input.assetId
      }
    });

    if (!accessDecision.allowed) {
      return {
        created: false,
        reason: 'FORBIDDEN',
        accessReason: accessDecision.reason
      };
    }

    const result = this.aviationWorkflowService.createReport(command.input);

    if (result.created) {
      await this.aviationReportRepository.create(command.tenantId, result.report);
    }

    return result;
  }

  async transitionReport(
    command: TransitionAviationReportCommand
  ): Promise<TransitionAviationReportCommandResult> {
    const current = await this.aviationReportRepository.findById(
      command.tenantId,
      command.reportId
    );

    if (!current) {
      return {
        allowed: false,
        reason: 'NOT_FOUND'
      };
    }

    const accessDecision = this.accessPolicyService.authorize({
      actor: command.actor,
      action: 'aviation.report.transition',
      subject: {
        tenantId: command.tenantId,
        assetId: current.assetId
      }
    });

    if (!accessDecision.allowed) {
      return {
        allowed: false,
        reason: 'FORBIDDEN',
        accessReason: accessDecision.reason
      };
    }

    const eta = command.input.returnToServiceEta
      ? command.input.returnToServiceEta instanceof Date
        ? command.input.returnToServiceEta
        : new Date(command.input.returnToServiceEta)
      : undefined;

    const evidences = await this.aviationEvidenceRepository.listByReport(
      command.tenantId,
      command.reportId
    );
    const result = this.aviationWorkflowService.transition(
      this.toDomainReport(current),
      { ...command.input, returnToServiceEta: eta },
      evidences.map((evidence) => evidence.type)
    );

    if (!result.allowed) {
      return result;
    }

    if (result.report.status === current.status) {
      await this.aviationReportRepository.update(command.tenantId, command.reportId, result.report);
    } else {
      await this.aviationReportRepository.updateStatusWithTransitionHistory(
        command.tenantId,
        command.reportId,
        result.report,
        {
          fromStatus: current.status,
          transitionedBy: command.actor.userId,
          at: new Date()
        }
      );
    }

    return result;
  }

  async getReportDetail(
    command: GetAviationReportDetailCommand
  ): Promise<GetAviationReportDetailCommandResult> {
    const current = await this.aviationReportRepository.findById(
      command.tenantId,
      command.reportId
    );

    if (!current) {
      return {
        found: false,
        reason: 'NOT_FOUND'
      };
    }

    const accessDecision = this.accessPolicyService.authorize({
      actor: command.actor,
      action: 'aviation.report.read',
      subject: {
        tenantId: command.tenantId,
        assetId: current.assetId
      }
    });

    if (!accessDecision.allowed) {
      return {
        found: false,
        reason: 'FORBIDDEN',
        accessReason: accessDecision.reason
      };
    }

    const evidences = await this.aviationEvidenceRepository.listByReport(
      command.tenantId,
      command.reportId
    );

    return {
      found: true,
      report: {
        ...this.toQueueView(current),
        evidences
      }
    };
  }

  private toDomainReport(report: {
    assetId: string;
    title?: string | null;
    category: AviationReport['category'];
    priority: AviationReport['priority'];
    description: string;
    notes?: string | null;
    aircraftSystem?: string | null;
    origin: AviationReport['origin'];
    openedBy: string;
    openedAt: Date;
    status: AviationReport['status'];
    kanbanSubstatus?: AviationReport['kanbanSubstatus'] | null;
    groundCount: number;
    groundReason?: AviationReport['groundReason'] | null;
  }): AviationReport {
    return {
      assetId: report.assetId,
      title: report.title ?? undefined,
      category: report.category,
      priority: report.priority,
      description: report.description,
      notes: report.notes ?? undefined,
      aircraftSystem: report.aircraftSystem ?? undefined,
      origin: report.origin,
      openedBy: report.openedBy,
      openedAt: report.openedAt,
      status: report.status,
      kanbanSubstatus: report.kanbanSubstatus ?? undefined,
      groundCount: report.groundCount,
      groundReason: report.groundReason ?? undefined,
      returnToServiceEta:
        (report as Record<string, unknown>).returnToServiceEta instanceof Date
          ? ((report as Record<string, unknown>).returnToServiceEta as Date)
          : undefined
    };
  }

  private resolveVisibleAssetIds(
    actor: AccessActor,
    requestedAssetIds?: string[]
  ): string[] | undefined {
    if (actor.role !== 'asset_field_team') {
      return requestedAssetIds;
    }

    if (!requestedAssetIds?.length) {
      return actor.assetIds;
    }

    return requestedAssetIds.filter((assetId) => actor.assetIds.includes(assetId));
  }

  private toQueueView(report: PersistedAviationReport): AviationReportQueueView {
    return {
      id: report.id,
      assetId: report.assetId,
      title: report.title ?? undefined,
      category: report.category,
      priority: report.priority,
      description: report.description,
      notes: report.notes ?? undefined,
      aircraftSystem: report.aircraftSystem ?? undefined,
      origin: report.origin,
      openedBy: report.openedBy,
      openedAt: report.openedAt,
      status: report.status,
      kanbanSubstatus: report.kanbanSubstatus ?? undefined,
      groundCount: report.groundCount,
      groundReason: report.groundReason ?? undefined,
      returnToServiceEta: report.returnToServiceEta ?? undefined,
      updatedAt: report.updatedAt
    };
  }
}
