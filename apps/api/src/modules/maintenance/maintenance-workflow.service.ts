import { Injectable } from '@nestjs/common';

export type MaintenanceStatus =
  | 'pending'
  | 'in_progress'
  | 'frozen'
  | 'payment'
  | 'completed'
  | 'cancelled'
  | 'reopened';

export type MaintenanceCategory =
  | 'preventive'
  | 'corrective'
  | 'emergency'
  | 'improvement'
  | 'inspection';

export type MaintenancePriority = 'P1' | 'P2' | 'P3' | 'P4';

export type MaintenanceUrgency = 'low' | 'medium' | 'high' | 'critical';

export type MaintenanceOrigin =
  | 'asset_field_team'
  | 'yachts_technical_coordination'
  | 'central_operations';

export type MaintenanceSubstep =
  | 'qualificacao_do_chamado'
  | 'diagnostico_presencial'
  | 'orcamento_preliminar'
  | 'definicao_estrategia_absorcao'
  | 'programacao_datas'
  | 'aprovacao_tecnica'
  | 'alocacao_budget'
  | 'preparacao_atendimento'
  | 'realizacao_servico_reparo'
  | 'orcamento_complementar'
  | 'controle_qualidade';

export type FrozenReason =
  | 'awaiting_fiscal_document'
  | 'awaiting_supplier_response'
  | 'awaiting_central_operations_decision'
  | 'awaiting_critical_part'
  | 'awaiting_safe_operational_window';

export type MaintenanceEvidenceType =
  | 'diagnostic'
  | 'financial_document'
  | 'execution_evidence'
  | 'quality_release';

export type MaintenanceKanbanSubstatus =
  | 'call_opening'
  | 'ticket_qualification'
  | 'onsite_diagnosis'
  | 'preliminary_quote'
  | 'absorption_strategy'
  | 'date_scheduling'
  | 'technical_approval'
  | 'budget_allocation'
  | 'service_preparation'
  | 'service_execution'
  | 'complementary_quote'
  | 'quality_control'
  | 'accounts_freeze'
  | 'payment_request'
  | 'payment_scheduling'
  | 'payment_receipt'
  | 'closed_files'
  | 'cancelled';

export type MaintenanceEvidence = {
  type: MaintenanceEvidenceType;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  storageKey: string;
  sha256: string;
  antivirusStatus: 'pending' | 'clean' | 'flagged';
  uploadedBy: string;
  uploadedAt: Date;
};

export type MaintenanceTicket = {
  assetId: string;
  title?: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  urgency?: MaintenanceUrgency;
  description: string;
  notes?: string;
  legacyTicketCode?: string;
  legacyMetadata?: Record<string, unknown>;
  origin: MaintenanceOrigin;
  openedBy: string;
  openedAt: Date;
  status: MaintenanceStatus;
  kanbanSubstatus?: MaintenanceKanbanSubstatus;
  currentSubstep?: MaintenanceSubstep;
  freezeCount: number;
  frozenReason?: FrozenReason;
};

export type CreateMaintenanceTicketInput = Omit<
  MaintenanceTicket,
  'status' | 'kanbanSubstatus' | 'freezeCount' | 'frozenReason'
>;

export type CreateMaintenanceTicketResult =
  | {
      created: true;
      reason: 'CREATED';
      ticket: MaintenanceTicket;
    }
  | {
      created: false;
      reason: 'REQUIRED_FIELDS_MISSING';
      missingFields: string[];
    };

export type TransitionMaintenanceTicketInput = {
  toStatus: MaintenanceStatus;
  kanbanSubstatus?: MaintenanceKanbanSubstatus;
  justification?: string;
  frozenReason?: FrozenReason;
};

export type TransitionMaintenanceTicketResult =
  | {
      allowed: true;
      reason: 'ALLOWED';
      escalationRequired: boolean;
      ticket: MaintenanceTicket;
    }
  | {
      allowed: false;
      reason:
        | 'INVALID_STATUS_TRANSITION'
        | 'KANBAN_SUBSTATUS_INVALID'
        | 'JUSTIFICATION_REQUIRED'
        | 'FROZEN_REASON_REQUIRED'
        | 'FROZEN_REASON_INVALID';
    }
  | {
      allowed: false;
      reason: 'REQUIRED_EVIDENCE_MISSING';
      missingEvidenceTypes: MaintenanceEvidenceType[];
    };

