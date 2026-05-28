import {
  accessUsers as defaultAccessUsers,
  agendaEvents as defaultAgendaEvents,
  auditRecords as defaultAuditRecords,
  cutoverGates as defaultCutoverGates,
  fleetAssets as defaultFleetAssets,
  maintenanceCosts as defaultMaintenanceCosts,
  maintenanceDetails as defaultMaintenanceDetails,
  maintenanceTickets as defaultMaintenanceTickets,
  type AuditRecord,
  type AssetRecord,
  type MaintenanceDetailRecord
} from './portal-data';
import { parseMaintenanceNotesDocument } from './maintenance-comments';
import {
  canViewAccessModule,
  type MaintenanceKanbanSubstatus,
  portalRoleLabels,
  type AccessUserRecord,
  type AssetModality,
  type AgendaEventRecord,
  type AviationCategory,
  type AviationKanbanSubstatus,
  type AviationPriority,
  type AviationReportRecord,
  type AviationStatus,
  type MaintenanceCategory,
  type MaintenanceCostRecord,
  type MaintenanceSystem,
  type MaintenanceTicketRecord,
  type MaintenanceUrgency,
  type PortalRole
} from './portal-model';

type ReviewCadence = 'monthly' | 'quarterly';

type AccessAssignmentApiRecord = {
  id: string;
  tenantId: string;
  userId: string;
  displayName: string;
  email: string;
  role: PortalRole;
  assetIds: string[];
  mfaEnabled: boolean;
  lastReviewedAt: string | Date;
  revokedAt: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  mfaRequired: boolean;
  mfaCompliant: boolean;
  reviewCadence: ReviewCadence;
  reviewDue: boolean;
};

type AssetRegistryApiRecord = {
  id: string;
  tenantId: string;
  assetId: string;
  displayName: string;
  modality: AssetModality;
  legacyAssetId?: string | null;
  timezone: string;
  active: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
};

type MaintenanceEvidenceType =
  | 'diagnostic'
  | 'financial_document'
  | 'execution_evidence'
  | 'quality_release';

type MaintenanceStatus =
  | 'pending'
  | 'in_progress'
  | 'frozen'
  | 'payment'
  | 'completed'
  | 'cancelled'
  | 'reopened';

type MaintenanceOrigin =
  | 'asset_field_team'
  | 'yachts_technical_coordination'
  | 'central_operations';

type PersistedMaintenanceCategory =
  | 'preventive'
  | 'corrective'
  | 'emergency'
  | 'improvement'
  | 'inspection';

type FrozenReason =
  | 'awaiting_fiscal_document'
  | 'awaiting_supplier_response'
  | 'awaiting_central_operations_decision'
  | 'awaiting_critical_part'
  | 'awaiting_safe_operational_window';

type MaintenanceEvidenceApiRecord = {
  id: string;
  tenantId: string;
  ticketId: string;
  type: MaintenanceEvidenceType;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  storageKey: string;
  sha256: string;
  antivirusStatus: 'pending' | 'clean' | 'flagged';
  uploadedBy: string;
  uploadedAt: string | Date;
  createdAt: string | Date;
};

type MaintenanceStatusTransitionApiRecord = {
  fromStatus?: MaintenanceStatus | null;
  toStatus: MaintenanceStatus;
  at: string | Date;
};

type MaintenanceTicketQueueApiRecord = {
  id: string;
  legacyRowId?: string | null;
  assetId: string;
  title?: string | null;
  category: MaintenanceCategory;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  urgency?: MaintenanceUrgency | null;
  description: string;
  maintenanceSystem?: MaintenanceSystem | null;
  notes?: string | null;
  legacyTicketCode?: string | null;
  origin: MaintenanceOrigin;
  openedBy: string;
  openedAt: string | Date;
  status: MaintenanceStatus;
  kanbanSubstatus?: MaintenanceKanbanSubstatus | null;
  completedAt?: string | Date | null;
  firstInProgressAt?: string | Date | null;
  statusHistory?: MaintenanceStatusTransitionApiRecord[] | null;
  freezeCount: number;
  frozenReason?: FrozenReason | null;
  updatedAt: string | Date;
  evidenceCount: number;
  evidenceTypes: MaintenanceEvidenceType[];
};

type MaintenanceTicketDetailApiRecord = MaintenanceTicketQueueApiRecord & {
  evidences: MaintenanceEvidenceApiRecord[];
};

type MaintenanceCostApiRecord = {
  id: string;
  assetId: string;
  maintenanceTicketId: string;
  supplierId?: string | null;
  description: string;
  amount: number;
  currency: string;
  registeredAt: string | Date;
};

type AgendaEventApiRecord = {
  id: string;
  assetId: string;
  type: 'utilization' | 'planned_maintenance' | 'emergency_maintenance' | 'operational_block' | 'crew_rest';
  title?: string | null;
  description?: string | null;
  startsAt: string | Date;
  endsAt: string | Date;
  safeMinimumBreached: boolean;
  provisional: boolean;
  validatedAt: string | Date | null;
  updatedAt: string | Date;
};

type AuditLedgerApiRecord = {
  id: string;
  type: 'decision_memo' | 'rectification';
  title: string;
  summary: string;
  actor: string;
  at: string | Date;
  assetId?: string | null;
  aggregateType?: string | null;
  aggregateId?: string | null;
  status?: string | null;
  recordId?: string | null;
  sourceVersion?: number | null;
  targetVersion?: number | null;
};

type CutoverApprovalApiRecord = {
  approved: boolean;
  approvedBy: string | null;
  approvedAt: string | Date | null;
};

type CutoverEntityCountApiRecord = {
  entity: string;
  sourceCount: number;
  migratedCount: number;
};

type CutoverEvidenceApiRecord = {
  id: string;
  type: string;
  title: string;
  detail: string;
  reference: string;
  valid: boolean;
  createdAt: string | Date;
};

type CutoverCheckpointApiRecord = {
  id: string;
  checkpoint: 'T+1' | 'T+4' | 'T+24';
  status: 'pending' | 'completed' | 'blocked';
  notes: string;
  recordedBy: string;
  recordedAt: string | Date;
};

