import { Inject, Injectable, Optional } from '@nestjs/common';

import {
  AccessActor,
  AccessDecisionReason,
  AccessPolicyService
} from '../access/access-policy.service.js';
import {
  AuditApplicationService,
  CreateDecisionMemoCommandResult
} from '../audit/audit-application.service.js';
import {
  AuditDecisionMemo,
  CriticalActionJustification
} from '../audit/audit-governance.service.js';
import { ObservabilityEventLogService } from '../observability/observability-event-log.service.js';
import { ObservabilityMetricsService } from '../observability/observability-metrics.service.js';
import {
  AgendaEvent,
  AgendaSchedulingService,
  ProvisionalBlockStatus,
  ScheduleAgendaEventResult
} from './agenda-scheduling.service.js';
import {
  AgendaEventWriter,
  PersistedAgendaEvent,
  PrismaAgendaEventRepository
} from './agenda-event.repository.js';

export type ScheduleAgendaEventCommand = {
  actor: AccessActor;
  tenantId: string;
  candidateEvent: AgendaEvent;
};

export type ScheduleAgendaEventCommandResult =
  | ScheduleAgendaEventResult
  | {
      allowed: false;
      reason: 'FORBIDDEN';
      accessReason: AccessDecisionReason;
    };

export type RescheduleAgendaEventCommand = {
  actor: AccessActor;
  tenantId: string;
  eventId: string;
  updatedEvent: AgendaEvent;
};