export type UpdateMaintenanceSubstepInput = {
  currentSubstep: MaintenanceSubstep;
};

export type UpdateMaintenanceSubstepResult =
  | {
      allowed: true;
      reason: 'ALLOWED';
      ticket: MaintenanceTicket;
    }
  | {
      allowed: false;
      reason: 'SUBSTEP_NOT_APPLICABLE';
    };

const maintenanceStatuses: MaintenanceStatus[] = [
  'pending',
  'in_progress',
  'frozen',
  'payment',
  'completed',
  'cancelled',
  'reopened'
];

const maintenancePriorities: MaintenancePriority[] = ['P1', 'P2', 'P3', 'P4'];
const maintenanceSubsteps: MaintenanceSubstep[] = [
  'qualificacao_do_chamado',
  'diagnostico_presencial',
  'orcamento_preliminar',
  'definicao_estrategia_absorcao',
  'programacao_datas',
  'aprovacao_tecnica',
  'alocacao_budget',
  'preparacao_atendimento',
  'realizacao_servico_reparo',
  'orcamento_complementar',
  'controle_qualidade'
];
const maintenanceEvidenceTypes: MaintenanceEvidenceType[] = [
  'diagnostic',
  'financial_document',
  'execution_evidence',
  'quality_release'
];
const defaultKanbanSubstatusByStatus: Record<MaintenanceStatus, MaintenanceKanbanSubstatus> = {
  pending: 'call_opening',
  in_progress: 'ticket_qualification',
  frozen: 'accounts_freeze',
  payment: 'payment_request',
  completed: 'closed_files',
  cancelled: 'cancelled',
  reopened: 'ticket_qualification'
};
const kanbanSubstatusBySubstep: Record<MaintenanceSubstep, MaintenanceKanbanSubstatus> = {
  qualificacao_do_chamado: 'ticket_qualification',
  diagnostico_presencial: 'onsite_diagnosis',
  orcamento_preliminar: 'preliminary_quote',
  definicao_estrategia_absorcao: 'absorption_strategy',
  programacao_datas: 'date_scheduling',
  aprovacao_tecnica: 'technical_approval',
  alocacao_budget: 'budget_allocation',
  preparacao_atendimento: 'service_preparation',
  realizacao_servico_reparo: 'service_execution',
  orcamento_complementar: 'complementary_quote',
  controle_qualidade: 'quality_control'
};
const substepByKanbanSubstatus: Partial<Record<MaintenanceKanbanSubstatus, MaintenanceSubstep>> = {
  ticket_qualification: 'qualificacao_do_chamado',
  onsite_diagnosis: 'diagnostico_presencial',
  preliminary_quote: 'orcamento_preliminar',
  absorption_strategy: 'definicao_estrategia_absorcao',
  date_scheduling: 'programacao_datas',
  technical_approval: 'aprovacao_tecnica',
  budget_allocation: 'alocacao_budget',
  service_preparation: 'preparacao_atendimento',
  service_execution: 'realizacao_servico_reparo',
  complementary_quote: 'orcamento_complementar',
  quality_control: 'controle_qualidade'
};
const statusByKanbanSubstatus: Record<MaintenanceKanbanSubstatus, MaintenanceStatus> = {
  call_opening: 'pending',
  ticket_qualification: 'in_progress',
  onsite_diagnosis: 'in_progress',
  preliminary_quote: 'in_progress',
  absorption_strategy: 'in_progress',
  date_scheduling: 'in_progress',
  technical_approval: 'in_progress',
  budget_allocation: 'in_progress',
  service_preparation: 'in_progress',
  service_execution: 'in_progress',
  complementary_quote: 'in_progress',
  quality_control: 'in_progress',
  accounts_freeze: 'frozen',
  payment_request: 'payment',
  payment_scheduling: 'payment',
  payment_receipt: 'payment',
  closed_files: 'completed',
  cancelled: 'cancelled'
};

const validFrozenReasons = new Set<FrozenReason>([
  'awaiting_fiscal_document',
  'awaiting_supplier_response',
  'awaiting_central_operations_decision',
  'awaiting_critical_part',
  'awaiting_safe_operational_window'
]);

