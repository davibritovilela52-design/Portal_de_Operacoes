import { randomUUID } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';

import {
  AccessActor,
  AccessDecisionReason,
  AccessPolicyService
} from '../access/access-policy.service.js';
import {
  CreateMaintenanceTicketInput,
  CreateMaintenanceTicketResult,
  MaintenanceEvidence,
  MaintenanceUrgency,
  MaintenanceSubstep,
  MaintenanceTicket,
  MaintenanceWorkflowService
} from './maintenance-workflow.service.js';
import {
  EvidenceAccessGrant,
  EvidenceSecurityService,
  EvidenceUploadPolicyDecision
} from '../governance/evidence-security.service.js';
import {
  MaintenanceTicketWriter,
  PrismaMaintenanceTicketRepository
} from './maintenance-ticket.repository.js';
import {
  MaintenanceEvidenceWriter,
  PersistedMaintenanceEvidence,
  PrismaMaintenanceEvidenceRepository
} from './maintenance-evidence.repository.js';
import {
  MaintenanceCostReader,
  PersistedMaintenanceCost,
  PrismaMaintenanceCostRepository
} from './maintenance-cost.repository.js';
import { appendMaintenanceTicketComment } from './maintenance-ticket-comments.js';

export type PresentedMaintenanceCategory = MaintenanceTicket['category'] | 'warranty';

export type MaintenanceSystem =
  | 'electrical'
  | 'hydraulic'
  | 'mechanical'
  | 'metalwork'
  | 'upholstery'
  | 'painting'
  | 'equipment'
  | 'electronics'
  | 'automation'
  | 'image_sound'
  | 'other';

export type CreateMaintenanceTicketCommand = {
  actor: AccessActor;
  tenantId: string;
  input: CreateMaintenanceTicketInput;
};

export type CreateMaintenanceTicketCommandResult =
  | CreateMaintenanceTicketResult
  | {
      created: false;
      reason: 'FORBIDDEN';
      accessReason: AccessDecisionReason;
    };

export type TransitionMaintenanceTicketCommand = {
  actor: AccessActor;
  tenantId: string;
  ticketId: string;
  input: {
    toStatus: MaintenanceTicket['status'];
    kanbanSubstatus?: MaintenanceTicket['kanbanSubstatus'];
    justification?: string;
    frozenReason?: MaintenanceTicket['frozenReason'];
  };
};

export type TransitionMaintenanceTicketCommandResult =
  | ReturnType<MaintenanceWorkflowService['transition']>
  | {
      allowed: false;
      reason: 'FORBIDDEN';
      accessReason: AccessDecisionReason;
    }
  | {
      allowed: false;
      reason: 'NOT_FOUND';
    };

export type RegisterMaintenanceCommentCommand = {
  actor: AccessActor;
  tenantId: string;
  ticketId: string;
  input: {
    message: string;
    commentedBy: string;
    commentedAt: Date;
  };
};

export type RegisterMaintenanceCommentCommandResult =
  | {
      registered: true;
      reason: 'REGISTERED';
      notes?: string;
    }
  | {
      registered: false;
      reason: 'FORBIDDEN';
      accessReason: AccessDecisionReason;
    }
  | {
      registered: false;
      reason: 'NOT_FOUND' | 'COMMENT_REQUIRED';
    };

export type UpdateMaintenanceSubstepCommand = {
  actor: AccessActor;
  tenantId: string;
  ticketId: string;
  input: {
    currentSubstep: MaintenanceSubstep;
  };
};

export type UpdateMaintenanceSubstepCommandResult =
  | ReturnType<MaintenanceWorkflowService['updateSubstep']>
  | {
      allowed: false;
      reason: 'FORBIDDEN';
      accessReason: AccessDecisionReason;
    }
  | {
      allowed: false;
      reason: 'NOT_FOUND';
    };

export type AttachMaintenanceEvidenceCommand = {
  actor: AccessActor;
  tenantId: string;
  ticketId: string;
  input: Omit<MaintenanceEvidence, 'storageKey' | 'antivirusStatus'>;
};

