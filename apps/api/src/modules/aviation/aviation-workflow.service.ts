import { Injectable } from '@nestjs/common';

export type AviationStatus =
  | 'pending'
  | 'in_progress'
  | 'grounded'
  | 'return_check'
  | 'returned'
  | 'cancelled'
  | 'reopened';

export type AviationCategory =
  | 'preventive'
  | 'corrective'
  | 'emergency'
  | 'inspection'
  | 'airworthiness';

export type AviationPriority = 'P1' | 'P2' | 'P3' | 'P4';

export type AviationOrigin =
  | 'asset_field_team'
  | 'aviation_technical_coordination'
  | 'central_operations';

export type AviationGroundReason =
  | 'awaiting_part'
  | 'awaiting_authorization'
  | 'awaiting_maintenance_crew'
  | 'awaiting_operational_window';

export type AviationEvidenceType =
  | 'diagnostic'
  | 'technical_report'
  | 'execution_evidence'
  | 'airworthiness_release';

export type AviationKanbanSubstatus =
  | 'report_open'
  | 'report_qualification'
  | 'technical_assessment'
  | 'action_plan'
  | 'service_execution'
  | 'post_service_check'
  | 'aog_hold'
  | 'return_authorization'
  | 'returned_to_service'
  | 'cancelled';

export type AviationReport = {
  assetId: string;
  title?: string;
  category: AviationCategory;
  priority: AviationPriority;
  description: string;
  notes?: string;
  aircraftSystem?: string;
  origin: AviationOrigin;
  openedBy: string;
  openedAt: Date;
  status: AviationStatus;
  kanbanSubstatus?: AviationKanbanSubstatus;
  groundCount: number;
  groundReason?: AviationGroundReason;
  returnToServiceEta?: Date;
};

export type CreateAviationReportInput = Omit<
  AviationReport,
  'status' | 'kanbanSubstatus' | 'groundCount' | 'groundReason'
>;

export type CreateAviationReportResult =
  | { created: true; reason: 'CREATED'; report: AviationReport }
  | { created: false; reason: 'REQUIRED_FIELDS_MISSING'; missingFields: string[] };

export type TransitionAviationReportInput = {
  toStatus: AviationStatus;
  kanbanSubstatus?: AviationKanbanSubstatus;
  justification?: string;
  groundReason?: AviationGroundReason;
  returnToServiceEta?: Date;
};

export type TransitionAviationReportResult =
  | { allowed: true; reason: 'ALLOWED'; report: AviationReport }
  | {
      allowed: false;
      reason:
        | 'INVALID_STATUS_TRANSITION'
        | 'JUSTIFICATION_REQUIRED'
        | 'GROUND_REASON_REQUIRED'
        | 'GROUND_REASON_INVALID'
        | 'KANBAN_SUBSTATUS_INVALID';
    }
  | { allowed: false; reason: 'REQUIRED_EVIDENCE_MISSING'; missingEvidenceTypes: AviationEvidenceType[] };

const aviationStatuses: AviationStatus[] = [
  'pending',
  'in_progress',
  'grounded',
  'return_check',
  'returned',
  'cancelled',
  'reopened'
];

const aviationPriorities: AviationPriority[] = ['P1', 'P2', 'P3', 'P4'];

const defaultKanbanSubstatusByStatus: Record<AviationStatus, AviationKanbanSubstatus> = {
  pending: 'report_open',
  in_progress: 'report_qualification',
  grounded: 'aog_hold',
  return_check: 'return_authorization',
  returned: 'returned_to_service',
  cancelled: 'cancelled',
  reopened: 'report_qualification'
};

const statusByKanbanSubstatus: Record<AviationKanbanSubstatus, AviationStatus> = {
  report_open: 'pending',
  report_qualification: 'in_progress',
  technical_assessment: 'in_progress',
  action_plan: 'in_progress',
  service_execution: 'in_progress',
  post_service_check: 'in_progress',
  aog_hold: 'grounded',
  return_authorization: 'return_check',
  returned_to_service: 'returned',
  cancelled: 'cancelled'
};

