import { Injectable } from '@nestjs/common';

export type RealEstateStatus =
  | 'pending'
  | 'in_progress'
  | 'blocked'
  | 'under_review'
  | 'resolved'
  | 'cancelled'
  | 'reopened';

export type RealEstateCategory =
  | 'preventive'
  | 'corrective'
  | 'emergency'
  | 'inspection'
  | 'legal'
  | 'renovation';

export type RealEstatePriority = 'P1' | 'P2' | 'P3' | 'P4';

export type RealEstateOrigin =
  | 'asset_field_team'
  | 'real_estate_technical_coordination'
  | 'central_operations';

export type RealEstateBlockReason =
  | 'awaiting_contractor'
  | 'awaiting_authorization'
  | 'awaiting_inspection'
  | 'awaiting_legal';

export type RealEstateEvidenceType =
  | 'diagnostic'
  | 'technical_report'
  | 'execution_evidence'
  | 'legal_document'
  | 'inspection_release';

export type RealEstateKanbanSubstatus =
  | 'report_open'
  | 'report_qualification'
  | 'technical_assessment'
  | 'action_plan'
  | 'service_execution'
  | 'post_service_check'
  | 'property_blocked'
  | 'return_authorization'
  | 'resolved'
  | 'cancelled';

export type RealEstateReport = {
  assetId: string;
  title?: string;
  category: RealEstateCategory;
  priority: RealEstatePriority;
  description: string;
  notes?: string;
  propertySystem?: string;
  origin: RealEstateOrigin;
  openedBy: string;
  openedAt: Date;
  status: RealEstateStatus;
  kanbanSubstatus?: RealEstateKanbanSubstatus;
  blockCount: number;
  blockReason?: RealEstateBlockReason;
  returnToServiceEta?: Date;
};

export type CreateRealEstateReportInput = Omit<
  RealEstateReport,
  'status' | 'kanbanSubstatus' | 'blockCount' | 'blockReason'
>;

export type CreateRealEstateReportResult =
  | { created: true; reason: 'CREATED'; report: RealEstateReport }
  | { created: false; reason: 'REQUIRED_FIELDS_MISSING'; missingFields: string[] };

export type TransitionRealEstateReportInput = {
  toStatus: RealEstateStatus;
  kanbanSubstatus?: RealEstateKanbanSubstatus;
  justification?: string;
  blockReason?: RealEstateBlockReason;
  returnToServiceEta?: Date;
};

export type TransitionRealEstateReportResult =
  | { allowed: true; reason: 'ALLOWED'; report: RealEstateReport }
  | {
      allowed: false;
      reason:
        | 'INVALID_STATUS_TRANSITION'
        | 'JUSTIFICATION_REQUIRED'
        | 'BLOCK_REASON_REQUIRED'
        | 'BLOCK_REASON_INVALID'
        | 'KANBAN_SUBSTATUS_INVALID';
    }
  | { allowed: false; reason: 'REQUIRED_EVIDENCE_MISSING'; missingEvidenceTypes: RealEstateEvidenceType[] };

const realEstateStatuses: RealEstateStatus[] = [
  'pending',
  'in_progress',
  'blocked',
  'under_review',
  'resolved',
  'cancelled',
  'reopened'
];

const realEstatePriorities: RealEstatePriority[] = ['P1', 'P2', 'P3', 'P4'];

const defaultKanbanSubstatusByStatus: Record<RealEstateStatus, RealEstateKanbanSubstatus> = {
  pending: 'report_open',
  in_progress: 'report_qualification',
  blocked: 'property_blocked',
  under_review: 'return_authorization',
  resolved: 'resolved',
  cancelled: 'cancelled',
  reopened: 'report_qualification'
};

const statusByKanbanSubstatus: Record<RealEstateKanbanSubstatus, RealEstateStatus> = {
  report_open: 'pending',
  report_qualification: 'in_progress',
  technical_assessment: 'in_progress',
  action_plan: 'in_progress',
  service_execution: 'in_progress',
  post_service_check: 'in_progress',
  property_blocked: 'blocked',
  return_authorization: 'under_review',
  resolved: 'resolved',
  cancelled: 'cancelled'
};

const allowedTransitions: Record<RealEstateStatus, RealEstateStatus[]> = {
  pending: ['in_progress', 'cancelled'],
  in_progress: ['blocked', 'under_review', 'cancelled'],
  blocked: ['in_progress', 'cancelled'],
  under_review: ['resolved', 'cancelled'],
  resolved: ['reopened'],
  cancelled: ['reopened'],
  reopened: ['in_progress', 'cancelled']
};

const validBlockReasons = new Set<RealEstateBlockReason>([
  'awaiting_contractor',
  'awaiting_authorization',
  'awaiting_inspection',
  'awaiting_legal'
]);

@Injectable()
export class RealEstateWorkflowService {
  getCatalog(): { statuses: RealEstateStatus[]; priorities: RealEstatePriority[] } {
    return { statuses: [...realEstateStatuses], priorities: [...realEstatePriorities] };
  }

  createReport(input: CreateRealEstateReportInput): CreateRealEstateReportResult {
    const missingFields = this.getMissingRequiredFields(input);

    if (missingFields.length > 0) {
      return { created: false, reason: 'REQUIRED_FIELDS_MISSING', missingFields };
    }

    return {
      created: true,
      reason: 'CREATED',
      report: this.synchronizeKanbanSubstatus({
        ...input,
        status: 'pending',
        blockCount: 0
      })
    };
  }

