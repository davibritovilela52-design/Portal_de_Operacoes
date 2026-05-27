import { Injectable } from '@nestjs/common';

export type AviationStatus =
  | 'pending'
  | 'in_progress'
  | 'return_check'
  | 'grounded'
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
  | 'report_opening'
  | 'diagnostic'
  | 'return_check'
  | 'grounded'
  | 'returned'
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
  | {
      created: true;
      reason: 'CREATED';
      report: AviationReport;
    }
  | {
      created: false;
      reason: 'REQUIRED_FIELDS_MISSING';
      missingFields: string[];
    };

export type TransitionAviationReportInput = {
  toStatus: AviationStatus;
  kanbanSubstatus?: AviationKanbanSubstatus;
  justification?: string;
  groundReason?: AviationGroundReason;
  returnToServiceEta?: Date;
};

export type TransitionAviationReportResult =
  | {
      allowed: true;
      reason: 'ALLOWED';
      escalationRequired: boolean;
      report: AviationReport;
    }
  | {
      allowed: false;
      reason:
        | 'INVALID_STATUS_TRANSITION'
        | 'KANBAN_SUBSTATUS_INVALID'
        | 'GROUND_REASON_REQUIRED';
    }
  | {
      allowed: false;
      reason: 'REQUIRED_EVIDENCE_MISSING';
      missingEvidenceTypes: AviationEvidenceType[];
    };

const aviationStatuses: AviationStatus[] = [
  'pending',
  'in_progress',
  'return_check',
  'grounded',
  'returned',
  'cancelled',
  'reopened'
];

const aviationPriorities: AviationPriority[] = ['P1', 'P2', 'P3', 'P4'];

const defaultKanbanSubstatusByStatus: Record<AviationStatus, AviationKanbanSubstatus> = {
  pending: 'report_opening',
  in_progress: 'diagnostic',
  return_check: 'return_check',
  grounded: 'grounded',
  returned: 'returned',
  cancelled: 'cancelled',
  reopened: 'diagnostic'
};

const statusByKanbanSubstatus: Record<AviationKanbanSubstatus, AviationStatus> = {
  report_opening: 'pending',
  diagnostic: 'in_progress',
  return_check: 'return_check',
  grounded: 'grounded',
  returned: 'returned',
  cancelled: 'cancelled'
};

const requiredEvidenceByStatus: Partial<Record<AviationStatus, AviationEvidenceType[]>> = {
  return_check: ['diagnostic', 'technical_report'],
  returned: ['diagnostic', 'technical_report', 'execution_evidence', 'airworthiness_release']
};

@Injectable()
export class AviationWorkflowService {
  getCatalog(): {
    statuses: AviationStatus[];
    priorities: AviationPriority[];
  } {
    return {
      statuses: [...aviationStatuses],
      priorities: [...aviationPriorities]
    };
  }