const allowedTransitions: Record<AviationStatus, AviationStatus[]> = {
  pending: ['in_progress', 'cancelled'],
  in_progress: ['grounded', 'return_check', 'cancelled'],
  grounded: ['in_progress', 'cancelled'],
  return_check: ['returned', 'cancelled'],
  returned: ['reopened'],
  cancelled: ['reopened'],
  reopened: ['in_progress', 'cancelled']
};

const validGroundReasons = new Set<AviationGroundReason>([
  'awaiting_part',
  'awaiting_authorization',
  'awaiting_maintenance_crew',
  'awaiting_operational_window'
]);

@Injectable()
export class AviationWorkflowService {
  getCatalog(): { statuses: AviationStatus[]; priorities: AviationPriority[] } {
    return { statuses: [...aviationStatuses], priorities: [...aviationPriorities] };
  }

  createReport(input: CreateAviationReportInput): CreateAviationReportResult {
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
        groundCount: 0
      })
    };
  }

  synchronizeKanbanSubstatus(report: AviationReport): AviationReport {
    return { ...report, kanbanSubstatus: this.resolveKanbanSubstatus(report) };
  }

  transition(
    report: AviationReport,
    input: TransitionAviationReportInput,
    availableEvidenceTypes: AviationEvidenceType[] = []
  ): TransitionAviationReportResult {
    const statusChanged = input.toStatus !== report.status;
    const kanbanSubstatusChanged =
      !!input.kanbanSubstatus && input.kanbanSubstatus !== report.kanbanSubstatus;
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

    if (statusChanged && input.toStatus === 'grounded') {
      if (!input.groundReason) {
        return { allowed: false, reason: 'GROUND_REASON_REQUIRED' };
      }

      if (!validGroundReasons.has(input.groundReason)) {
        return { allowed: false, reason: 'GROUND_REASON_INVALID' };
      }

      const nextGroundCount = report.groundCount + 1;
      const groundedReport = this.synchronizeKanbanSubstatus({
        ...report,
        status: 'grounded',
        groundCount: nextGroundCount,
        groundReason: input.groundReason,
        returnToServiceEta: input.returnToServiceEta
      });

      return { allowed: true, reason: 'ALLOWED', report: groundedReport };
    }

    const nextReport = statusChanged
      ? {
          ...report,
          status: input.toStatus,
          groundReason: undefined,
          returnToServiceEta:
            input.toStatus === 'returned' || input.toStatus === 'cancelled'
              ? undefined
              : (input.returnToServiceEta ?? report.returnToServiceEta)
        }
      : {
          ...report,
          returnToServiceEta: input.returnToServiceEta ?? report.returnToServiceEta
        };

    const withDefaultSubstatus = statusChanged
      ? this.synchronizeKanbanSubstatus(nextReport)
      : nextReport;

    const withRequestedSubstatus = this.applyRequestedKanbanSubstatus(
      withDefaultSubstatus,
      input.kanbanSubstatus
    );

    if (!withRequestedSubstatus) {
      return { allowed: false, reason: 'KANBAN_SUBSTATUS_INVALID' };
    }

    return { allowed: true, reason: 'ALLOWED', report: withRequestedSubstatus };
  }

  private getMissingRequiredFields(input: CreateAviationReportInput): string[] {
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
    toStatus: AviationStatus,
    availableTypes: AviationEvidenceType[]
  ): AviationEvidenceType[] {
    const available = new Set(availableTypes);
    return this.getRequiredEvidenceTypesForStatus(toStatus).filter((t) => !available.has(t));
  }

  private getRequiredEvidenceTypesForStatus(toStatus: AviationStatus): AviationEvidenceType[] {
    if (toStatus === 'in_progress') return ['diagnostic'];
    if (toStatus === 'return_check') return ['technical_report'];
    if (toStatus === 'returned') return ['execution_evidence', 'airworthiness_release'];
    return [];
  }

  private resolveKanbanSubstatus(report: AviationReport): AviationKanbanSubstatus {
    return defaultKanbanSubstatusByStatus[report.status];
  }

  private applyRequestedKanbanSubstatus(
    report: AviationReport,
    requested?: AviationKanbanSubstatus
  ): AviationReport | null {
    if (!requested) return report;

    const compatibleStatus = report.status === 'reopened' ? 'in_progress' : report.status;
    if (statusByKanbanSubstatus[requested] !== compatibleStatus) return null;

    return { ...report, kanbanSubstatus: requested };
  }
}