  synchronizeKanbanSubstatus(report: RealEstateReport): RealEstateReport {
    return { ...report, kanbanSubstatus: this.resolveKanbanSubstatus(report) };
  }

  transition(
    report: RealEstateReport,
    input: TransitionRealEstateReportInput,
    availableEvidenceTypes: RealEstateEvidenceType[] = []
  ): TransitionRealEstateReportResult {
    const statusChanged = input.toStatus !== report.status;
    const kanbanSubstatusChanged = !!input.kanbanSubstatus && input.kanbanSubstatus !== report.kanbanSubstatus;
    const etaChanged = input.returnToServiceEta !== undefined;

    if (!statusChanged && !kanbanSubstatusChanged && !etaChanged) {
      return { allowed: false, reason: 'INVALID_STATUS_TRANSITION' };
    }

    if (statusChanged && !allowedTransitions[report.status].includes(input.toStatus)) {
      return { allowed: false, reason: 'INVALID_STATUS_TRANSITION' };
    }

    if (statusChanged && (input.toStatus === 'cancelled' || input.toStatus === 'reopened')) {
      if (!input.justification?.trim()) {
        return { allowed: false, reason: 'JUSTIFICATION_REQUIRED' };
      }
    }

    const missingEvidenceTypes = statusChanged
      ? this.getMissingRequiredEvidenceTypes(input.toStatus, availableEvidenceTypes)
      : [];

    if (missingEvidenceTypes.length > 0) {
      return { allowed: false, reason: 'REQUIRED_EVIDENCE_MISSING', missingEvidenceTypes };
    }

    if (statusChanged && input.toStatus === 'blocked') {
      if (!input.blockReason) {
        return { allowed: false, reason: 'BLOCK_REASON_REQUIRED' };
      }

      if (!validBlockReasons.has(input.blockReason)) {
        return { allowed: false, reason: 'BLOCK_REASON_INVALID' };
      }

      const nextBlockCount = report.blockCount + 1;
      const blockedReport = this.synchronizeKanbanSubstatus({
        ...report,
        status: 'blocked',
        blockCount: nextBlockCount,
        blockReason: input.blockReason,
        returnToServiceEta: input.returnToServiceEta
      });

      return { allowed: true, reason: 'ALLOWED', report: blockedReport };
    }

    const nextReport = statusChanged
      ? {
          ...report,
          status: input.toStatus,
          blockReason: undefined,
          returnToServiceEta:
            input.toStatus === 'resolved' || input.toStatus === 'cancelled'
              ? undefined
              : (input.returnToServiceEta ?? report.returnToServiceEta)
        }
      : {
          ...report,
          returnToServiceEta: input.returnToServiceEta ?? report.returnToServiceEta
        };

    const withDefaultSubstatus = statusChanged ? this.synchronizeKanbanSubstatus(nextReport) : nextReport;

    const withRequestedSubstatus = this.applyRequestedKanbanSubstatus(withDefaultSubstatus, input.kanbanSubstatus);

    if (!withRequestedSubstatus) {
      return { allowed: false, reason: 'KANBAN_SUBSTATUS_INVALID' };
    }

    return { allowed: true, reason: 'ALLOWED', report: withRequestedSubstatus };
  }

  private getMissingRequiredFields(input: CreateRealEstateReportInput): string[] {
    const missing: string[] = [];
    if (!input.assetId?.trim()) missing.push('assetId');
    if (!input.category) missing.push('category');
    if (!input.priority) missing.push('priority');
    if (!input.description?.trim()) missing.push('description');
    if (!input.origin) missing.push('origin');
    if (!input.openedBy?.trim()) missing.push('openedBy');
    if (!(input.openedAt instanceof Date) || Number.isNaN(input.openedAt.getTime())) {
      missing.push('openedAt');
    }
    return missing;
  }

  private getMissingRequiredEvidenceTypes(
    toStatus: RealEstateStatus,
    availableTypes: RealEstateEvidenceType[]
  ): RealEstateEvidenceType[] {
    const available = new Set(availableTypes);
    return this.getRequiredEvidenceTypesForStatus(toStatus).filter((t) => !available.has(t));
  }

  private getRequiredEvidenceTypesForStatus(toStatus: RealEstateStatus): RealEstateEvidenceType[] {
    if (toStatus === 'in_progress') return ['diagnostic'];
    if (toStatus === 'under_review') return ['technical_report'];
    if (toStatus === 'resolved') return ['execution_evidence', 'inspection_release'];
    return [];
  }

  private resolveKanbanSubstatus(report: RealEstateReport): RealEstateKanbanSubstatus {
    return defaultKanbanSubstatusByStatus[report.status];
  }

  private applyRequestedKanbanSubstatus(
    report: RealEstateReport,
    requested?: RealEstateKanbanSubstatus
  ): RealEstateReport | null {
    if (!requested) return report;

    const compatibleStatus = report.status === 'reopened' ? 'in_progress' : report.status;
    if (statusByKanbanSubstatus[requested] !== compatibleStatus) return null;

    return { ...report, kanbanSubstatus: requested };
  }
}