export type RescheduleAgendaEventCommandResult =
  | {
      allowed: true;
      reason: 'UPDATED';
      event: AgendaEvent;
    }
  | {
      allowed: false;
      reason: 'ASSET_TIME_CONFLICT';
      conflictingEventId?: string;
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

export type DeleteAgendaEventCommand = {
  actor: AccessActor;
  tenantId: string;
  eventId: string;
};

export type DeleteAgendaEventCommandResult =
  | {
      allowed: true;
      reason: 'DELETED';
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

export type OverrideAgendaConflictCommand = {
  actor: AccessActor;
  tenantId: string;
  eventId: string;
  conflictingEventId: string;
  resolvedEvent: AgendaEvent;
  justification: CriticalActionJustification;
};

export type OverrideAgendaConflictCommandResult =
  | {
      allowed: true;
      reason: 'OVERRIDDEN';
      event: AgendaEvent;
      memo: AuditDecisionMemo;
    }
  | {
      allowed: false;
      reason: 'ASSET_TIME_CONFLICT';
      conflictingEventId?: string;
    }
  | {
      allowed: false;
      reason: 'FORBIDDEN';
      accessReason: AccessDecisionReason;
    }
  | {
      allowed: false;
      reason: 'NOT_FOUND';
    }
  | {
      allowed: false;
      reason: 'CONFLICT_NOT_ACTIVE';
    }
  | {
      allowed: false;
      reason: 'JUSTIFICATION_REQUIRED';
    };

export type ApplyProvisionalBlockCommand = {
  actor: AccessActor;
  tenantId: string;
  input: {
    id?: string;
    assetId: string;
    startsAt: Date;
    endsAt: Date;
  };
};

export type ApplyProvisionalBlockCommandResult =
  | {
      allowed: true;
      reason: 'PROVISIONAL_BLOCK_APPLIED';
      event: AgendaEvent;
    }
  | {
      allowed: false;
      reason: 'ASSET_TIME_CONFLICT';
      conflictingEventId?: string;
    }
  | {
      allowed: false;
      reason: 'FORBIDDEN';
      accessReason: AccessDecisionReason;
    };

export type ValidateProvisionalBlockCommand = {
  actor: AccessActor;
  tenantId: string;
  eventId: string;
  validatedAt: Date;
};

export type ValidateProvisionalBlockCommandResult =
  | {
      allowed: true;
      reason: 'VALIDATED';
      event: AgendaEvent;
    }
  | {
      allowed: false;
      reason: 'FORBIDDEN';
      accessReason: AccessDecisionReason;
    }
  | {
      allowed: false;
      reason: 'NOT_FOUND' | 'NOT_PROVISIONAL_BLOCK';
    };

export type GetProvisionalBlockStatusCommand = {
  tenantId: string;
  eventId: string;
  now: Date;
};

export type GetProvisionalBlockStatusCommandResult =
  | {
      found: true;
      reason: 'STATUS_EVALUATED';
      status: ProvisionalBlockStatus;
    }
  | {
      found: false;
      reason: 'NOT_FOUND' | 'NOT_PROVISIONAL_BLOCK';
    };

export type SearchAgendaEventsCommand = {
  actor: AccessActor;
  tenantId: string;
  filters?: {
    assetIds?: string[];
    types?: AgendaEvent['type'][];
    startsAt?: Date;
    endsAt?: Date;
  };
};

export type AgendaEventView = {
  id: string;
  assetId: string;
  type: AgendaEvent['type'];
  title?: string | null;
  description?: string | null;
  startsAt: Date;
  endsAt: Date;
  safeMinimumBreached: boolean;
  provisional: boolean;
  validatedAt: Date | null;
  updatedAt: Date;
};

export type SearchAgendaEventsCommandResult =
  | {
      events: AgendaEventView[];
    }
  | {
      events: [];
      reason: 'FORBIDDEN';
      accessReason: AccessDecisionReason;
    };

@Injectable()
export class AgendaApplicationService {
  constructor(
    private readonly accessPolicyService: AccessPolicyService,
    private readonly agendaSchedulingService: AgendaSchedulingService,
    @Inject(PrismaAgendaEventRepository)
    private readonly agendaEventRepository: AgendaEventWriter,
    private readonly auditApplicationService: AuditApplicationService,
    @Optional()
    private readonly observabilityMetricsService?: ObservabilityMetricsService,
    @Optional()
    private readonly observabilityEventLogService?: ObservabilityEventLogService
  ) {}

  getCatalog(): ReturnType<AgendaSchedulingService['getCatalog']> {
    return this.agendaSchedulingService.getCatalog();
  }

  async searchEvents(
    command: SearchAgendaEventsCommand
  ): Promise<SearchAgendaEventsCommandResult> {
    const accessDecision = this.accessPolicyService.authorize({
      actor: command.actor,
      action: 'agenda.event.search',
      subject: {
        tenantId: command.tenantId
      }
    });

    if (!accessDecision.allowed) {
      return {
        events: [],
        reason: 'FORBIDDEN',
        accessReason: accessDecision.reason
      };
    }

    const events = (
      await this.agendaEventRepository.search(command.tenantId, {
        ...command.filters,
        assetIds: this.resolveVisibleAssetIds(command.actor, command.filters?.assetIds)
      })
    ).map((event) => this.toAgendaEventView(event));

    return {
      events
    };
  }

  async scheduleEvent(
    command: ScheduleAgendaEventCommand
  ): Promise<ScheduleAgendaEventCommandResult> {
    const accessDecision = this.accessPolicyService.authorize({
      actor: command.actor,
      action: 'agenda.event.create',
      subject: {
        tenantId: command.tenantId,
        assetId: command.candidateEvent.assetId
      }
    });

    if (!accessDecision.allowed) {
      return {
        allowed: false,
        reason: 'FORBIDDEN',
        accessReason: accessDecision.reason
      };
    }

    const existingEvents = await this.agendaEventRepository.listByAssetWindow(
      command.tenantId,
      command.candidateEvent.assetId,
      command.candidateEvent.startsAt,
      command.candidateEvent.endsAt
    );
    const result = this.agendaSchedulingService.scheduleEvent(existingEvents, command.candidateEvent);

    if (!result.allowed) {
      this.recordAgendaConflict(command.candidateEvent, result);

      return result;
    }

    await this.agendaEventRepository.create(command.tenantId, result.event);

    return result;
  }

  async rescheduleEvent(
    command: RescheduleAgendaEventCommand
  ): Promise<RescheduleAgendaEventCommandResult> {
    const currentEvent = await this.agendaEventRepository.findById(command.tenantId, command.eventId);

    if (!currentEvent) {
      return {
        allowed: false,
        reason: 'NOT_FOUND'
      };
    }

    const accessDecision = this.accessPolicyService.authorize({
      actor: command.actor,
      action: 'agenda.event.update',
      subject: {
        tenantId: command.tenantId,
        assetId: currentEvent.assetId
      }
    });

    if (!accessDecision.allowed) {
      return {
        allowed: false,
        reason: 'FORBIDDEN',
        accessReason: accessDecision.reason
      };
    }

    const existingEvents = (
      await this.agendaEventRepository.listByAssetWindow(
        command.tenantId,
        command.updatedEvent.assetId,
        command.updatedEvent.startsAt,
        command.updatedEvent.endsAt
      )
    ).filter((event) => event.id !== command.eventId);

    const result = this.agendaSchedulingService.scheduleEvent(existingEvents, command.updatedEvent);

    if (!result.allowed) {
      this.recordAgendaConflict(command.updatedEvent, result);

      return result;
    }

    await this.agendaEventRepository.update(command.tenantId, command.eventId, result.event);

    return {
      allowed: true,
      reason: 'UPDATED',
      event: result.event
    };
  }

  async deleteEvent(command: DeleteAgendaEventCommand): Promise<DeleteAgendaEventCommandResult> {
    const currentEvent = await this.agendaEventRepository.findById(command.tenantId, command.eventId);

    if (!currentEvent) {
      return {
        allowed: false,
        reason: 'NOT_FOUND'
      };
    }

    const accessDecision = this.accessPolicyService.authorize({
      actor: command.actor,
      action: 'agenda.event.delete',
      subject: {
        tenantId: command.tenantId,
        assetId: currentEvent.assetId
      }
    });

    if (!accessDecision.allowed) {
      return {
        allowed: false,
        reason: 'FORBIDDEN',
        accessReason: accessDecision.reason
      };
    }

    await this.agendaEventRepository.delete(command.tenantId, command.eventId);
    this.observabilityEventLogService?.record({
      domain: 'agenda',
      action: 'event_delete',
      entityId: command.eventId,
      outcome: 'success',
      metadata: {
        assetId: currentEvent.assetId
      }
    });

    return {
      allowed: true,
      reason: 'DELETED'
    };
  }

  async overrideConflict(
    command: OverrideAgendaConflictCommand
  ): Promise<OverrideAgendaConflictCommandResult> {
    const currentEvent = await this.agendaEventRepository.findById(command.tenantId, command.eventId);
    const conflictingEvent = await this.agendaEventRepository.findById(
      command.tenantId,
      command.conflictingEventId
    );

    if (!currentEvent || !conflictingEvent) {
      return {
        allowed: false,
        reason: 'NOT_FOUND'
      };
    }

    const accessDecision = this.accessPolicyService.authorize({
      actor: command.actor,
      action: 'agenda.conflict.override',
      subject: {
        tenantId: command.tenantId,
        assetId: currentEvent.assetId
      }
    });

    if (!accessDecision.allowed) {
      return {
        allowed: false,
        reason: 'FORBIDDEN',
        accessReason: accessDecision.reason
      };
    }

    if (
      currentEvent.assetId !== conflictingEvent.assetId ||
      currentEvent.assetId !== command.resolvedEvent.assetId ||
      !this.overlaps(currentEvent, conflictingEvent)
    ) {
      return {
        allowed: false,
        reason: 'CONFLICT_NOT_ACTIVE'
      };
    }

    const existingEvents = (
      await this.agendaEventRepository.listByAssetWindow(
        command.tenantId,
        command.resolvedEvent.assetId,
        command.resolvedEvent.startsAt,
        command.resolvedEvent.endsAt
      )
    ).filter((event) => event.id !== command.eventId);

    const schedulingDecision = this.agendaSchedulingService.scheduleEvent(
      existingEvents,
      command.resolvedEvent
    );

    if (!schedulingDecision.allowed) {
      return schedulingDecision;
    }

    const decisionMemoResult = await this.auditApplicationService.createDecisionMemo({
      actor: command.actor,
      tenantId: command.tenantId,
      action: 'agenda.conflict.override',
      aggregateType: 'agenda_conflict',
      aggregateId: `${command.eventId}:${command.conflictingEventId}`,
      assetId: currentEvent.assetId,
      justification: command.justification
    });

    if (!decisionMemoResult.confirmed) {
      return this.mapDecisionMemoFailure(decisionMemoResult);
    }

    await this.agendaEventRepository.update(
      command.tenantId,
      command.eventId,
      schedulingDecision.event
    );
    this.observabilityEventLogService?.record({
      domain: 'agenda',
      action: 'conflict_override',
      entityId: `${command.eventId}:${command.conflictingEventId}`,
      outcome: 'success',
      metadata: {
        assetId: currentEvent.assetId,
        resolvedEventId: command.eventId
      }
    });

    return {
      allowed: true,
      reason: 'OVERRIDDEN',
      event: schedulingDecision.event,
      memo: decisionMemoResult.memo
    };
  }

  async applyProvisionalBlock(
    command: ApplyProvisionalBlockCommand
  ): Promise<ApplyProvisionalBlockCommandResult> {
    const accessDecision = this.accessPolicyService.authorize({
      actor: command.actor,
      action: 'maintenance.provisional_block.apply',
      subject: {
        tenantId: command.tenantId,
        assetId: command.input.assetId
      }
    });

    if (!accessDecision.allowed) {
      return {
        allowed: false,
        reason: 'FORBIDDEN',
        accessReason: accessDecision.reason
      };
    }

    const candidateEvent: AgendaEvent = {
      id: command.input.id,
      assetId: command.input.assetId,
      type: 'operational_block',
      startsAt: command.input.startsAt,
      endsAt: command.input.endsAt,
      provisional: true,
      validatedAt: undefined
    };

    const existingEvents = await this.agendaEventRepository.listByAssetWindow(
      command.tenantId,
      candidateEvent.assetId,
      candidateEvent.startsAt,
      candidateEvent.endsAt
    );
    const result = this.agendaSchedulingService.scheduleEvent(existingEvents, candidateEvent);

    if (!result.allowed) {
      this.recordAgendaConflict(candidateEvent, result);

      return result;
    }

    await this.agendaEventRepository.create(command.tenantId, result.event);
    this.observabilityEventLogService?.record({
      domain: 'agenda',
      action: 'provisional_block_apply',
      entityId: result.event.id,
      outcome: 'success',
      metadata: {
        assetId: result.event.assetId
      }
    });

    return {
      allowed: true,
      reason: 'PROVISIONAL_BLOCK_APPLIED',
      event: result.event
    };
  }

  async validateProvisionalBlock(
    command: ValidateProvisionalBlockCommand
  ): Promise<ValidateProvisionalBlockCommandResult> {
    const currentEvent = await this.agendaEventRepository.findById(command.tenantId, command.eventId);

    if (!currentEvent) {
      return {
        allowed: false,
        reason: 'NOT_FOUND'
      };
    }

    const accessDecision = this.accessPolicyService.authorize({
      actor: command.actor,
      action: 'maintenance.provisional_block.validate',
      subject: {
        tenantId: command.tenantId,
        assetId: currentEvent.assetId
      }
    });

    if (!accessDecision.allowed) {
      return {
        allowed: false,
        reason: 'FORBIDDEN',
        accessReason: accessDecision.reason
      };
    }

    if (!this.isProvisionalBlock(currentEvent)) {
      return {
        allowed: false,
        reason: 'NOT_PROVISIONAL_BLOCK'
      };
    }

    const validatedEvent: AgendaEvent = {
      ...this.toAgendaEvent(currentEvent),
      validatedAt: command.validatedAt
    };

    await this.agendaEventRepository.update(command.tenantId, command.eventId, validatedEvent);
    this.observabilityEventLogService?.record({
      domain: 'agenda',
      action: 'provisional_block_validate',
      entityId: command.eventId,
      outcome: 'success',
      metadata: {
        assetId: validatedEvent.assetId,
        validatedAt: command.validatedAt.toISOString()
      }
    });

    return {
      allowed: true,
      reason: 'VALIDATED',
      event: validatedEvent
    };
  }

  async getProvisionalBlockStatus(
    command: GetProvisionalBlockStatusCommand
  ): Promise<GetProvisionalBlockStatusCommandResult> {
    const currentEvent = await this.agendaEventRepository.findById(command.tenantId, command.eventId);

    if (!currentEvent) {
      return {
        found: false,
        reason: 'NOT_FOUND'
      };
    }

    if (!this.isProvisionalBlock(currentEvent)) {
      return {
        found: false,
        reason: 'NOT_PROVISIONAL_BLOCK'
      };
    }

    return {
      found: true,
      reason: 'STATUS_EVALUATED',
      status: this.agendaSchedulingService.evaluateProvisionalBlock(
        this.toAgendaEvent(currentEvent),
        command.now
      )
    };
  }

  private mapDecisionMemoFailure(
    result: Extract<CreateDecisionMemoCommandResult, { confirmed: false }>
  ): OverrideAgendaConflictCommandResult {
    if (result.reason === 'FORBIDDEN') {
      return {
        allowed: false,
        reason: 'FORBIDDEN',
        accessReason: result.accessReason
      };
    }

    return {
      allowed: false,
      reason: 'JUSTIFICATION_REQUIRED'
    };
  }

  private overlaps(left: AgendaEvent, right: AgendaEvent): boolean {
    return left.startsAt < right.endsAt && right.startsAt < left.endsAt;
  }

  private isProvisionalBlock(event: AgendaEvent): boolean {
    return event.type === 'operational_block' && Boolean(event.provisional);
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

  private toAgendaEvent(event: AgendaEvent): AgendaEvent {
    const normalizedEvent: AgendaEvent = {
      id: event.id,
      assetId: event.assetId,
      type: event.type,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      safeMinimumBreached: event.safeMinimumBreached,
      provisional: event.provisional,
      validatedAt: event.validatedAt ?? undefined
    };

    if (typeof event.title === 'string' && event.title.trim().length > 0) {
      normalizedEvent.title = event.title;
    }

    if (typeof event.description === 'string' && event.description.trim().length > 0) {
      normalizedEvent.description = event.description;
    }

    if (event.legacyMetadata) {
      normalizedEvent.legacyMetadata = event.legacyMetadata;
    }

    return normalizedEvent;
  }

  private toAgendaEventView(event: PersistedAgendaEvent): AgendaEventView {
    return {
      id: event.id ?? '',
      assetId: event.assetId,
      type: event.type,
      title: ('title' in event ? event.title : null) ?? null,
      description: ('description' in event ? event.description : null) ?? null,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      safeMinimumBreached: event.safeMinimumBreached ?? false,
      provisional: event.provisional ?? false,
      validatedAt: event.validatedAt ?? null,
      updatedAt: event.updatedAt
    };
  }

  private recordAgendaConflict(
    candidateEvent: AgendaEvent,
    decision: Extract<ScheduleAgendaEventResult, { allowed: false }>
  ): void {
    this.observabilityMetricsService?.recordAgendaConflict();
    this.observabilityEventLogService?.record({
      domain: 'agenda',
      action: 'schedule_event',
      entityId: candidateEvent.id,
      outcome: 'blocked',
      metadata: {
        assetId: candidateEvent.assetId,
        reason: decision.reason,
        conflictingEventId: decision.conflictingEventId
      }
    });
  }
}