type CutoverRunApiRecord = {
  id: string;
  tenantId: string;
  label: string;
  status: 'draft' | 'approved' | 'blocked' | 'completed';
  goLiveDecision: 'go' | 'no_go' | null;
  decisionAt: string | Date | null;
  decidedBy: string | null;
  futureAgendaDaysMigrated: number;
  finalFreezeApplied: boolean;
  invalidCriticalAttachmentIds: string[];
  approvals: {
    centralOperations: CutoverApprovalApiRecord;
    technicalCoordination: CutoverApprovalApiRecord;
    portalAdmin: CutoverApprovalApiRecord;
  };
  lastEvaluationApproved: boolean | null;
  lastEvaluationBlockers: Array<Record<string, unknown>>;
  entityCounts: CutoverEntityCountApiRecord[];
  evidences: CutoverEvidenceApiRecord[];
  checkpoints: CutoverCheckpointApiRecord[];
  createdBy: string;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type FrontendActor = {
  userId: string;
  tenantId: string;
  role: PortalRole;
  assetIds: string[];
};

export type CutoverRunRecord = {
  id: string;
  label: string;
  status: CutoverRunApiRecord['status'];
  goLiveDecision: CutoverRunApiRecord['goLiveDecision'];
  futureAgendaDaysMigrated: number;
  finalFreezeApplied: boolean;
  invalidCriticalAttachmentIds: string[];
  approvals: {
    centralOperations: CutoverApprovalApiRecord;
    technicalCoordination: CutoverApprovalApiRecord;
    portalAdmin: CutoverApprovalApiRecord;
  };
  entityCounts: CutoverEntityCountApiRecord[];
  gate: {
    approved: boolean;
    blockers: Array<Record<string, unknown>>;
  };
  evidences: Array<{
    id: string;
    type: string;
    title: string;
    detail: string;
    reference: string;
    valid: boolean;
    createdAt: string;
  }>;
  checkpoints: Array<{
    id: string;
    checkpoint: 'T+1' | 'T+4' | 'T+24';
    status: 'pending' | 'completed' | 'blocked';
    notes: string;
    recordedBy: string;
    recordedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type CreateMaintenanceTicketRequest = {
  actor: FrontendActor;
  input: {
    assetId: string;
    title?: string;
    category: PersistedMaintenanceCategory;
    priority: MaintenanceTicketQueueApiRecord['priority'];
    description: string;
    legacyMetadata?: Record<string, unknown>;
    notes?: string;
    origin: MaintenanceOrigin;
    openedBy: string;
    openedAt: string | Date;
  };
};

export type TransitionMaintenanceTicketRequest = {
  actor: FrontendActor;
  ticketId: string;
  input: {
    toStatus: MaintenanceStatus;
    kanbanSubstatus?: MaintenanceKanbanSubstatus;
    justification?: string;
    frozenReason?: FrozenReason;
  };
};

export type AttachMaintenanceEvidenceRequest = {
  actor: FrontendActor;
  ticketId: string;
  input: {
    type: MaintenanceEvidenceType;
    fileName: string;
    mimeType: string;
    fileSizeBytes: number;
    sha256: string;
    uploadedBy: string;
    uploadedAt: string | Date;
  };
};

export type RegisterMaintenanceCommentRequest = {
  actor: FrontendActor;
  ticketId: string;
  input: {
    message: string;
    commentedBy: string;
    commentedAt: string | Date;
  };
};

export type ScheduleAgendaEventRequest = {
  actor: FrontendActor;
  candidateEvent: {
    id?: string;
    assetId: string;
    type: AgendaEventApiRecord['type'];
    title?: string;
    description?: string;
    startsAt: string | Date;
    endsAt: string | Date;
    safeMinimumBreached?: boolean;
    provisional?: boolean;
    validatedAt?: string | Date | null;
  };
};

export type RescheduleAgendaEventRequest = {
  actor: FrontendActor;
  eventId: string;
  updatedEvent: {
    id?: string;
    assetId: string;
    type: AgendaEventApiRecord['type'];
    title?: string;
    description?: string;
    startsAt: string | Date;
    endsAt: string | Date;
    safeMinimumBreached?: boolean;
    provisional?: boolean;
    validatedAt?: string | Date | null;
  };
};

export type DeleteAgendaEventRequest = {
  actor: FrontendActor;
  eventId: string;
};

export type CreateDecisionMemoRequest = {
  actor: FrontendActor;
  action: string;
  aggregateType: string;
  aggregateId: string;
  assetId?: string;
  justification: {
    context: string;
    decision: string;
    decidedBy: string;
    alternativesConsidered: string[];
    expectedImpact: string;
  };
};

export type CreateRectificationRequest = {
  actor: FrontendActor;
  record: {
    recordId: string;
    status: 'completed' | 'open';
    version: number;
  };
  input: {
    changedBy: string;
    reason: string;
    afterSnapshot: Record<string, unknown>;
  };
};

export type UpsertAccessAssignmentRequest = {
  actor: FrontendActor;
  assignmentId?: string;
  input: {
    userId: string;
    displayName: string;
    email: string;
    role: PortalRole;
    assetIds: string[];
    mfaEnabled: boolean;
    lastReviewedAt: string | Date;
    revokedAt?: string | Date;
  };
};

export type RevokeAccessAssignmentRequest = {
  actor: FrontendActor;
  assignmentId: string;
  requestedAt: string | Date;
  removedAt: string | Date;
};

export type UpsertCutoverRunRequest = {
  actor: FrontendActor;
  runId?: string;
  input: {
    label: string;
    futureAgendaDaysMigrated: number;
    finalFreezeApplied: boolean;
    invalidCriticalAttachmentIds: string[];
    approvals: {
      centralOperations: CutoverApprovalApiRecord;
      technicalCoordination: CutoverApprovalApiRecord;
      portalAdmin: CutoverApprovalApiRecord;
    };
    entityCounts: CutoverEntityCountApiRecord[];
    evidences: Array<{
      type: string;
      title: string;
      detail: string;
      reference: string;
      valid: boolean;
    }>;
  };
};

export type RecordCutoverCheckpointRequest = {
  actor: FrontendActor;
  runId: string;
  input: {
    checkpoint: 'T+1' | 'T+4' | 'T+24';
    status: 'pending' | 'completed' | 'blocked';
    notes: string;
  };
};

export type EvaluateCutoverRunRequest = {
  actor: FrontendActor;
  runId: string;
};

export type RecordCutoverDecisionRequest = {
  actor: FrontendActor;
  runId: string;
  input: {
    decision: 'go' | 'no_go';
  };
};

export type CreateMaintenanceTicketResponse =
  | {
      created: true;
      reason: 'CREATED';
      ticket: Record<string, unknown>;
    }
  | {
      created: false;
      reason: string;
      accessReason?: string;
      missingFields?: string[];
    };

export type TransitionMaintenanceTicketResponse =
  | {
      allowed: true;
      reason: string;
      escalationRequired?: boolean;
      ticket: Record<string, unknown>;
    }
  | {
      allowed: false;
      reason: string;
      accessReason?: string;
      missingEvidenceTypes?: string[];
    };

export type AttachMaintenanceEvidenceResponse =
  | {
      attached: true;
      reason: 'ATTACHED';
      evidence: Record<string, unknown>;
    }
  | {
      attached: false;
      reason: string;
      accessReason?: string;
      uploadReason?: string;
    };

export type RegisterMaintenanceCommentResponse =
  | {
      registered: true;
      reason: 'REGISTERED';
      notes?: string;
    }
  | {
      registered: false;
      reason: string;
      accessReason?: string;
    };

export type ScheduleAgendaEventResponse =
  | {
      allowed: true;
      reason: string;
      event: Record<string, unknown>;
    }
  | {
      allowed: false;
      reason: string;
      accessReason?: string;
      conflictingEventId?: string;
    };

export type RescheduleAgendaEventResponse =
  | {
      allowed: true;
      reason: string;
      event: Record<string, unknown>;
    }
  | {
      allowed: false;
      reason: string;
      accessReason?: string;
      conflictingEventId?: string;
    };

export type DeleteAgendaEventResponse =
  | {
      allowed: true;
      reason: 'DELETED';
    }
  | {
      allowed: false;
      reason: 'FORBIDDEN' | 'NOT_FOUND';
      accessReason?: string;
    };

export type CreateDecisionMemoResponse =
  | {
      confirmed: true;
      memo: Record<string, unknown>;
    }
  | {
      confirmed: false;
      reason: string;
      accessReason?: string;
    };

export type CreateRectificationResponse =
  | {
      created: true;
      reason: string;
      rectification: Record<string, unknown>;
    }
  | {
      created: false;
      reason: string;
      accessReason?: string;
      missingFields?: string[];
    };

export type UpsertAccessAssignmentResponse =
  | {
      updated: true;
      reason: 'UPSERTED';
      assignment: AccessAssignmentApiRecord;
    }
  | {
      updated: false;
      reason: string;
      accessReason?: string;
    };

export type RevokeAccessAssignmentResponse =
  | {
      revoked: true;
      reason: 'REVOKED';
      assignment: AccessAssignmentApiRecord;
      evaluation: {
        breach: boolean;
        elapsedMinutes: number;
        slaMinutes: number;
      };
    }
  | {
      revoked: false;
      reason: string;
      accessReason?: string;
    };

export type UpsertCutoverRunResponse =
  | {
      saved: true;
      run: CutoverRunApiRecord;
    }
  | {
      saved: false;
      reason: 'FORBIDDEN';
      accessReason?: string;
    };

export type RecordCutoverCheckpointResponse =
  | {
      recorded: true;
      checkpoint: CutoverCheckpointApiRecord;
    }
  | {
      recorded: false;
      reason: 'FORBIDDEN' | 'NOT_FOUND';
      accessReason?: string;
    };

export type EvaluateCutoverRunResponse =
  | {
      approved: boolean;
      blockers: Array<Record<string, unknown>>;
      run: CutoverRunApiRecord;
    }
  | {
      approved: false;
      blockers: [];
      reason: 'FORBIDDEN' | 'NOT_FOUND';
      accessReason?: string;
    };

export type RecordCutoverDecisionResponse =
  | {
      decided: true;
      decision: 'go' | 'no_go';
      legacyPortalMode: 'read_only' | 'read_write';
      run: CutoverRunApiRecord;
    }
  | {
      decided: false;
      reason: 'FORBIDDEN' | 'NOT_FOUND' | 'GO_LIVE_BLOCKED';
      accessReason?: string;
      blockers?: Array<Record<string, unknown>>;
    };

type AssetRegistryListResponse =
  | {
      assets: AssetRegistryApiRecord[];
    }
  | {
      assets: [];
      reason: 'FORBIDDEN';
    };

type AccessAssignmentsListResponse =
  | {
      assignments: AccessAssignmentApiRecord[];
    }
  | {
      assignments: [];
      reason: 'FORBIDDEN';
      accessReason: string;
    };

type MaintenanceSearchResponse =
  | {
      tickets: MaintenanceTicketQueueApiRecord[];
    }
  | {
      tickets: [];
      reason: 'FORBIDDEN';
      accessReason: string;
    };

type MaintenanceSummaryResponse =
  | {
      costs: MaintenanceCostApiRecord[];
    }
  | {
      costs: [];
      reason: 'FORBIDDEN';
      accessReason: string;
    };

type MaintenanceDetailResponse =
  | {
      found: true;
      ticket: MaintenanceTicketDetailApiRecord;
    }
  | {
      found: false;
      reason: 'FORBIDDEN' | 'NOT_FOUND';
      accessReason?: string;
    };

type AgendaSearchResponse =
  | {
      events: AgendaEventApiRecord[];
    }
  | {
      events: [];
      reason: 'FORBIDDEN';
      accessReason: string;
    };

type AuditLedgerSearchResponse = {
  entries: AuditLedgerApiRecord[];
};

type CutoverRunSearchResponse =
  | {
      runs: CutoverRunApiRecord[];
    }
  | {
      runs: [];
      reason: 'FORBIDDEN';
      accessReason?: string;
    };

type CutoverRunDetailResponse =
  | {
      found: true;
      run: CutoverRunApiRecord;
    }
  | {
      found: false;
      reason: 'FORBIDDEN' | 'NOT_FOUND';
      accessReason?: string;
    };

type LegacyPortalWritePolicyResponse =
  | {
      allowed: true;
      reason: 'ALLOWED';
    }
  | {
      allowed: false;
      reason: 'LEGACY_PORTAL_READ_ONLY';
    };

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
type DomainSource = 'api' | 'mock';

export type PortalSnapshot = {
  source: DomainSource;
  fleetAssets: AssetRecord[];
  accessUsers: AccessUserRecord[];
};

export type PortalOperationsSnapshot = {
  source: 'api' | 'mock' | 'mixed';
  fleetAssets: AssetRecord[];
  accessUsers: AccessUserRecord[];
  maintenanceTickets: MaintenanceTicketRecord[];
  maintenanceCosts: MaintenanceCostRecord[];
  agendaEvents: AgendaEventRecord[];
};

export type MaintenanceDetailSnapshot = {
  source: 'api' | 'mock' | 'mixed';
  ticket: MaintenanceDetailRecord | null;
};

export type PortalAuditSnapshot = {
  source: 'api' | 'mock' | 'mixed';
  fleetAssets: AssetRecord[];
  auditRecords: AuditRecord[];
};

export type PortalCutoverSnapshot = {
  source: 'api' | 'mock' | 'mixed';
  runs: CutoverRunRecord[];
  latestRun: CutoverRunRecord | null;
  writePolicy: LegacyPortalWritePolicyResponse;
};

export type PortalSnapshotOptions = {
  apiBaseUrl?: string;
  fetchImpl?: FetchLike;
  tenantId?: string;
  actor?: FrontendActor;
  sessionToken?: string;
  nowIso?: string;
  fallbackAssets?: AssetRecord[];
  fallbackUsers?: AccessUserRecord[];
  fallbackMaintenanceTickets?: MaintenanceTicketRecord[];
  fallbackMaintenanceCosts?: MaintenanceCostRecord[];
  fallbackAgendaEvents?: AgendaEventRecord[];
  fallbackMaintenanceDetails?: MaintenanceDetailRecord[];
  fallbackAuditRecords?: AuditRecord[];
};

type PortalMutationOptions = Pick<
  PortalSnapshotOptions,
  'apiBaseUrl' | 'fetchImpl' | 'tenantId' | 'sessionToken'
>;

const fallbackLocation = 'Não informado';
const fallbackWindow = 'Cadastro estrutural sem agenda sincronizada';
const defaultTenantId = 'prime-you';
const defaultUserId = 'frontend-shell';
const maintenanceEvidenceStages: MaintenanceEvidenceType[] = [
  'diagnostic',
  'financial_document',
  'execution_evidence',
  'quality_release'
];
const maintenanceSlaProgressByStatus: Record<MaintenanceStatus, number> = {
  pending: 0.24,
  in_progress: 0.56,
  frozen: 0.82,
  payment: 0.92,
  completed: 1,
  cancelled: 1,
  reopened: 0.64
};

export class PortalApiReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PortalApiReadError';
  }
}

export function mapAccessAssignmentsToUsers(
  assignments: AccessAssignmentApiRecord[]
): AccessUserRecord[] {
  return assignments.map((assignment) => ({
    id: assignment.id,
    userId: assignment.userId,
    displayName: assignment.displayName,
    email: assignment.email,
    role: assignment.role,
    assetScopes: assignment.assetIds,
    mfaEnabled: assignment.mfaEnabled,
    status: assignment.revokedAt ? 'revoked' : 'active',
    lastReviewedAt: toIsoString(assignment.lastReviewedAt)
  }));
}

export function mergeAssetRegistryAssets(
  assets: AssetRegistryApiRecord[],
  baselineAssets: AssetRecord[] = defaultFleetAssets
): AssetRecord[] {
  const baselineById = new Map(baselineAssets.map((asset) => [asset.id, asset]));

  return assets.map((asset) => {
    const baseline = baselineById.get(asset.assetId);

    return {
      id: asset.assetId,
      name: asset.displayName,
      modality: asset.modality,
      status: resolveAssetStatus(asset.active, baseline?.status),
      location: baseline?.location ?? fallbackLocation,
      nextWindow: baseline?.nextWindow ?? fallbackWindow
    };
  });
}

export function mapMaintenanceQueueToTickets(
  tickets: MaintenanceTicketQueueApiRecord[],
  fleetAssets: AssetRecord[]
): MaintenanceTicketRecord[] {
  return tickets.map((ticket) => ({
    id: ticket.id,
    ticketNumber: resolveDisplayTicketNumber(ticket),
    assetId: ticket.assetId,
    assetName: resolveAssetName(ticket.assetId, fleetAssets),
    title: ticket.title?.trim() || ticket.description,
    category: ticket.category,
    priority: ticket.priority,
    ...(ticket.urgency ? { urgency: ticket.urgency } : {}),
    status: ticket.status,
    owner: resolveMaintenanceOwner(ticket.origin),
    openedBy: ticket.openedBy?.trim() || undefined,
    openedAt: toIsoString(ticket.openedAt),
    updatedAt: toIsoString(ticket.updatedAt),
    ...(ticket.completedAt ? { completedAt: toIsoString(ticket.completedAt) } : {}),
    ...(ticket.firstInProgressAt ? { firstInProgressAt: toIsoString(ticket.firstInProgressAt) } : {}),
    ...(ticket.statusHistory
      ? {
          statusHistory: ticket.statusHistory.map((entry) => ({
            fromStatus: entry.fromStatus ?? undefined,
            toStatus: entry.toStatus,
            at: toIsoString(entry.at)
          }))
        }
      : {}),
    frozenCount: ticket.freezeCount,
    thirdParty: ticket.evidenceTypes.includes('financial_document'),
    evidenceCompleteness: calculateEvidenceCompleteness(ticket.evidenceTypes),
    slaProgress: maintenanceSlaProgressByStatus[ticket.status],
    ...(ticket.kanbanSubstatus ? { kanbanSubstatus: ticket.kanbanSubstatus } : {}),
    ...(ticket.maintenanceSystem ? { maintenanceSystem: ticket.maintenanceSystem } : {})
  }));
}

export function mapMaintenanceCostsToRecords(
  costs: MaintenanceCostApiRecord[]
): MaintenanceCostRecord[] {
  return costs.map((cost) => ({
    id: cost.id,
    assetId: cost.assetId,
    ticketId: cost.maintenanceTicketId,
    description: cost.description,
    amount: cost.amount,
    currency: cost.currency,
    ...(cost.supplierId ? { supplierId: cost.supplierId } : {}),
    registeredAt: toIsoString(cost.registeredAt)
  }));
}

function resolveDisplayTicketNumber(ticket: {
  id: string;
  legacyRowId?: string | null;
}): string {
  const legacyRowId = ticket.legacyRowId?.trim();
  if (legacyRowId) {
    return legacyRowId;
  }

  const legacyIdMatch = ticket.id.match(/(?:^|__)legacy-maintenance-(\d+)$/i);
  if (legacyIdMatch) {
    return legacyIdMatch[1];
  }

  const numericId = ticket.id.replace(/\D+/g, '');
  if (numericId.length > 0) {
    return numericId;
  }

  return ticket.id;
}

export function mapAgendaEventsToRecords(
  events: AgendaEventApiRecord[],
  fleetAssets: AssetRecord[]
): AgendaEventRecord[] {
  return events.map((event) => ({
    id: event.id,
    assetId: event.assetId,
    assetName: resolveAssetName(event.assetId, fleetAssets),
    type: event.type,
    title: event.title?.trim() || resolveAgendaTitle(event),
    description: event.description?.trim() || undefined,
    owner: resolveAgendaOwner(event.type),
    startsAt: toIsoString(event.startsAt),
    endsAt: toIsoString(event.endsAt),
    provisional: event.provisional,
    validatedAt: event.validatedAt ? toIsoString(event.validatedAt) : null,
    safeMinimumBreached: event.safeMinimumBreached
  }));
}

export function mapAuditLedgerToRecords(
  entries: AuditLedgerApiRecord[],
  fleetAssets: AssetRecord[]
): AuditRecord[] {
  return entries.map((entry) => ({
    id: entry.id,
    type: entry.type,
    title: entry.title,
    assetId: entry.assetId ?? '',
    assetName: entry.assetId
      ? resolveAssetName(entry.assetId, fleetAssets)
      : 'Escopo global',
    actor: entry.actor,
    at: toIsoString(entry.at),
    summary: entry.summary,
    aggregateType: entry.aggregateType ?? '',
    aggregateId: entry.aggregateId ?? '',
    status: entry.status ?? '',
    recordId: entry.recordId ?? '',
    sourceVersion: entry.sourceVersion ?? 0,
    targetVersion: entry.targetVersion ?? 0
  }));
}

export function mapCutoverRunsToRecords(
  runs: CutoverRunApiRecord[]
): CutoverRunRecord[] {
  return runs.map((run) => ({
    id: run.id,
    label: run.label,
    status: run.status,
    goLiveDecision: run.goLiveDecision,
    futureAgendaDaysMigrated: run.futureAgendaDaysMigrated,
    finalFreezeApplied: run.finalFreezeApplied,
    invalidCriticalAttachmentIds: [...run.invalidCriticalAttachmentIds],
    approvals: {
      centralOperations: mapCutoverApproval(run.approvals.centralOperations),
      technicalCoordination: mapCutoverApproval(run.approvals.technicalCoordination),
      portalAdmin: mapCutoverApproval(run.approvals.portalAdmin)
    },
    entityCounts: run.entityCounts.map((entityCount) => ({
      entity: entityCount.entity,
      sourceCount: entityCount.sourceCount,
      migratedCount: entityCount.migratedCount
    })),
    gate: {
      approved: run.lastEvaluationApproved === true,
      blockers: Array.isArray(run.lastEvaluationBlockers) ? [...run.lastEvaluationBlockers] : []
    },
    evidences: run.evidences.map((evidence) => ({
      id: evidence.id,
      type: evidence.type,
      title: evidence.title,
      detail: evidence.detail,
      reference: evidence.reference,
      valid: evidence.valid,
      createdAt: toIsoString(evidence.createdAt)
    })),
    checkpoints: run.checkpoints.map((checkpoint) => ({
      id: checkpoint.id,
      checkpoint: checkpoint.checkpoint,
      status: checkpoint.status,
      notes: checkpoint.notes,
      recordedBy: checkpoint.recordedBy,
      recordedAt: toIsoString(checkpoint.recordedAt)
    })),
    createdAt: toIsoString(run.createdAt),
    updatedAt: toIsoString(run.updatedAt)
  }));
}

export function mapMaintenanceDetailToRecord(
  ticket: MaintenanceTicketDetailApiRecord,
  fleetAssets: AssetRecord[]
): MaintenanceDetailRecord {
  const queueRecord = mapMaintenanceQueueToTickets([ticket], fleetAssets)[0];
  const parsedNotes = parseMaintenanceNotesDocument(ticket.notes);
  const evidences = [...ticket.evidences].sort(
    (left, right) => Date.parse(toIsoString(left.uploadedAt)) - Date.parse(toIsoString(right.uploadedAt))
  );
  const owner = resolveMaintenanceOwner(ticket.origin);

  return {
    ...queueRecord,
    assetTag: ticket.assetId.toUpperCase(),
    description: ticket.description,
    notes: parsedNotes.summary,
    comments: parsedNotes.comments,
    maintenanceSystem: ticket.maintenanceSystem ?? 'other',
    substeps: buildMaintenanceSubsteps(ticket.status),
    evidenceChecklist: maintenanceEvidenceStages.map((evidenceType) => ({
      label: resolveEvidenceLabel(evidenceType),
      status: ticket.evidenceTypes.includes(evidenceType) ? 'complete' : 'pending'
    })),
    budget: {
      preliminary: 'Não sincronizado',
      current: 'Não sincronizado',
      deltaLabel: 'Sem integracao financeira',
      ownership: 'Operações confirmam pagamento quando aplicável'
    },
    thirdParty: ticket.evidenceTypes.includes('financial_document')
      ? {
          involved: true,
          supplier: 'Não sincronizado',
          strategy: 'Execução com componente financeiro registrado',
          centralValidation: 'A confirmar pela operação central'
        }
      : {
          involved: false,
          supplier: 'Não aplicável',
          strategy: 'Execução operacional sem marcador de terceiro na API',
          centralValidation: 'Não aplicável nesta leitura'
        },
    freezeHistory: buildFreezeHistory(ticket.freezeCount, ticket.frozenReason, ticket.updatedAt, owner),
    auditTrail: [
      {
        title: 'Chamado aberto',
        at: toIsoString(ticket.openedAt),
        actor: ticket.openedBy,
        note: `Origem: ${ticket.origin}`
      },
      ...evidences.map((evidence) => ({
        title: 'Evidencia anexada',
        at: toIsoString(evidence.uploadedAt),
        actor: evidence.uploadedBy,
        note: `${evidence.type} - ${evidence.fileName}`
      })),
      {
        title: 'Ultima atualizacao',
        at: toIsoString(ticket.updatedAt),
        actor: owner,
        note: `Status atual: ${ticket.status}`
      }
    ]
  };
}

export async function fetchPortalSnapshot(
  options: PortalSnapshotOptions = {}
): Promise<PortalSnapshot> {
  const fallbackAssets = options.fallbackAssets ?? defaultFleetAssets;
  const fallbackUsers = options.fallbackUsers ?? defaultAccessUsers;
  const tenantId = options.tenantId ?? process.env.OPS_PORTAL_TENANT_ID ?? defaultTenantId;
  const actor = options.actor ?? buildDefaultActor(tenantId);
  const shouldReadAccessAssignments = canViewAccessModule(actor.role);
  const apiBaseUrl = normalizeApiBaseUrl(
    options.apiBaseUrl ?? process.env.OPS_PORTAL_API_BASE_URL
  );

  if (!apiBaseUrl) {
    ensurePortalReadFallbackAllowed(
      options.sessionToken,
      'OPS_PORTAL_API_BASE_URL is not configured for authenticated portal reads.'
    );

    return {
      source: 'mock',
      fleetAssets: filterScopedAssets(actor, fallbackAssets),
      accessUsers: fallbackUsers
    };
  }

  const fetchImpl = options.fetchImpl ?? fetch;

  try {
    const [assetResponse, accessResponse] = await Promise.all([
      fetchImpl(`${apiBaseUrl}/asset-registry/assets/search`, {
        method: 'POST',
        cache: 'no-store',
        headers: buildPortalHeaders(options.sessionToken),
        body: JSON.stringify({
          actor,
          tenantId,
          filters: {
            modality: 'yachts'
          }
        })
      }),
      shouldReadAccessAssignments
        ? fetchImpl(`${apiBaseUrl}/access/assignments/search`, {
            method: 'POST',
            cache: 'no-store',
            headers: buildPortalHeaders(options.sessionToken),
            body: JSON.stringify({
              actor,
              tenantId,
              now: options.nowIso ?? new Date().toISOString()
            })
          })
        : Promise.resolve(null)
    ]);

    if (!assetResponse.ok || (accessResponse && !accessResponse.ok)) {
      ensurePortalReadFallbackAllowed(
        options.sessionToken,
        `Portal API snapshot read failed: assets=${assetResponse.status}, access=${accessResponse?.status ?? 'skipped'}.`
      );

      return {
        source: 'mock',
        fleetAssets: filterScopedAssets(actor, fallbackAssets),
        accessUsers: shouldReadAccessAssignments ? fallbackUsers : []
      };
    }

    const assetPayload = (await assetResponse.json()) as AssetRegistryListResponse;

    if ('reason' in assetPayload) {
      ensurePortalReadFallbackAllowed(
        options.sessionToken,
        'Portal API rejected the authenticated asset snapshot request.'
      );

      return {
        source: 'mock',
        fleetAssets: filterScopedAssets(actor, fallbackAssets),
        accessUsers: shouldReadAccessAssignments ? fallbackUsers : []
      };
    }

    if (!shouldReadAccessAssignments) {
      return {
        source: 'api',
        fleetAssets: mergeAssetRegistryAssets(assetPayload.assets, fallbackAssets),
        accessUsers: []
      };
    }

    const accessPayload = (await accessResponse!.json()) as AccessAssignmentsListResponse;

    if ('reason' in accessPayload) {
      ensurePortalReadFallbackAllowed(
        options.sessionToken,
        'Portal API rejected the authenticated snapshot request.'
      );

      return {
        source: 'mock',
        fleetAssets: filterScopedAssets(actor, fallbackAssets),
        accessUsers: fallbackUsers
      };
    }

    return {
      source: 'api',
      fleetAssets: mergeAssetRegistryAssets(assetPayload.assets, fallbackAssets),
      accessUsers: mapAccessAssignmentsToUsers(accessPayload.assignments)
    };
  } catch (error) {
    rethrowAuthenticatedPortalReadFailure(
      error,
      options.sessionToken,
      'Unable to load the authenticated portal snapshot from the API.'
    );

    return {
      source: 'mock',
      fleetAssets: filterScopedAssets(actor, fallbackAssets),
      accessUsers: fallbackUsers
    };
  }
}

export async function createMaintenanceTicket(
  request: CreateMaintenanceTicketRequest,
  options: PortalMutationOptions = {}
): Promise<CreateMaintenanceTicketResponse> {
  const tenantId = resolveTenantId(options.tenantId, request.actor);

  return await postPortalJson('maintenance/tickets', {
    actor: request.actor,
    tenantId,
    input: {
      ...request.input,
      openedAt: toIsoString(request.input.openedAt)
    }
  }, options);
}

export async function createDecisionMemo(
  request: CreateDecisionMemoRequest,
  options: PortalMutationOptions = {}
): Promise<CreateDecisionMemoResponse> {
  const tenantId = resolveTenantId(options.tenantId, request.actor);

  return await postPortalJson('audit/decision-memos', {
    actor: request.actor,
    tenantId,
    action: request.action,
    aggregateType: request.aggregateType,
    aggregateId: request.aggregateId,
    assetId: request.assetId,
    justification: request.justification
  }, options);
}

export async function createRectification(
  request: CreateRectificationRequest,
  options: PortalMutationOptions = {}
): Promise<CreateRectificationResponse> {
  const tenantId = resolveTenantId(options.tenantId, request.actor);

  return await postPortalJson('audit/rectifications', {
    actor: request.actor,
    tenantId,
    record: request.record,
    input: request.input
  }, options);
}

export async function upsertAccessAssignment(
  request: UpsertAccessAssignmentRequest,
  options: PortalMutationOptions = {}
): Promise<UpsertAccessAssignmentResponse> {
  const tenantId = resolveTenantId(options.tenantId, request.actor);

  return await postPortalJson('access/assignments', {
    actor: request.actor,
    tenantId,
    ...(request.assignmentId ? { assignmentId: request.assignmentId } : {}),
    input: {
      ...request.input,
      lastReviewedAt: toIsoString(request.input.lastReviewedAt),
      revokedAt: request.input.revokedAt ? toIsoString(request.input.revokedAt) : undefined
    }
  }, options);
}

export async function revokeAccessAssignment(
  request: RevokeAccessAssignmentRequest,
  options: PortalMutationOptions = {}
): Promise<RevokeAccessAssignmentResponse> {
  const tenantId = resolveTenantId(options.tenantId, request.actor);

  return await postPortalJson(`access/assignments/${request.assignmentId}/revoke`, {
    actor: request.actor,
    tenantId,
    requestedAt: toIsoString(request.requestedAt),
    removedAt: toIsoString(request.removedAt)
  }, options);
}

export async function upsertCutoverRun(
  request: UpsertCutoverRunRequest,
  options: PortalMutationOptions = {}
): Promise<UpsertCutoverRunResponse> {
  const tenantId = resolveTenantId(options.tenantId, request.actor);

  return await postPortalJson('cutover/runs', {
    actor: request.actor,
    tenantId,
    runId: request.runId,
    input: {
      label: request.input.label,
      futureAgendaDaysMigrated: request.input.futureAgendaDaysMigrated,
      finalFreezeApplied: request.input.finalFreezeApplied,
      invalidCriticalAttachmentIds: [...request.input.invalidCriticalAttachmentIds],
      approvals: serializeCutoverApprovals(request.input.approvals),
      entityCounts: request.input.entityCounts.map((entityCount) => ({
        entity: entityCount.entity,
        sourceCount: entityCount.sourceCount,
        migratedCount: entityCount.migratedCount
      })),
      evidences: request.input.evidences.map((evidence) => ({
        type: evidence.type,
        title: evidence.title,
        detail: evidence.detail,
        reference: evidence.reference,
        valid: evidence.valid
      }))
    }
  }, options);
}

export async function recordCutoverCheckpoint(
  request: RecordCutoverCheckpointRequest,
  options: PortalMutationOptions = {}
): Promise<RecordCutoverCheckpointResponse> {
  const tenantId = resolveTenantId(options.tenantId, request.actor);

  return await postPortalJson(`cutover/runs/${request.runId}/checkpoints`, {
    actor: request.actor,
    tenantId,
    input: request.input
  }, options);
}

export async function evaluateCutoverRun(
  request: EvaluateCutoverRunRequest,
  options: PortalMutationOptions = {}
): Promise<EvaluateCutoverRunResponse> {
  const tenantId = resolveTenantId(options.tenantId, request.actor);

  return await postPortalJson(`cutover/runs/${request.runId}/evaluate`, {
    actor: request.actor,
    tenantId
  }, options);
}

export async function recordCutoverDecision(
  request: RecordCutoverDecisionRequest,
  options: PortalMutationOptions = {}
): Promise<RecordCutoverDecisionResponse> {
  const tenantId = resolveTenantId(options.tenantId, request.actor);

  return await postPortalJson(`cutover/runs/${request.runId}/decision`, {
    actor: request.actor,
    tenantId,
    input: request.input
  }, options);
}

export async function transitionMaintenanceTicket(
  request: TransitionMaintenanceTicketRequest,
  options: PortalMutationOptions = {}
): Promise<TransitionMaintenanceTicketResponse> {
  const tenantId = resolveTenantId(options.tenantId, request.actor);

  return await postPortalJson(`maintenance/tickets/${request.ticketId}/transitions`, {
    actor: request.actor,
    tenantId,
    input: request.input
  }, options);
}

export async function attachMaintenanceEvidence(
  request: AttachMaintenanceEvidenceRequest,
  options: PortalMutationOptions = {}
): Promise<AttachMaintenanceEvidenceResponse> {
  const tenantId = resolveTenantId(options.tenantId, request.actor);

  return await postPortalJson(`maintenance/tickets/${request.ticketId}/evidences`, {
    actor: request.actor,
    tenantId,
    input: {
      ...request.input,
      uploadedAt: toIsoString(request.input.uploadedAt)
    }
  }, options);
}

export async function registerMaintenanceComment(
  request: RegisterMaintenanceCommentRequest,
  options: PortalMutationOptions = {}
): Promise<RegisterMaintenanceCommentResponse> {
  const tenantId = resolveTenantId(options.tenantId, request.actor);

  return await postPortalJson(`maintenance/tickets/${request.ticketId}/comments`, {
    actor: request.actor,
    tenantId,
    input: {
      ...request.input,
      commentedAt: toIsoString(request.input.commentedAt)
    }
  }, options);
}

export async function scheduleAgendaEvent(
  request: ScheduleAgendaEventRequest,
  options: PortalMutationOptions = {}
): Promise<ScheduleAgendaEventResponse> {
  const tenantId = resolveTenantId(options.tenantId, request.actor);

  return await postPortalJson('agenda/events', {
    actor: request.actor,
    tenantId,
    candidateEvent: {
      ...request.candidateEvent,
      startsAt: toIsoString(request.candidateEvent.startsAt),
      endsAt: toIsoString(request.candidateEvent.endsAt),
      validatedAt: request.candidateEvent.validatedAt
        ? toIsoString(request.candidateEvent.validatedAt)
        : undefined
    }
  }, options);
}

export async function rescheduleAgendaEvent(
  request: RescheduleAgendaEventRequest,
  options: PortalMutationOptions = {}
): Promise<RescheduleAgendaEventResponse> {
  const tenantId = resolveTenantId(options.tenantId, request.actor);

  return await postPortalJson(`agenda/events/${request.eventId}/reschedule`, {
    actor: request.actor,
    tenantId,
    updatedEvent: {
      ...request.updatedEvent,
      startsAt: toIsoString(request.updatedEvent.startsAt),
      endsAt: toIsoString(request.updatedEvent.endsAt),
      validatedAt: request.updatedEvent.validatedAt
        ? toIsoString(request.updatedEvent.validatedAt)
        : undefined
    }
  }, options);
}

export async function deleteAgendaEvent(
  request: DeleteAgendaEventRequest,
  options: PortalMutationOptions = {}
): Promise<DeleteAgendaEventResponse> {
  const tenantId = resolveTenantId(options.tenantId, request.actor);

  return await postPortalJson(`agenda/events/${request.eventId}/delete`, {
    actor: request.actor,
    tenantId
  }, options);
}

export async function fetchPortalOperationsSnapshot(
  options: PortalSnapshotOptions = {}
): Promise<PortalOperationsSnapshot> {
  const fallbackMaintenanceTickets = options.fallbackMaintenanceTickets ?? defaultMaintenanceTickets;
  const fallbackMaintenanceCosts = options.fallbackMaintenanceCosts ?? defaultMaintenanceCosts;
  const fallbackAgendaEvents = options.fallbackAgendaEvents ?? defaultAgendaEvents;
  const apiBaseUrl = normalizeApiBaseUrl(
    options.apiBaseUrl ?? process.env.OPS_PORTAL_API_BASE_URL
  );
  const tenantId = options.tenantId ?? process.env.OPS_PORTAL_TENANT_ID ?? defaultTenantId;
  const actor = options.actor ?? buildDefaultActor(tenantId);
  const fetchImpl = options.fetchImpl ?? fetch;
  const portalSnapshot = await fetchPortalSnapshot(options);

  if (!apiBaseUrl) {
    return {
      ...portalSnapshot,
      source: 'mock',
      maintenanceTickets: filterScopedMaintenanceTickets(actor, fallbackMaintenanceTickets),
      maintenanceCosts: filterScopedMaintenanceCosts(actor, fallbackMaintenanceCosts),
      agendaEvents: filterScopedAgendaEvents(actor, fallbackAgendaEvents)
    };
  }

  const [maintenanceSnapshot, maintenanceSummarySnapshot, agendaSnapshot] = await Promise.all([
    fetchMaintenanceQueueDomainSnapshot({
      apiBaseUrl,
      fetchImpl,
      actor,
      tenantId,
      sessionToken: options.sessionToken,
      fleetAssets: portalSnapshot.fleetAssets,
      fallbackMaintenanceTickets
    }),
    fetchMaintenanceSummaryDomainSnapshot({
      apiBaseUrl,
      fetchImpl,
      actor,
      tenantId,
      sessionToken: options.sessionToken,
      fallbackMaintenanceCosts
    }),
    fetchAgendaDomainSnapshot({
      apiBaseUrl,
      fetchImpl,
      actor,
      tenantId,
      sessionToken: options.sessionToken,
      fleetAssets: portalSnapshot.fleetAssets,
      fallbackAgendaEvents
    })
  ]);

  return {
    source: mergeSources(
      portalSnapshot.source,
      maintenanceSnapshot.source,
      maintenanceSummarySnapshot.source,
      agendaSnapshot.source
    ),
    fleetAssets: portalSnapshot.fleetAssets,
    accessUsers: portalSnapshot.accessUsers,
    maintenanceTickets: maintenanceSnapshot.tickets,
    maintenanceCosts: maintenanceSummarySnapshot.maintenanceCosts,
    agendaEvents: agendaSnapshot.events
  };
}

export async function fetchMaintenanceDetailSnapshot(
  ticketId: string,
  options: PortalSnapshotOptions = {}
): Promise<MaintenanceDetailSnapshot> {
  const fallbackMaintenanceDetails = options.fallbackMaintenanceDetails ?? defaultMaintenanceDetails;
  const fallbackTicket = fallbackMaintenanceDetails.find((ticket) => ticket.id === ticketId) ?? null;
  const tenantId = options.tenantId ?? process.env.OPS_PORTAL_TENANT_ID ?? defaultTenantId;
  const actor = options.actor ?? buildDefaultActor(tenantId);
  const scopedFallbackTicket = filterScopedMaintenanceDetail(actor, fallbackTicket);
  const apiBaseUrl = normalizeApiBaseUrl(
    options.apiBaseUrl ?? process.env.OPS_PORTAL_API_BASE_URL
  );

  if (!apiBaseUrl) {
    ensurePortalReadFallbackAllowed(
      options.sessionToken,
      'OPS_PORTAL_API_BASE_URL is not configured for authenticated maintenance detail reads.'
    );

    return {
      source: 'mock',
      ticket: scopedFallbackTicket
    };
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const portalSnapshot = await fetchPortalSnapshot(options);

  try {
  const response = await fetchImpl(`${apiBaseUrl}/maintenance/tickets/${ticketId}/detail`, {
      method: 'POST',
      cache: 'no-store',
      headers: buildPortalHeaders(options.sessionToken),
      body: JSON.stringify({
        actor,
        tenantId
      })
    });

    if (!response.ok) {
      ensurePortalReadFallbackAllowed(
        options.sessionToken,
        `Portal API maintenance detail read failed: ${response.status}.`
      );

      return {
        source: portalSnapshot.source === 'api' ? 'mixed' : 'mock',
        ticket: scopedFallbackTicket
      };
    }

    const payload = (await response.json()) as MaintenanceDetailResponse;

    if (!payload.found) {
      if (hasAuthenticatedPortalSession(options.sessionToken)) {
        return {
          source: portalSnapshot.source === 'api' ? 'api' : 'mixed',
          ticket: null
        };
      }

      return {
        source: portalSnapshot.source === 'api' ? 'mixed' : 'mock',
        ticket: scopedFallbackTicket
      };
    }

    return {
      source: portalSnapshot.source === 'api' ? 'api' : 'mixed',
      ticket: mapMaintenanceDetailToRecord(payload.ticket, portalSnapshot.fleetAssets)
    };
  } catch (error) {
    rethrowAuthenticatedPortalReadFailure(
      error,
      options.sessionToken,
      'Unable to load the authenticated maintenance detail from the API.'
    );

    return {
      source: portalSnapshot.source === 'api' ? 'mixed' : 'mock',
      ticket: scopedFallbackTicket
    };
  }
}

export async function fetchPortalAuditSnapshot(
  options: PortalSnapshotOptions = {}
): Promise<PortalAuditSnapshot> {
  const fallbackAuditRecords = options.fallbackAuditRecords ?? defaultAuditRecords;
  const apiBaseUrl = normalizeApiBaseUrl(
    options.apiBaseUrl ?? process.env.OPS_PORTAL_API_BASE_URL
  );

  if (!apiBaseUrl) {
    ensurePortalReadFallbackAllowed(
      options.sessionToken,
      'OPS_PORTAL_API_BASE_URL is not configured for authenticated audit reads.'
    );

    return {
      source: 'mock',
      fleetAssets: options.fallbackAssets ?? defaultFleetAssets,
      auditRecords: fallbackAuditRecords
    };
  }

  const tenantId = options.tenantId ?? process.env.OPS_PORTAL_TENANT_ID ?? defaultTenantId;
  const actor = options.actor ?? buildDefaultActor(tenantId);
  const fetchImpl = options.fetchImpl ?? fetch;
  const portalSnapshot = await fetchPortalSnapshot(options);
  const auditSnapshot = await fetchAuditDomainSnapshot({
    apiBaseUrl,
    fetchImpl,
    actor,
    tenantId,
    sessionToken: options.sessionToken,
    fleetAssets: portalSnapshot.fleetAssets,
    fallbackAuditRecords
  });

  return {
    source: mergeSources(portalSnapshot.source, auditSnapshot.source),
    fleetAssets: portalSnapshot.fleetAssets,
    auditRecords: auditSnapshot.auditRecords
  };
}

export async function fetchPortalCutoverSnapshot(
  options: PortalSnapshotOptions = {}
): Promise<PortalCutoverSnapshot> {
  const apiBaseUrl = normalizeApiBaseUrl(
    options.apiBaseUrl ?? process.env.OPS_PORTAL_API_BASE_URL
  );

  if (!apiBaseUrl) {
    ensurePortalReadFallbackAllowed(
      options.sessionToken,
      'OPS_PORTAL_API_BASE_URL is not configured for authenticated cutover reads.'
    );

    const runs = buildMockCutoverRuns();

    return {
      source: 'mock',
      runs,
      latestRun: runs[0] ?? null,
      writePolicy: {
        allowed: true,
        reason: 'ALLOWED'
      }
    };
  }

  const tenantId = options.tenantId ?? process.env.OPS_PORTAL_TENANT_ID ?? defaultTenantId;
  const actor = options.actor ?? buildDefaultActor(tenantId);
  const fetchImpl = options.fetchImpl ?? fetch;

  try {
    const runsResponse = await fetchImpl(`${apiBaseUrl}/cutover/runs/search`, {
      method: 'POST',
      cache: 'no-store',
      headers: buildPortalHeaders(options.sessionToken),
      body: JSON.stringify({
        actor,
        tenantId
      })
    });

    if (!runsResponse.ok) {
      ensurePortalReadFallbackAllowed(
        options.sessionToken,
        `Portal API cutover run search failed: ${runsResponse.status}.`
      );

      const runs = buildMockCutoverRuns();

      return {
        source: 'mixed',
        runs,
        latestRun: runs[0] ?? null,
        writePolicy: {
          allowed: true,
          reason: 'ALLOWED'
        }
      };
    }

    const runsPayload = (await runsResponse.json()) as CutoverRunSearchResponse;

    if ('reason' in runsPayload) {
      ensurePortalReadFallbackAllowed(
        options.sessionToken,
        'Portal API rejected the authenticated cutover run search.'
      );

      const runs = buildMockCutoverRuns();

      return {
        source: 'mixed',
        runs,
        latestRun: runs[0] ?? null,
        writePolicy: {
          allowed: true,
          reason: 'ALLOWED'
        }
      };
    }

    const detailCandidate = runsPayload.runs[0];

    if (!detailCandidate) {
      const writePolicyResponse = await fetchImpl(
        `${apiBaseUrl}/cutover/legacy-portal/write-policy?tenantId=${encodeURIComponent(tenantId)}`,
        {
          method: 'GET',
          cache: 'no-store',
          headers: buildPortalHeaders(options.sessionToken)
        }
      );
      if (!writePolicyResponse.ok) {
        ensurePortalReadFallbackAllowed(
          options.sessionToken,
          `Portal API cutover write policy read failed: ${writePolicyResponse.status}.`
        );
      }
      const writePolicy: LegacyPortalWritePolicyResponse = writePolicyResponse.ok
        ? ((await writePolicyResponse.json()) as LegacyPortalWritePolicyResponse)
        : {
            allowed: true,
            reason: 'ALLOWED'
          };

      return {
        source: 'api',
        runs: [],
        latestRun: null,
        writePolicy
      };
    }

    const detailResponse = await fetchImpl(
      `${apiBaseUrl}/cutover/runs/${detailCandidate.id}/detail`,
      {
        method: 'POST',
        cache: 'no-store',
        headers: buildPortalHeaders(options.sessionToken),
        body: JSON.stringify({
          actor,
          tenantId
        })
      }
    );

    const latestRun =
      detailResponse.ok
        ? ((await detailResponse.json()) as CutoverRunDetailResponse)
        : null;
    if (!detailResponse.ok) {
      ensurePortalReadFallbackAllowed(
        options.sessionToken,
        `Portal API cutover detail read failed: ${detailResponse.status}.`
      );
    }

    const writePolicyResponse = await fetchImpl(
      `${apiBaseUrl}/cutover/legacy-portal/write-policy?tenantId=${encodeURIComponent(tenantId)}`,
      {
        method: 'GET',
        cache: 'no-store',
        headers: buildPortalHeaders(options.sessionToken)
      }
    );
    if (!writePolicyResponse.ok) {
      ensurePortalReadFallbackAllowed(
        options.sessionToken,
        `Portal API cutover write policy read failed: ${writePolicyResponse.status}.`
      );
    }
    const writePolicy: LegacyPortalWritePolicyResponse = writePolicyResponse.ok
      ? ((await writePolicyResponse.json()) as LegacyPortalWritePolicyResponse)
      : {
          allowed: true,
          reason: 'ALLOWED' as const
        };
    const latestRunRecord =
      latestRun && latestRun.found
        ? mapCutoverRunsToRecords([latestRun.run])[0]
        : mapCutoverRunsToRecords([detailCandidate])[0];
    const listedRuns = mapCutoverRunsToRecords(runsPayload.runs);

    return {
      source: 'api',
      runs: latestRunRecord
        ? [latestRunRecord, ...listedRuns.filter((run) => run.id !== latestRunRecord.id)]
        : listedRuns,
      latestRun: latestRunRecord ?? null,
      writePolicy
    };
  } catch (error) {
    rethrowAuthenticatedPortalReadFailure(
      error,
      options.sessionToken,
      'Unable to load the authenticated cutover snapshot from the API.'
    );

    const runs = buildMockCutoverRuns();

    return {
      source: 'mock',
      runs,
      latestRun: runs[0] ?? null,
      writePolicy: {
        allowed: true,
        reason: 'ALLOWED'
      }
    };
  }
}

type MaintenanceQueueDomainSnapshot = {
  source: DomainSource;
  tickets: MaintenanceTicketRecord[];
};

type MaintenanceSummaryDomainSnapshot = {
  source: DomainSource;
  maintenanceCosts: MaintenanceCostRecord[];
};

type AgendaDomainSnapshot = {
  source: DomainSource;
  events: AgendaEventRecord[];
};

type AuditDomainSnapshot = {
  source: DomainSource;
  auditRecords: AuditRecord[];
};

function buildMockCutoverRuns(): CutoverRunRecord[] {
  const blocked = defaultCutoverGates.some((gate) => gate.status === 'blocked');
  const inReview = defaultCutoverGates.some((gate) => gate.status === 'in_review');

  return [
    {
      id: 'cutover-mock-yachts-phase1',
      label: 'Mock cutover command center',
      status: blocked ? 'blocked' : inReview ? 'draft' : 'approved',
      goLiveDecision: null,
      futureAgendaDaysMigrated: blocked ? 72 : 90,
      finalFreezeApplied: !blocked,
      invalidCriticalAttachmentIds: blocked ? ['critical-attachment-batch-final'] : [],
      approvals: {
        centralOperations: {
          approved: true,
          approvedBy: portalRoleLabels.central_operations,
          approvedAt: '2026-05-15T09:00:00.000Z'
        },
        technicalCoordination: {
          approved: !blocked,
          approvedBy: !blocked ? portalRoleLabels.yachts_technical_coordination : null,
          approvedAt: !blocked ? '2026-05-15T09:05:00.000Z' : null
        },
        portalAdmin: {
          approved: !blocked,
          approvedBy: !blocked ? portalRoleLabels.portal_admin : null,
          approvedAt: !blocked ? '2026-05-15T09:10:00.000Z' : null
        }
      },
      entityCounts: [
        {
          entity: 'maintenance_tickets',
          sourceCount: 657,
          migratedCount: 657
        },
        {
          entity: 'agenda_events',
          sourceCount: 270,
          migratedCount: blocked ? 245 : 270
        },
        {
          entity: 'critical_attachments',
          sourceCount: 98,
          migratedCount: blocked ? 96 : 98
        }
      ],
      gate: {
        approved: !blocked,
        blockers: defaultCutoverGates
          .filter((gate) => gate.status !== 'ready')
          .map((gate) => ({
            code: gate.status === 'blocked' ? 'GATE_BLOCKED' : 'GATE_IN_REVIEW',
            label: gate.label,
            detail: gate.detail
          }))
      },
      evidences: [
        {
          id: 'mock-evidence-1',
          type: 'migration_report',
          title: 'Dry-run legacy migration',
          detail: 'Fallback command center generated from mock governance data.',
          reference: '.tmp/legacy-yachts-import-report.json',
          valid: !blocked,
          createdAt: '2026-05-15T09:15:00.000Z'
        }
      ],
      checkpoints: [
        {
          id: 'mock-checkpoint-1',
          checkpoint: 'T+1',
          status: blocked ? 'pending' : 'completed',
          notes: blocked
            ? 'Aguardando rodada real de cutover.'
            : 'Portal navegavel e conciliado.',
          recordedBy: portalRoleLabels.portal_admin,
          recordedAt: '2026-05-15T11:00:00.000Z'
        },
        {
          id: 'mock-checkpoint-2',
          checkpoint: 'T+4',
          status: 'pending',
          notes: 'Checkpoint ainda nao registrado.',
          recordedBy: portalRoleLabels.portal_admin,
          recordedAt: '2026-05-15T14:00:00.000Z'
        },
        {
          id: 'mock-checkpoint-3',
          checkpoint: 'T+24',
          status: 'pending',
          notes: 'Checkpoint ainda nao registrado.',
          recordedBy: portalRoleLabels.portal_admin,
          recordedAt: '2026-05-16T10:00:00.000Z'
        }
      ],
      createdAt: '2026-05-15T09:00:00.000Z',
      updatedAt: '2026-05-15T09:30:00.000Z'
    }
  ];
}

async function fetchMaintenanceQueueDomainSnapshot(input: {
  apiBaseUrl: string;
  fetchImpl: FetchLike;
  actor: FrontendActor;
  tenantId: string;
  sessionToken?: string;
  fleetAssets: AssetRecord[];
  fallbackMaintenanceTickets: MaintenanceTicketRecord[];
}): Promise<MaintenanceQueueDomainSnapshot> {
  try {
    const response = await input.fetchImpl(`${input.apiBaseUrl}/maintenance/tickets/search`, {
      method: 'POST',
      cache: 'no-store',
      headers: buildPortalHeaders(input.sessionToken),
      body: JSON.stringify({
        actor: input.actor,
        tenantId: input.tenantId
      })
    });

    if (!response.ok) {
      ensurePortalReadFallbackAllowed(
        input.sessionToken,
        `Portal API maintenance queue read failed: ${response.status}.`
      );

      return {
        source: 'mock',
        tickets: filterScopedMaintenanceTickets(input.actor, input.fallbackMaintenanceTickets)
      };
    }

    const payload = (await response.json()) as MaintenanceSearchResponse;

    if ('reason' in payload) {
      ensurePortalReadFallbackAllowed(
        input.sessionToken,
        'Portal API rejected the authenticated maintenance queue read.'
      );

      return {
        source: 'mock',
        tickets: filterScopedMaintenanceTickets(input.actor, input.fallbackMaintenanceTickets)
      };
    }

    return {
      source: 'api',
      tickets: mapMaintenanceQueueToTickets(payload.tickets, input.fleetAssets)
    };
  } catch (error) {
    rethrowAuthenticatedPortalReadFailure(
      error,
      input.sessionToken,
      'Unable to load the authenticated maintenance queue from the API.'
    );

    return {
      source: 'mock',
      tickets: filterScopedMaintenanceTickets(input.actor, input.fallbackMaintenanceTickets)
    };
  }
}

async function fetchMaintenanceSummaryDomainSnapshot(input: {
  apiBaseUrl: string;
  fetchImpl: FetchLike;
  actor: FrontendActor;
  tenantId: string;
  sessionToken?: string;
  fallbackMaintenanceCosts: MaintenanceCostRecord[];
}): Promise<MaintenanceSummaryDomainSnapshot> {
  try {
    const response = await input.fetchImpl(`${input.apiBaseUrl}/maintenance/summary`, {
      method: 'POST',
      cache: 'no-store',
      headers: buildPortalHeaders(input.sessionToken),
      body: JSON.stringify({
        actor: input.actor,
        tenantId: input.tenantId
      })
    });

    if (!response.ok) {
      ensurePortalReadFallbackAllowed(
        input.sessionToken,
        `Portal API maintenance summary read failed: ${response.status}.`
      );

      return {
        source: 'mock',
        maintenanceCosts: filterScopedMaintenanceCosts(
          input.actor,
          input.fallbackMaintenanceCosts
        )
      };
    }

    const payload = (await response.json()) as MaintenanceSummaryResponse;

    if ('reason' in payload) {
      ensurePortalReadFallbackAllowed(
        input.sessionToken,
        'Portal API rejected the authenticated maintenance summary read.'
      );

      return {
        source: 'mock',
        maintenanceCosts: filterScopedMaintenanceCosts(
          input.actor,
          input.fallbackMaintenanceCosts
        )
      };
    }

    return {
      source: 'api',
      maintenanceCosts: mapMaintenanceCostsToRecords(payload.costs)
    };
  } catch (error) {
    rethrowAuthenticatedPortalReadFailure(
      error,
      input.sessionToken,
      'Unable to load the authenticated maintenance summary from the API.'
    );

    return {
      source: 'mock',
      maintenanceCosts: filterScopedMaintenanceCosts(input.actor, input.fallbackMaintenanceCosts)
    };
  }
}

async function fetchAgendaDomainSnapshot(input: {
  apiBaseUrl: string;
  fetchImpl: FetchLike;
  actor: FrontendActor;
  tenantId: string;
  sessionToken?: string;
  fleetAssets: AssetRecord[];
  fallbackAgendaEvents: AgendaEventRecord[];
}): Promise<AgendaDomainSnapshot> {
  try {
    const response = await input.fetchImpl(`${input.apiBaseUrl}/agenda/events/search`, {
      method: 'POST',
      cache: 'no-store',
      headers: buildPortalHeaders(input.sessionToken),
      body: JSON.stringify({
        actor: input.actor,
        tenantId: input.tenantId
      })
    });

    if (!response.ok) {
      ensurePortalReadFallbackAllowed(
        input.sessionToken,
        `Portal API agenda read failed: ${response.status}.`
      );

      return {
        source: 'mock',
        events: filterScopedAgendaEvents(input.actor, input.fallbackAgendaEvents)
      };
    }

    const payload = (await response.json()) as AgendaSearchResponse;

    if ('reason' in payload) {
      ensurePortalReadFallbackAllowed(
        input.sessionToken,
        'Portal API rejected the authenticated agenda read.'
      );

      return {
        source: 'mock',
        events: filterScopedAgendaEvents(input.actor, input.fallbackAgendaEvents)
      };
    }

    return {
      source: 'api',
      events: mapAgendaEventsToRecords(payload.events, input.fleetAssets)
    };
  } catch (error) {
    rethrowAuthenticatedPortalReadFailure(
      error,
      input.sessionToken,
      'Unable to load the authenticated agenda snapshot from the API.'
    );

    return {
      source: 'mock',
      events: filterScopedAgendaEvents(input.actor, input.fallbackAgendaEvents)
    };
  }
}

async function fetchAuditDomainSnapshot(input: {
  apiBaseUrl: string;
  fetchImpl: FetchLike;
  actor: FrontendActor;
  tenantId: string;
  sessionToken?: string;
  fleetAssets: AssetRecord[];
  fallbackAuditRecords: AuditRecord[];
}): Promise<AuditDomainSnapshot> {
  try {
    const response = await input.fetchImpl(`${input.apiBaseUrl}/audit/ledger/search`, {
      method: 'POST',
      cache: 'no-store',
      headers: buildPortalHeaders(input.sessionToken),
      body: JSON.stringify({
        actor: input.actor,
        tenantId: input.tenantId,
        filters: {
          types: ['decision_memo', 'rectification']
        }
      })
    });

    if (!response.ok) {
      ensurePortalReadFallbackAllowed(
        input.sessionToken,
        `Portal API audit read failed: ${response.status}.`
      );

      return {
        source: 'mock',
        auditRecords: input.fallbackAuditRecords
      };
    }

    const payload = (await response.json()) as AuditLedgerSearchResponse;

    return {
      source: 'api',
      auditRecords: mapAuditLedgerToRecords(payload.entries, input.fleetAssets)
    };
  } catch (error) {
    rethrowAuthenticatedPortalReadFailure(
      error,
      input.sessionToken,
      'Unable to load the authenticated audit ledger from the API.'
    );

    return {
      source: 'mock',
      auditRecords: input.fallbackAuditRecords
    };
  }
}

function buildDefaultActor(tenantId: string): FrontendActor {
  return {
    userId: process.env.OPS_PORTAL_ACTOR_USER_ID ?? defaultUserId,
    tenantId,
    role: toPortalRole(process.env.OPS_PORTAL_ACTOR_ROLE) ?? 'portal_admin',
    assetIds: []
  };
}

function normalizeApiBaseUrl(value: string | undefined): string | undefined {
  return value?.replace(/\/$/, '');
}

function resolveTenantId(tenantId: string | undefined, actor: FrontendActor): string {
  return tenantId ?? actor.tenantId ?? defaultTenantId;
}

function buildPortalHeaders(sessionToken?: string): Record<string, string> {
  return {
    'content-type': 'application/json',
    ...(sessionToken
      ? {
          'x-ops-portal-session': sessionToken
        }
      : {})
  };
}

function hasAuthenticatedPortalSession(sessionToken?: string): boolean {
  return typeof sessionToken === 'string' && sessionToken.trim().length > 0;
}

function ensurePortalReadFallbackAllowed(
  sessionToken: string | undefined,
  message: string
): void {
  if (hasAuthenticatedPortalSession(sessionToken)) {
    throw new PortalApiReadError(message);
  }
}

function rethrowAuthenticatedPortalReadFailure(
  error: unknown,
  sessionToken: string | undefined,
  message: string
): void {
  if (error instanceof PortalApiReadError) {
    throw error;
  }

  ensurePortalReadFallbackAllowed(sessionToken, message);
}

function filterScopedAssets(actor: FrontendActor, assets: AssetRecord[]): AssetRecord[] {
  if (actor.role !== 'asset_field_team') {
    return assets;
  }

  return assets.filter((asset) => actor.assetIds.includes(asset.id));
}

function filterScopedMaintenanceTickets(
  actor: FrontendActor,
  tickets: MaintenanceTicketRecord[]
): MaintenanceTicketRecord[] {
  if (actor.role !== 'asset_field_team') {
    return tickets;
  }

  return tickets.filter((ticket) => actor.assetIds.includes(ticket.assetId));
}

function filterScopedMaintenanceCosts(
  actor: FrontendActor,
  maintenanceCosts: MaintenanceCostRecord[]
): MaintenanceCostRecord[] {
  if (actor.role !== 'asset_field_team') {
    return maintenanceCosts;
  }

  return maintenanceCosts.filter((cost) => actor.assetIds.includes(cost.assetId));
}

function filterScopedAgendaEvents(
  actor: FrontendActor,
  events: AgendaEventRecord[]
): AgendaEventRecord[] {
  if (actor.role !== 'asset_field_team') {
    return events;
  }

  return events.filter((event) => actor.assetIds.includes(event.assetId));
}

function filterScopedMaintenanceDetail(
  actor: FrontendActor,
  ticket: MaintenanceDetailRecord | null
): MaintenanceDetailRecord | null {
  if (!ticket || actor.role !== 'asset_field_team') {
    return ticket;
  }

  return actor.assetIds.includes(ticket.assetId) ? ticket : null;
}

async function postPortalJson<TResponse>(
  path: string,
  payload: Record<string, unknown>,
  options: PortalMutationOptions
): Promise<TResponse> {
  const apiBaseUrl = normalizeApiBaseUrl(
    options.apiBaseUrl ?? process.env.OPS_PORTAL_API_BASE_URL
  );

  if (!apiBaseUrl) {
    throw new Error('OPS_PORTAL_API_BASE_URL is not configured');
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(`${apiBaseUrl}/${path}`, {
    method: 'POST',
    cache: 'no-store',
    headers: buildPortalHeaders(options.sessionToken),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Portal API mutation failed: ${response.status}`);
  }

  return (await response.json()) as TResponse;
}

function resolveAssetStatus(
  active: boolean,
  baselineStatus?: AssetRecord['status']
): AssetRecord['status'] {
  if (!active) {
    return 'unavailable';
  }

  return baselineStatus ?? 'available';
}

function toPortalRole(value: string | undefined): PortalRole | undefined {
  switch (value) {
    case 'portal_admin':
    case 'central_operations':
    case 'yachts_operations':
    case 'yachts_technical_coordination':
    case 'aviation_operations':
    case 'aviation_technical_coordination':
    case 'asset_field_team':
      return value;
    default:
      return undefined;
  }
}

function toIsoString(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

function mapCutoverApproval(
  approval: CutoverApprovalApiRecord
): CutoverApprovalApiRecord {
  return {
    approved: approval.approved,
    approvedBy: approval.approvedBy,
    approvedAt: approval.approvedAt ? toIsoString(approval.approvedAt) : null
  };
}

function serializeCutoverApprovals(approvals: {
  centralOperations: CutoverApprovalApiRecord;
  technicalCoordination: CutoverApprovalApiRecord;
  portalAdmin: CutoverApprovalApiRecord;
}) {
  return {
    centralOperations: {
      approved: approvals.centralOperations.approved,
      approvedBy: approvals.centralOperations.approvedBy,
      approvedAt: approvals.centralOperations.approvedAt
        ? toIsoString(approvals.centralOperations.approvedAt)
        : null
    },
    technicalCoordination: {
      approved: approvals.technicalCoordination.approved,
      approvedBy: approvals.technicalCoordination.approvedBy,
      approvedAt: approvals.technicalCoordination.approvedAt
        ? toIsoString(approvals.technicalCoordination.approvedAt)
        : null
    },
    portalAdmin: {
      approved: approvals.portalAdmin.approved,
      approvedBy: approvals.portalAdmin.approvedBy,
      approvedAt: approvals.portalAdmin.approvedAt
        ? toIsoString(approvals.portalAdmin.approvedAt)
        : null
    }
  };
}

function resolveAssetName(assetId: string, fleetAssets: AssetRecord[]): string {
  return fleetAssets.find((asset) => asset.id === assetId)?.name ?? assetId;
}

function resolveMaintenanceOwner(origin: MaintenanceOrigin): string {
  switch (origin) {
    case 'asset_field_team':
      return portalRoleLabels.asset_field_team;
    case 'yachts_technical_coordination':
      return portalRoleLabels.yachts_technical_coordination;
    case 'central_operations':
      return portalRoleLabels.central_operations;
  }
}

function calculateEvidenceCompleteness(evidenceTypes: MaintenanceEvidenceType[]): number {
  return [...new Set(evidenceTypes)].length / maintenanceEvidenceStages.length;
}

function resolveAgendaTitle(event: AgendaEventApiRecord): string {
  switch (event.type) {
    case 'utilization':
      return 'Utilização programada';
    case 'planned_maintenance':
      return 'Manutenção planejada';
    case 'emergency_maintenance':
      return 'Manutenção emergencial';
    case 'operational_block':
      return event.provisional ? 'Bloqueio técnico provisório' : 'Bloqueio operacional';
    case 'crew_rest':
      return event.safeMinimumBreached
        ? 'Folga da tripulação - mínimo seguro'
        : 'Folga da tripulação';
  }
}

function resolveAgendaOwner(eventType: AgendaEventApiRecord['type']): string {
  switch (eventType) {
    case 'utilization':
      return portalRoleLabels.central_operations;
    case 'planned_maintenance':
      return portalRoleLabels.asset_field_team;
    case 'emergency_maintenance':
      return portalRoleLabels.yachts_technical_coordination;
    case 'operational_block':
      return portalRoleLabels.yachts_technical_coordination;
    case 'crew_rest':
      return portalRoleLabels.central_operations;
  }
}

function buildMaintenanceSubsteps(
  status: MaintenanceStatus
): Array<{ label: string; status: 'done' | 'current' | 'pending' }> {
  const steps = [
    'Abertura do chamado',
    'Triagem técnica',
    'Execução / reparo',
    'Pagamento',
    'Fechamento'
  ];
  const currentIndexByStatus: Record<MaintenanceStatus, number> = {
    pending: 0,
    in_progress: 1,
    frozen: 2,
    payment: 3,
    completed: 4,
    cancelled: 4,
    reopened: 1
  };
  const currentIndex = currentIndexByStatus[status];

  return steps.map((label, index) => ({
    label,
    status: index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'pending'
  }));
}

function resolveEvidenceLabel(evidenceType: MaintenanceEvidenceType): string {
  switch (evidenceType) {
    case 'diagnostic':
      return 'Evidencia diagnostica';
    case 'financial_document':
      return 'Documento financeiro';
    case 'execution_evidence':
      return 'Evidencia de execucao';
    case 'quality_release':
      return 'Liberacao de qualidade';
  }
}

function buildFreezeHistory(
  freezeCount: number,
  frozenReason: FrozenReason | null | undefined,
  updatedAt: string | Date,
  owner: string
): Array<{ reason: string; at: string; by: string }> {
  return Array.from({ length: freezeCount }, () => ({
    reason: resolveFrozenReasonLabel(frozenReason),
    at: toIsoString(updatedAt),
    by: owner
  }));
}

function resolveFrozenReasonLabel(reason: FrozenReason | null | undefined): string {
  switch (reason) {
    case 'awaiting_fiscal_document':
      return 'Aguardando documento fiscal';
    case 'awaiting_supplier_response':
      return 'Aguardando resposta do fornecedor';
    case 'awaiting_central_operations_decision':
      return 'Aguardando decisao da operacao central';
    case 'awaiting_critical_part':
      return 'Aguardando parte critica';
    case 'awaiting_safe_operational_window':
      return 'Aguardando janela operacional segura';
    default:
      return 'Congelamento operacional';
  }
}

function mergeSources(
  ...sources: Array<DomainSource | 'mixed'>
): 'api' | 'mock' | 'mixed' {
  if (sources.includes('mixed')) {
    return 'mixed';
  }

  const uniqueSources = new Set(sources);

  if (uniqueSources.size === 1) {
    return uniqueSources.has('api') ? 'api' : 'mock';
  }

  return 'mixed';
}

// ─── Aviation ────────────────────────────────────────────────────────────────

type AviationOriginApi =
  | 'asset_field_team'
  | 'aviation_technical_coordination'
  | 'central_operations';

type AviationGroundReasonApi =
  | 'awaiting_part'
  | 'awaiting_authorization'
  | 'awaiting_maintenance_crew'
  | 'awaiting_operational_window';

type AviationReportQueueApiRecord = {
  id: string;
  assetId: string;
  title: string;
  category: AviationCategory;
  priority: AviationPriority;
  origin: AviationOriginApi;
  openedBy: string;
  openedAt: string | Date;
  status: AviationStatus;
  kanbanSubstatus?: AviationKanbanSubstatus | null;
  groundCount: number;
  groundReason?: AviationGroundReasonApi | null;
  returnToServiceEta?: string | Date | null;
  updatedAt: string | Date;
  evidenceCount: number;
  evidenceTypes: string[];
};

type AviationSearchApiResponse =
  | { reports: AviationReportQueueApiRecord[] }
  | { reports: []; reason: 'FORBIDDEN'; accessReason: string };

export type CreateAviationReportRequest = {
  actor: FrontendActor;
  input: {
    assetId: string;
    title?: string;
    category: AviationCategory;
    priority: AviationPriority;
    description: string;
    notes?: string;
    aircraftSystem?: string;
    origin: AviationOriginApi;
    openedBy: string;
    openedAt: string | Date;
  };
};

export type CreateAviationReportResponse =
  | { created: true; reason: 'CREATED'; report: Record<string, unknown> }
  | { created: false; reason: string; accessReason?: string; missingFields?: string[] };

export type TransitionAviationReportRequest = {
  actor: FrontendActor;
  reportId: string;
  input: {
    toStatus: AviationStatus;
    kanbanSubstatus?: AviationKanbanSubstatus;
    justification?: string;
    groundReason?: AviationGroundReasonApi;
  };
};

export type TransitionAviationReportResponse =
  | { allowed: true; reason: 'ALLOWED'; report: Record<string, unknown> }
  | { allowed: false; reason: string; accessReason?: string; missingEvidenceTypes?: string[] };

export type RegisterAviationCommentRequest = {
  actor: FrontendActor;
  reportId: string;
  input: {
    message: string;
    commentedBy: string;
    commentedAt: string | Date;
  };
};

export type RegisterAviationCommentResponse =
  | { registered: true; reason: 'REGISTERED'; notes?: string }
  | { registered: false; reason: string; accessReason?: string };

export type AviationSnapshot = {
  source: 'api' | 'mock' | 'mixed';
  aviationReports: AviationReportRecord[];
  fleetAssets: AssetRecord[];
};

export function mapAviationReportsToRecords(
  reports: AviationReportQueueApiRecord[],
  fleetAssets: AssetRecord[]
): AviationReportRecord[] {
  return reports.map((report) => ({
    id: report.id,
    reportNumber: resolveAviationReportNumber(report.id),
    assetId: report.assetId,
    assetName: resolveAssetName(report.assetId, fleetAssets),
    title: report.title,
    category: report.category,
    priority: report.priority,
    status: report.status,
    openedBy: report.openedBy,
    openedAt: toIsoString(report.openedAt),
    updatedAt: toIsoString(report.updatedAt),
    groundCount: report.groundCount,
    ...(report.groundReason ? { groundReason: report.groundReason } : {}),
    ...(report.kanbanSubstatus ? { kanbanSubstatus: report.kanbanSubstatus } : {}),
    ...(report.returnToServiceEta ? { returnToServiceEta: toIsoString(report.returnToServiceEta) } : {})
  }));
}

export async function searchAviationReports(
  request: { actor: FrontendActor; filters?: { assetIds?: string[]; statuses?: AviationStatus[] } },
  options: PortalMutationOptions = {}
): Promise<AviationSearchApiResponse> {
  const tenantId = resolveTenantId(options.tenantId, request.actor);

  return await postPortalJson('aviation/reports/search', {
    actor: request.actor,
    tenantId,
    filters: request.filters
  }, options);
}

export async function createAviationReport(
  request: CreateAviationReportRequest,
  options: PortalMutationOptions = {}
): Promise<CreateAviationReportResponse> {
  const tenantId = resolveTenantId(options.tenantId, request.actor);

  return await postPortalJson('aviation/reports', {
    actor: request.actor,
    tenantId,
    input: {
      ...request.input,
      openedAt: toIsoString(request.input.openedAt)
    }
  }, options);
}

export async function transitionAviationReport(
  request: TransitionAviationReportRequest,
  options: PortalMutationOptions = {}
): Promise<TransitionAviationReportResponse> {
  const tenantId = resolveTenantId(options.tenantId, request.actor);

  return await postPortalJson(`aviation/reports/${request.reportId}/transitions`, {
    actor: request.actor,
    tenantId,
    input: request.input
  }, options);
}

export async function registerAviationComment(
  request: RegisterAviationCommentRequest,
  options: PortalMutationOptions = {}
): Promise<RegisterAviationCommentResponse> {
  const tenantId = resolveTenantId(options.tenantId, request.actor);

  return await postPortalJson(`aviation/reports/${request.reportId}/comments`, {
    actor: request.actor,
    tenantId,
    input: {
      ...request.input,
      commentedAt: toIsoString(request.input.commentedAt)
    }
  }, options);
}

export async function fetchAviationSnapshot(
  options: PortalSnapshotOptions = {}
): Promise<AviationSnapshot> {
  const tenantId = options.tenantId ?? process.env.OPS_PORTAL_TENANT_ID ?? defaultTenantId;
  const actor = options.actor ?? buildDefaultActor(tenantId);
  const apiBaseUrl = normalizeApiBaseUrl(
    options.apiBaseUrl ?? process.env.OPS_PORTAL_API_BASE_URL
  );

  if (!apiBaseUrl) {
    ensurePortalReadFallbackAllowed(
      options.sessionToken,
      'OPS_PORTAL_API_BASE_URL is not configured for authenticated aviation reads.'
    );

    return { source: 'mock', aviationReports: [], fleetAssets: [] };
  }

  const fetchImpl = options.fetchImpl ?? fetch;

  try {
    const [reportsResponse, assetsResponse] = await Promise.all([
      fetchImpl(`${apiBaseUrl}/aviation/reports/search`, {
        method: 'POST',
        cache: 'no-store',
        headers: buildPortalHeaders(options.sessionToken),
        body: JSON.stringify({ actor, tenantId })
      }),
      fetchImpl(`${apiBaseUrl}/asset-registry/assets/search`, {
        method: 'POST',
        cache: 'no-store',
        headers: buildPortalHeaders(options.sessionToken),
        body: JSON.stringify({ actor, tenantId, filters: { modality: 'aviation' } })
      })
    ]);

    const assetsOk = assetsResponse.ok;
    const reportsOk = reportsResponse.ok;

    if (!reportsOk && !assetsOk) {
      return { source: 'mock', aviationReports: [], fleetAssets: [] };
    }

    const fleetAssets = assetsOk
      ? mergeAssetRegistryAssets(
          ((await assetsResponse.json()) as AssetRegistryListResponse).assets ?? [],
          options.fallbackAssets ?? []
        )
      : [];

    if (!reportsOk) {
      return { source: 'mixed', aviationReports: [], fleetAssets };
    }

    const reportsPayload = (await reportsResponse.json()) as AviationSearchApiResponse;

    if ('reason' in reportsPayload) {
      return { source: 'api', aviationReports: [], fleetAssets };
    }

    return {
      source: 'api',
      aviationReports: mapAviationReportsToRecords(reportsPayload.reports, fleetAssets),
      fleetAssets
    };
  } catch {
    return { source: 'mock', aviationReports: [], fleetAssets: [] };
  }
}

export type AviationStatsResult = {
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  totalAogEvents: number;
  activeAogCount: number;
  totalReports: number;
};

type FetchAviationStatsOptions = {
  actor: FrontendActor;
  tenantId: string;
  sessionToken?: string;
};

export async function fetchAviationStats(
  options: FetchAviationStatsOptions
): Promise<{ found: true; stats: AviationStatsResult } | { found: false; reason: string }> {
  try {
    return await postPortalJson<{ found: true; stats: AviationStatsResult } | { found: false; reason: string; accessReason?: string }>(
      'aviation/stats',
      { actor: options.actor, tenantId: options.tenantId },
      { sessionToken: options.sessionToken }
    );
  } catch {
    return { found: false, reason: 'REQUEST_FAILED' };
  }
}

export type AviationAgendaSnapshot = {
  source: 'api' | 'mock' | 'mixed';
  fleetAssets: AssetRecord[];
  agendaEvents: AgendaEventRecord[];
};

export async function fetchAviationAgendaSnapshot(
  options: PortalSnapshotOptions = {}
): Promise<AviationAgendaSnapshot> {
  const snapshot = await fetchPortalOperationsSnapshot(options);
  const aviationAssets = snapshot.fleetAssets.filter((a) => a.modality === 'aviation');
  const aviationAssetIds = new Set(aviationAssets.map((a) => a.id));

  return {
    source: snapshot.source,
    fleetAssets: aviationAssets,
    agendaEvents: snapshot.agendaEvents.filter((e) => aviationAssetIds.has(e.assetId))
  };
}

function resolveAviationReportNumber(id: string): string {
  const numericId = id.replace(/\D+/g, '');

  if (numericId.length > 0) {
    return numericId;
  }

  return id.slice(0, 8).toUpperCase();
}