export type AttachMaintenanceEvidenceCommandResult =
  | {
      attached: true;
      reason: 'ATTACHED';
      evidence: MaintenanceEvidence;
    }
  | {
      attached: false;
      reason: 'FORBIDDEN';
      accessReason: AccessDecisionReason;
    }
  | {
      attached: false;
      reason: 'NOT_FOUND';
    }
  | {
      attached: false;
      reason: 'UPLOAD_POLICY_BLOCKED';
      uploadReason: Exclude<EvidenceUploadPolicyDecision, { allowed: true }>['reason'];
    };

export type RequestMaintenanceEvidenceAccessCommand = {
  actor: AccessActor;
  tenantId: string;
  ticketId: string;
  evidenceId: string;
};

export type RequestMaintenanceEvidenceAccessCommandResult =
  | {
      allowed: true;
      reason: 'ACCESS_GRANTED';
      access: EvidenceAccessGrant;
    }
  | {
      allowed: false;
      reason: 'FORBIDDEN';
      accessReason: AccessDecisionReason;
    }
  | {
      allowed: false;
      reason: 'NOT_FOUND';
    };

export type SearchMaintenanceTicketsCommand = {
  actor: AccessActor;
  tenantId: string;
  filters?: {
    assetIds?: string[];
    statuses?: MaintenanceTicket['status'][];
    priorities?: MaintenanceTicket['priority'][];
    categories?: MaintenanceTicket['category'][];
  };
};

export type MaintenanceTicketQueueView = {
  id: string;
  legacyRowId?: string;
  assetId: string;
  title: string;
  category: PresentedMaintenanceCategory;
  priority: MaintenanceTicket['priority'];
  urgency?: MaintenanceUrgency;
  description: string;
  maintenanceSystem?: MaintenanceSystem;
  origin: MaintenanceTicket['origin'];
  openedBy: string;
  openedAt: Date;
  status: MaintenanceTicket['status'];
  kanbanSubstatus?: MaintenanceTicket['kanbanSubstatus'];
  currentSubstep?: MaintenanceTicket['currentSubstep'];
  freezeCount: number;
  frozenReason?: MaintenanceTicket['frozenReason'];
  updatedAt: Date;
  evidenceCount: number;
  evidenceTypes: MaintenanceEvidence['type'][];
};

export type SearchMaintenanceTicketsCommandResult =
  | {
      tickets: MaintenanceTicketQueueView[];
    }
  | {
      tickets: [];
      reason: 'FORBIDDEN';
      accessReason: AccessDecisionReason;
    };

export type SearchMaintenanceSummaryCommand = {
  actor: AccessActor;
  tenantId: string;
};

export type MaintenanceCostSummaryView = {
  id: string;
  maintenanceTicketId: string;
  assetId: string;
  supplierId?: string;
  description: string;
  amount: number;
  currency: string;
  registeredBy: string;
  registeredAt: Date;
};

export type SearchMaintenanceSummaryCommandResult =
  | {
      costs: MaintenanceCostSummaryView[];
    }
  | {
      costs: [];
      reason: 'FORBIDDEN';
      accessReason: AccessDecisionReason;
    };

export type GetMaintenanceTicketDetailCommand = {
  actor: AccessActor;
  tenantId: string;
  ticketId: string;
};

export type MaintenanceTicketDetailView = MaintenanceTicketQueueView & {
  notes?: string;
  legacyTicketCode?: string;
  evidences: PersistedMaintenanceEvidence[];
};