const allowedTransitions: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  pending: ['in_progress', 'cancelled'],
  in_progress: ['frozen', 'payment', 'cancelled'],
  frozen: ['in_progress', 'cancelled'],
  payment: ['completed', 'cancelled'],
  completed: ['reopened'],
  cancelled: ['reopened'],
  reopened: ['in_progress', 'cancelled']
};

@Injectable()
export class MaintenanceWorkflowService {
  getCatalog(): {
    statuses: MaintenanceStatus[];
    priorities: MaintenancePriority[];
  } {
    return {
      statuses: [...maintenanceStatuses],
      priorities: [...maintenancePriorities]
    };
  }

  createTicket(input: CreateMaintenanceTicketInput): CreateMaintenanceTicketResult {
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
      ticket: this.synchronizeKanbanSubstatus({
        ...input,
        status: 'pending',
        freezeCount: 0
      })
    };
  }

  synchronizeKanbanSubstatus(ticket: MaintenanceTicket): MaintenanceTicket {
    return {
      ...ticket,
      kanbanSubstatus: this.resolveKanbanSubstatus(ticket)
    };
  }

  updateSubstep(
    ticket: MaintenanceTicket,
    input: UpdateMaintenanceSubstepInput
  ): UpdateMaintenanceSubstepResult {
    if (ticket.status !== 'in_progress') {
      return {
        allowed: false,
        reason: 'SUBSTEP_NOT_APPLICABLE'
      };
    }

    if (!maintenanceSubsteps.includes(input.currentSubstep)) {
      return {
        allowed: false,
        reason: 'SUBSTEP_NOT_APPLICABLE'
      };
    }

    return {
      allowed: true,
      reason: 'ALLOWED',
      ticket: this.synchronizeKanbanSubstatus({
        ...ticket,
        currentSubstep: input.currentSubstep
      })
    };
  }

  transition(
    ticket: MaintenanceTicket,
    input: TransitionMaintenanceTicketInput,
    availableEvidenceTypes: MaintenanceEvidenceType[] = []
  ): TransitionMaintenanceTicketResult {
    const currentKanbanSubstatus = this.resolvePersistedKanbanSubstatus(ticket);
    const statusChanged = input.toStatus !== ticket.status;
    const kanbanSubstatusChanged =
      !!input.kanbanSubstatus && input.kanbanSubstatus !== currentKanbanSubstatus;

    if (!statusChanged && !kanbanSubstatusChanged) {
      return {
        allowed: false,
        reason: 'INVALID_STATUS_TRANSITION'
      };
    }

    if (statusChanged && !allowedTransitions[ticket.status].includes(input.toStatus)) {
      return {
        allowed: false,
        reason: 'INVALID_STATUS_TRANSITION'
      };
    }

    if (statusChanged && (input.toStatus === 'cancelled' || input.toStatus === 'reopened')) {
      if (!input.justification?.trim()) {
        return {
          allowed: false,
          reason: 'JUSTIFICATION_REQUIRED'
        };
      }
    }

    const missingEvidenceTypes = statusChanged
      ? this.getMissingRequiredEvidenceTypes(input.toStatus, availableEvidenceTypes)
      : [];

    if (missingEvidenceTypes.length > 0) {
      return {
        allowed: false,
        reason: 'REQUIRED_EVIDENCE_MISSING',
        missingEvidenceTypes
      };
    }

    if (statusChanged && input.toStatus === 'frozen') {
      if (!input.frozenReason) {
        return {
          allowed: false,
          reason: 'FROZEN_REASON_REQUIRED'
        };
      }

      if (!validFrozenReasons.has(input.frozenReason)) {
        return {
          allowed: false,
          reason: 'FROZEN_REASON_INVALID'
        };
      }

      const nextFreezeCount = ticket.freezeCount + 1;
      const frozenTicket = this.applyRequestedKanbanSubstatus(
        this.synchronizeKanbanSubstatus({
          ...ticket,
          status: 'frozen',
          freezeCount: nextFreezeCount,
          frozenReason: input.frozenReason
        }),
        input.kanbanSubstatus
      );

      if (!frozenTicket) {
        return {
          allowed: false,
          reason: 'KANBAN_SUBSTATUS_INVALID'
        };
      }

      return {
        allowed: true,
        reason: 'ALLOWED',
        escalationRequired: nextFreezeCount >= 3,
        ticket: frozenTicket
      };
    }

    const nextTicket = statusChanged
      ? {
          ...ticket,
          status: input.toStatus,
          frozenReason: undefined
        }
      : {
          ...ticket
        };
    const ticketWithDefaultKanbanSubstatus = statusChanged
      ? this.synchronizeKanbanSubstatus(nextTicket)
      : nextTicket;
    const ticketWithRequestedKanbanSubstatus = this.applyRequestedKanbanSubstatus(
      ticketWithDefaultKanbanSubstatus,
      input.kanbanSubstatus
    );

    if (!ticketWithRequestedKanbanSubstatus) {
      return {
        allowed: false,
        reason: 'KANBAN_SUBSTATUS_INVALID'
      };
    }

    return {
      allowed: true,
      reason: 'ALLOWED',
      escalationRequired: false,
      ticket: ticketWithRequestedKanbanSubstatus
    };
  }

  private getMissingRequiredFields(input: CreateMaintenanceTicketInput): string[] {
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

  private getMissingRequiredEvidenceTypes(
    toStatus: MaintenanceStatus,
    availableEvidenceTypes: MaintenanceEvidenceType[]
  ): MaintenanceEvidenceType[] {
    const available = new Set<MaintenanceEvidenceType>(availableEvidenceTypes);

    return this.getRequiredEvidenceTypesForStatus(toStatus).filter((type) => !available.has(type));
  }

  private getRequiredEvidenceTypesForStatus(
    toStatus: MaintenanceStatus
  ): MaintenanceEvidenceType[] {
    if (toStatus === 'in_progress') {
      return ['diagnostic'];
    }

    if (toStatus === 'payment') {
      return ['financial_document'];
    }

    if (toStatus === 'completed') {
      return ['execution_evidence', 'quality_release'];
    }

    return [];
  }

  private resolveKanbanSubstatus(ticket: MaintenanceTicket): MaintenanceKanbanSubstatus {
    if (ticket.status === 'in_progress' && ticket.currentSubstep) {
      return kanbanSubstatusBySubstep[ticket.currentSubstep];
    }

    return defaultKanbanSubstatusByStatus[ticket.status];
  }

  private resolvePersistedKanbanSubstatus(ticket: MaintenanceTicket): MaintenanceKanbanSubstatus {
    if (
      ticket.kanbanSubstatus &&
      this.isKanbanSubstatusCompatible(ticket.kanbanSubstatus, ticket.status)
    ) {
      return ticket.kanbanSubstatus;
    }

    return this.resolveKanbanSubstatus(ticket);
  }

  private applyRequestedKanbanSubstatus(
    ticket: MaintenanceTicket,
    requestedKanbanSubstatus?: MaintenanceKanbanSubstatus
  ): MaintenanceTicket | null {
    if (!requestedKanbanSubstatus) {
      return ticket;
    }

    if (!this.isKanbanSubstatusCompatible(requestedKanbanSubstatus, ticket.status)) {
      return null;
    }

    if (ticket.status === 'in_progress') {
      const requestedSubstep = substepByKanbanSubstatus[requestedKanbanSubstatus];

      if (!requestedSubstep) {
        return null;
      }

      return this.synchronizeKanbanSubstatus({
        ...ticket,
        currentSubstep: requestedSubstep
      });
    }

    if (ticket.status === 'reopened') {
      return {
        ...ticket,
        kanbanSubstatus: requestedKanbanSubstatus,
        currentSubstep:
          substepByKanbanSubstatus[requestedKanbanSubstatus] ?? ticket.currentSubstep
      };
    }

    return {
      ...ticket,
      kanbanSubstatus: requestedKanbanSubstatus
    };
  }

  private isKanbanSubstatusCompatible(
    kanbanSubstatus: MaintenanceKanbanSubstatus,
    status: MaintenanceStatus
  ) {
    const compatibleStatus = status === 'reopened' ? 'in_progress' : status;
    return statusByKanbanSubstatus[kanbanSubstatus] === compatibleStatus;
  }
}