  createReport(input: CreateAviationReportInput): CreateAviationReportResult {
    const missingFields = this.getMissingRequiredFields(input);

    if (missingFields.length > 0) {
      return {
        created: false,
        reason: 'REQUIRED_FIELDS_MISSING',
        missingFields
      };
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
    return {
      ...report,
      kanbanSubstatus: this.resolveKanbanSubstatus(report)
    };
  }

  transition(
    report: AviationReport,
    input: TransitionAviationReportInput,
    availableEvidenceTypes: AviationEvidenceType[] = []
  ): TransitionAviationReportResult {
    const currentKanbanSubstatus = this.resolvePersistedKanbanSubstatus(report);
    const statusChanged = input.toStatus !== report.status;
    const kanbanSubstatusChanged =
      !!input.kanbanSubstatus && input.kanbanSubstatus !== currentKanbanSubstatus;
    const etaChanged = input.returnToServiceEta !== undefined;

    if (!statusChanged && !kanbanSubstatusChanged && !etaChanged) {
      return {
        allowed: false,
        reason: 'INVALID_STATUS_TRANSITION'
      };
    }

    if (statusChanged && input.toStatus === 'grounded') {
      if (!input.groundReason) {
        return {
          allowed: false,
          reason: 'GROUND_REASON_REQUIRED'
        };
      }

      const nextGroundCount = report.groundCount + 1;
      const groundedReport = this.applyRequestedKanbanSubstatus(
        this.synchronizeKanbanSubstatus({
          ...report,
          status: 'grounded',
          groundCount: nextGroundCount,
          groundReason: input.groundReason,
          returnToServiceEta: input.returnToServiceEta
        }),
        input.kanbanSubstatus
      );

      if (!groundedReport) {
        return {
          allowed: false,
          reason: 'KANBAN_SUBSTATUS_INVALID'
        };
      }

      return {
        allowed: true,
        reason: 'ALLOWED',
        escalationRequired: nextGroundCount >= 3,
        report: groundedReport
      };
    }

    const missingEvidenceTypes = this.getMissingEvidenceTypes(
      input.toStatus,
      availableEvidenceTypes
    );

    if (missingEvidenceTypes.length > 0) {
      return {
        allowed: false,
        reason: 'REQUIRED_EVIDENCE_MISSING',
        missingEvidenceTypes
      };
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
    const reportWithDefaultKanbanSubstatus = statusChanged
      ? this.synchronizeKanbanSubstatus(nextReport)
      : nextReport;
    const reportWithRequestedKanbanSubstatus = this.applyRequestedKanbanSubstatus(
      reportWithDefaultKanbanSubstatus,
      input.kanbanSubstatus
    );

    if (!reportWithRequestedKanbanSubstatus) {
      return {
        allowed: false,
        reason: 'KANBAN_SUBSTATUS_INVALID'
      };
    }

    return {
      allowed: true,
      reason: 'ALLOWED',
      escalationRequired: false,
      report: reportWithRequestedKanbanSubstatus
    };
  }

  private getMissingRequiredFields(input: CreateAviationReportInput): string[] {
    const missingFields: string[] = [];

    if (!input.assetId?.trim()) {
      missingFields.push('assetId');
    }

    if (!input.category) {
      missingFields.push('category');
    }

    if (!input.priority) {
      missingFields.push('priority');
    }

    if (!input.description?.trim()) {
      missingFields.push('description');
    }

    if (!input.origin) {
      missingFields.push('origin');
    }

    if (!input.openedBy?.trim()) {
      missingFields.push('openedBy');
    }

    if (!(input.openedAt instanceof Date) || Number.isNaN(input.openedAt.getTime())) {
      missingFields.push('openedAt');
    }

    return missingFields;
  }

  private getMissingEvidenceTypes(
    toStatus: AviationStatus,
    availableEvidenceTypes: AviationEvidenceType[]
  ): AviationEvidenceType[] {
    const requiredEvidenceTypes = requiredEvidenceByStatus[toStatus] ?? [];

    return requiredEvidenceTypes.filter(
      (requiredType) => !availableEvidenceTypes.includes(requiredType)
    );
  }

  private resolveKanbanSubstatus(report: AviationReport): AviationKanbanSubstatus {
    return defaultKanbanSubstatusByStatus[report.status];
  }

  private resolvePersistedKanbanSubstatus(report: AviationReport): AviationKanbanSubstatus {
    if (
      report.kanbanSubstatus &&
      this.isKanbanSubstatusCompatible(report.kanbanSubstatus, report.status)
    ) {
      return report.kanbanSubstatus;
    }

    return this.resolveKanbanSubstatus(report);
  }

  private applyRequestedKanbanSubstatus(
    report: AviationReport,
    requestedKanbanSubstatus?: AviationKanbanSubstatus
  ): AviationReport | null {
    if (!requestedKanbanSubstatus) {
      return report;
    }

    if (!this.isKanbanSubstatusCompatible(requestedKanbanSubstatus, report.status)) {
      return null;
    }

    return {
      ...report,
      kanbanSubstatus: requestedKanbanSubstatus
    };
  }

  private isKanbanSubstatusCompatible(
    kanbanSubstatus: AviationKanbanSubstatus,
    status: AviationStatus
  ) {
    const compatibleStatus = status === 'reopened' ? 'in_progress' : status;
    return statusByKanbanSubstatus[kanbanSubstatus] === compatibleStatus;
  }
}