export type GetMaintenanceTicketDetailCommandResult =
  | {
      found: true;
      ticket: MaintenanceTicketDetailView;
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
export class MaintenanceApplicationService {
  constructor(
    private readonly accessPolicyService: AccessPolicyService,
    private readonly maintenanceWorkflowService: MaintenanceWorkflowService,
    @Inject(PrismaMaintenanceTicketRepository)
    private readonly maintenanceTicketRepository: MaintenanceTicketWriter,
    @Inject(PrismaMaintenanceCostRepository)
    private readonly maintenanceCostRepository: MaintenanceCostReader,
    @Inject(PrismaMaintenanceEvidenceRepository)
    private readonly maintenanceEvidenceRepository: MaintenanceEvidenceWriter,
    private readonly evidenceSecurityService: EvidenceSecurityService
  ) {}

  getCatalog(): ReturnType<MaintenanceWorkflowService['getCatalog']> {
    return this.maintenanceWorkflowService.getCatalog();
  }

  async searchTickets(
    command: SearchMaintenanceTicketsCommand
  ): Promise<SearchMaintenanceTicketsCommandResult> {
    const accessDecision = this.accessPolicyService.authorize({
      actor: command.actor,
      action: 'maintenance.ticket.search',
      subject: {
        tenantId: command.tenantId
      }
    });

    if (!accessDecision.allowed) {
      return {
        tickets: [],
        reason: 'FORBIDDEN',
        accessReason: accessDecision.reason
      };
    }

    const tickets = await this.maintenanceTicketRepository.search(command.tenantId, {
      ...command.filters,
      assetIds: this.resolveVisibleAssetIds(command.actor, command.filters?.assetIds)
    });
    const evidences = await this.maintenanceEvidenceRepository.listByTicketIds(
      command.tenantId,
      tickets.map((ticket) => ticket.id)
    );
    const evidencesByTicketId = new Map<string, PersistedMaintenanceEvidence[]>();

    for (const evidence of evidences) {
      const bucket = evidencesByTicketId.get(evidence.ticketId);

      if (bucket) {
        bucket.push(evidence);
        continue;
      }

      evidencesByTicketId.set(evidence.ticketId, [evidence]);
    }

    return {
      tickets: tickets.map((ticket) =>
        this.toQueueView(ticket, evidencesByTicketId.get(ticket.id) ?? [])
      )
    };
  }

  async searchSummary(
    command: SearchMaintenanceSummaryCommand
  ): Promise<SearchMaintenanceSummaryCommandResult> {
    const accessDecision = this.accessPolicyService.authorize({
      actor: command.actor,
      action: 'maintenance.ticket.search',
      subject: {
        tenantId: command.tenantId
      }
    });

    if (!accessDecision.allowed) {
      return {
        costs: [],
        reason: 'FORBIDDEN',
        accessReason: accessDecision.reason
      };
    }

    const visibleTickets = await this.maintenanceTicketRepository.search(command.tenantId, {
      assetIds: this.resolveVisibleAssetIds(command.actor)
    });
    const ticketIds = visibleTickets.map((ticket) => ticket.id);
    const ticketById = new Map(visibleTickets.map((ticket) => [ticket.id, ticket]));
    const costs = await this.maintenanceCostRepository.listByTicketIds(command.tenantId, ticketIds);

    return {
      costs: costs.flatMap((cost) => {
        const ticket = ticketById.get(cost.maintenanceTicketId);

        if (!ticket) {
          return [];
        }

        return [this.toCostSummaryView(cost, ticket.assetId)];
      })
    };
  }

  async createTicket(
    command: CreateMaintenanceTicketCommand
  ): Promise<CreateMaintenanceTicketCommandResult> {
    const accessDecision = this.accessPolicyService.authorize({
      actor: command.actor,
      action: 'maintenance.ticket.create',
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

    const result = this.maintenanceWorkflowService.createTicket(command.input);

    if (result.created) {
      await this.maintenanceTicketRepository.create(command.tenantId, result.ticket);
    }

    return result;
  }

  async transitionTicket(
    command: TransitionMaintenanceTicketCommand
  ): Promise<TransitionMaintenanceTicketCommandResult> {
    const currentTicket = await this.maintenanceTicketRepository.findById(
      command.tenantId,
      command.ticketId
    );

    if (!currentTicket) {
      return {
        allowed: false,
        reason: 'NOT_FOUND'
      };
    }

    const accessDecision = this.accessPolicyService.authorize({
      actor: command.actor,
      action: 'maintenance.ticket.transition',
      subject: {
        tenantId: command.tenantId,
        assetId: currentTicket.assetId
      }
    });

    if (!accessDecision.allowed) {
      return {
        allowed: false,
        reason: 'FORBIDDEN',
        accessReason: accessDecision.reason
      };
    }

    const transitionResult = this.maintenanceWorkflowService.transition(
      this.toDomainTicket(currentTicket),
      command.input,
      (
        await this.maintenanceEvidenceRepository.listByTicket(command.tenantId, command.ticketId)
      ).map((evidence) => evidence.type)
    );

    if (!transitionResult.allowed) {
      return transitionResult;
    }

    if (transitionResult.ticket.status === currentTicket.status) {
      await this.maintenanceTicketRepository.update(
        command.tenantId,
        command.ticketId,
        transitionResult.ticket
      );
    } else {
      await this.maintenanceTicketRepository.updateStatusWithTransitionHistory(
        command.tenantId,
        command.ticketId,
        transitionResult.ticket,
        {
          fromStatus: currentTicket.status,
          transitionedBy: command.actor.userId,
          at: new Date()
        }
      );
    }

    return transitionResult;
  }

  async updateSubstep(
    command: UpdateMaintenanceSubstepCommand
  ): Promise<UpdateMaintenanceSubstepCommandResult> {
    const currentTicket = await this.maintenanceTicketRepository.findById(
      command.tenantId,
      command.ticketId
    );

    if (!currentTicket) {
      return {
        allowed: false,
        reason: 'NOT_FOUND'
      };
    }

    const accessDecision = this.accessPolicyService.authorize({
      actor: command.actor,
      action: 'maintenance.ticket.transition',
      subject: {
        tenantId: command.tenantId,
        assetId: currentTicket.assetId
      }
    });

    if (!accessDecision.allowed) {
      return {
        allowed: false,
        reason: 'FORBIDDEN',
        accessReason: accessDecision.reason
      };
    }

    const updateResult = this.maintenanceWorkflowService.updateSubstep(
      this.toDomainTicket(currentTicket),
      command.input
    );

    if (!updateResult.allowed) {
      return updateResult;
    }

    await this.maintenanceTicketRepository.update(command.tenantId, command.ticketId, updateResult.ticket);

    return updateResult;
  }

  async attachEvidence(
    command: AttachMaintenanceEvidenceCommand
  ): Promise<AttachMaintenanceEvidenceCommandResult> {
    const currentTicket = await this.maintenanceTicketRepository.findById(
      command.tenantId,
      command.ticketId
    );

    if (!currentTicket) {
      return {
        attached: false,
        reason: 'NOT_FOUND'
      };
    }

    const accessDecision = this.accessPolicyService.authorize({
      actor: command.actor,
      action: 'maintenance.evidence.attach',
      subject: {
        tenantId: command.tenantId,
        assetId: currentTicket.assetId
      }
    });

    if (!accessDecision.allowed) {
      return {
        attached: false,
        reason: 'FORBIDDEN',
        accessReason: accessDecision.reason
      };
    }

    const uploadDecision = this.evidenceSecurityService.validateUpload(command.input);

    if (!uploadDecision.allowed) {
      return {
        attached: false,
        reason: 'UPLOAD_POLICY_BLOCKED',
        uploadReason: uploadDecision.reason
      };
    }

    const evidence = {
      ...command.input,
      ...this.evidenceSecurityService.prepareEvidenceUpload(command.ticketId, command.input)
    };

    await this.maintenanceEvidenceRepository.create(
      command.tenantId,
      command.ticketId,
      evidence
    );

    await this.maintenanceTicketRepository.update(
      command.tenantId,
      command.ticketId,
      this.maintenanceWorkflowService.synchronizeKanbanSubstatus(
        this.toDomainTicket(currentTicket)
      )
    );

    return {
      attached: true,
      reason: 'ATTACHED',
      evidence
    };
  }

  async registerComment(
    command: RegisterMaintenanceCommentCommand
  ): Promise<RegisterMaintenanceCommentCommandResult> {
    const currentTicket = await this.maintenanceTicketRepository.findById(
      command.tenantId,
      command.ticketId
    );

    if (!currentTicket) {
      return {
        registered: false,
        reason: 'NOT_FOUND'
      };
    }

    const accessDecision = this.accessPolicyService.authorize({
      actor: command.actor,
      action: 'maintenance.ticket.comment',
      subject: {
        tenantId: command.tenantId,
        assetId: currentTicket.assetId
      }
    });

    if (!accessDecision.allowed) {
      return {
        registered: false,
        reason: 'FORBIDDEN',
        accessReason: accessDecision.reason
      };
    }

    if (!command.input.message.trim()) {
      return {
        registered: false,
        reason: 'COMMENT_REQUIRED'
      };
    }

    const nextTicket = this.toDomainTicket(currentTicket);
    nextTicket.notes = appendMaintenanceTicketComment(nextTicket.notes, {
      id: `comment-${randomUUID().slice(0, 8)}`,
      author: command.input.commentedBy.trim(),
      message: command.input.message.trim(),
      at: command.input.commentedAt.toISOString()
    });

    const updatedTicket = await this.maintenanceTicketRepository.update(
      command.tenantId,
      command.ticketId,
      nextTicket
    );

    return {
      registered: true,
      reason: 'REGISTERED',
      notes: typeof updatedTicket.notes === 'string' ? updatedTicket.notes : undefined
    };
  }

  async requestEvidenceAccess(
    command: RequestMaintenanceEvidenceAccessCommand
  ): Promise<RequestMaintenanceEvidenceAccessCommandResult> {
    const currentTicket = await this.maintenanceTicketRepository.findById(
      command.tenantId,
      command.ticketId
    );

    if (!currentTicket) {
      return {
        allowed: false,
        reason: 'NOT_FOUND'
      };
    }

    const accessDecision = this.accessPolicyService.authorize({
      actor: command.actor,
      action: 'maintenance.evidence.read',
      subject: {
        tenantId: command.tenantId,
        assetId: currentTicket.assetId
      }
    });

    if (!accessDecision.allowed) {
      return {
        allowed: false,
        reason: 'FORBIDDEN',
        accessReason: accessDecision.reason
      };
    }

    const evidence = await this.maintenanceEvidenceRepository.findById(
      command.tenantId,
      command.ticketId,
      command.evidenceId
    );

    if (!evidence) {
      return {
        allowed: false,
        reason: 'NOT_FOUND'
      };
    }

    return {
      allowed: true,
      reason: 'ACCESS_GRANTED',
      access: this.evidenceSecurityService.issueAccessGrant({
        storageKey: evidence.storageKey,
        requestedBy: command.actor.userId,
        ttlSeconds: 60
      })
    };
  }

  async getTicketDetail(
    command: GetMaintenanceTicketDetailCommand
  ): Promise<GetMaintenanceTicketDetailCommandResult> {
    const currentTicket = await this.maintenanceTicketRepository.findById(
      command.tenantId,
      command.ticketId
    );

    if (!currentTicket) {
      return {
        found: false,
        reason: 'NOT_FOUND'
      };
    }

    const accessDecision = this.accessPolicyService.authorize({
      actor: command.actor,
      action: 'maintenance.ticket.read',
      subject: {
        tenantId: command.tenantId,
        assetId: currentTicket.assetId
      }
    });

    if (!accessDecision.allowed) {
      return {
        found: false,
        reason: 'FORBIDDEN',
        accessReason: accessDecision.reason
      };
    }

    const evidences = await this.maintenanceEvidenceRepository.listByTicket(
      command.tenantId,
      command.ticketId
    );

    return {
      found: true,
      ticket: {
        ...this.toQueueView(currentTicket, evidences),
        notes:
          'notes' in currentTicket && typeof currentTicket.notes === 'string'
            ? currentTicket.notes
            : undefined,
        legacyTicketCode:
          'legacyTicketCode' in currentTicket && typeof currentTicket.legacyTicketCode === 'string'
            ? currentTicket.legacyTicketCode
            : undefined,
        evidences
      }
    };
  }

  private toDomainTicket(ticket: {
    assetId: string;
    title?: string | null;
    category: MaintenanceTicket['category'];
    priority: MaintenanceTicket['priority'];
    urgency?: MaintenanceTicket['urgency'] | null;
    description: string;
    notes?: string | null;
    legacyTicketCode?: string | null;
    legacyMetadata?: Record<string, unknown> | null;
    origin: MaintenanceTicket['origin'];
    openedBy: string;
    openedAt: Date;
    status: MaintenanceTicket['status'];
    kanbanSubstatus?: MaintenanceTicket['kanbanSubstatus'] | null;
    currentSubstep?: MaintenanceTicket['currentSubstep'] | null;
    freezeCount: number;
    frozenReason?: MaintenanceTicket['frozenReason'];
  }): MaintenanceTicket {
    return {
      assetId: ticket.assetId,
      title: ticket.title ?? undefined,
      category: ticket.category,
      priority: ticket.priority,
      urgency: ticket.urgency ?? undefined,
      description: ticket.description,
      notes: ticket.notes ?? undefined,
      legacyTicketCode: ticket.legacyTicketCode ?? undefined,
      legacyMetadata: ticket.legacyMetadata ?? undefined,
      origin: ticket.origin,
      openedBy: ticket.openedBy,
      openedAt: ticket.openedAt,
      status: ticket.status,
      kanbanSubstatus: ticket.kanbanSubstatus ?? undefined,
      currentSubstep: ticket.currentSubstep ?? undefined,
      freezeCount: ticket.freezeCount,
      frozenReason: ticket.frozenReason
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

  private toQueueView(
    ticket: {
      id: string;
      assetId: string;
      title?: string | null;
      category: MaintenanceTicket['category'];
      priority: MaintenanceTicket['priority'];
      urgency?: MaintenanceTicket['urgency'] | null;
      description: string;
      notes?: string | null;
      legacyTicketCode?: string | null;
      legacyMetadata?: Record<string, unknown> | null;
      origin: MaintenanceTicket['origin'];
      openedBy: string;
      openedAt: Date;
      status: MaintenanceTicket['status'];
      kanbanSubstatus?: MaintenanceTicket['kanbanSubstatus'] | null;
      currentSubstep?: MaintenanceTicket['currentSubstep'] | null;
      freezeCount: number;
      frozenReason?: MaintenanceTicket['frozenReason'] | null;
      updatedAt: Date;
    },
    evidences: PersistedMaintenanceEvidence[]
  ): MaintenanceTicketQueueView {
    return {
      id: ticket.id,
      legacyRowId: this.readLegacyRowId(ticket.legacyMetadata),
      assetId: ticket.assetId,
      title: ticket.title?.trim() || ticket.description,
      category: this.resolvePresentedCategory(ticket),
      priority: ticket.priority,
      ...(ticket.urgency ? { urgency: ticket.urgency } : {}),
      description: ticket.description,
      maintenanceSystem: this.readMaintenanceSystem(ticket.legacyMetadata),
      origin: ticket.origin,
      openedBy: ticket.openedBy,
      openedAt: ticket.openedAt,
      status: ticket.status,
      kanbanSubstatus: ticket.kanbanSubstatus ?? undefined,
      currentSubstep: ticket.currentSubstep ?? undefined,
      freezeCount: ticket.freezeCount,
      frozenReason: ticket.frozenReason ?? undefined,
      updatedAt: ticket.updatedAt,
      evidenceCount: evidences.length,
      evidenceTypes: [...new Set(evidences.map((evidence) => evidence.type))]
    };
  }

  private toCostSummaryView(
    cost: PersistedMaintenanceCost,
    assetId: string
  ): MaintenanceCostSummaryView {
    return {
      id: cost.id,
      maintenanceTicketId: cost.maintenanceTicketId,
      assetId,
      ...(cost.supplierId ? { supplierId: cost.supplierId } : {}),
      description: cost.description,
      amount: cost.amount,
      currency: cost.currency,
      registeredBy: cost.registeredBy,
      registeredAt: cost.registeredAt
    };
  }

  private resolvePresentedCategory(ticket: {
    category: MaintenanceTicket['category'];
    legacyMetadata?: Record<string, unknown> | null;
  }): PresentedMaintenanceCategory {
    const requestedCategory = ticket.legacyMetadata?.requestedCategory;

    return requestedCategory === 'warranty' ? 'warranty' : ticket.category;
  }

  private readLegacyRowId(legacyMetadata?: Record<string, unknown> | null): string | undefined {
    if (!legacyMetadata) {
      return undefined;
    }

    const legacyRowId = legacyMetadata.legacyRowId;
    return typeof legacyRowId === 'string' && legacyRowId.trim().length > 0
      ? legacyRowId.trim()
      : undefined;
  }

  private readMaintenanceSystem(
    legacyMetadata?: Record<string, unknown> | null
  ): MaintenanceSystem | undefined {
    const maintenanceSystem = legacyMetadata?.maintenanceSystem;

    switch (maintenanceSystem) {
      case 'electrical':
      case 'hydraulic':
      case 'mechanical':
      case 'metalwork':
      case 'upholstery':
      case 'painting':
      case 'equipment':
      case 'electronics':
      case 'automation':
      case 'image_sound':
      case 'other':
        return maintenanceSystem;
      default:
        return undefined;
    }
  }
}
