import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';

import {
  AgendaApplicationService,
  ApplyProvisionalBlockCommand,
  ApplyProvisionalBlockCommandResult,
  DeleteAgendaEventCommand,
  DeleteAgendaEventCommandResult,
  OverrideAgendaConflictCommand,
  OverrideAgendaConflictCommandResult,
  RescheduleAgendaEventCommand,
  RescheduleAgendaEventCommandResult,
  ScheduleAgendaEventCommand,
  ScheduleAgendaEventCommandResult,
  SearchAgendaEventsCommand,
  SearchAgendaEventsCommandResult,
  ValidateProvisionalBlockCommand,
  ValidateProvisionalBlockCommandResult
} from './agenda-application.service.js';
import { PortalSessionService } from '../auth/portal-session.service.js';

@Controller('agenda')
export class AgendaController {
  constructor(
    private readonly agendaApplicationService: AgendaApplicationService,
    private readonly portalSessionService: PortalSessionService
  ) {}

  @Get('catalog')
  getCatalog(): ReturnType<AgendaApplicationService['getCatalog']> {
    return this.agendaApplicationService.getCatalog();
  }

  @Post('events/search')
  async searchEvents(
    @Headers('x-ops-portal-session') sessionToken: string | undefined,
    @Body() command: SearchAgendaEventsCommand
  ): Promise<SearchAgendaEventsCommandResult> {
    return await this.agendaApplicationService.searchEvents({
      ...command,
      actor: this.portalSessionService.resolveActor(command.actor, sessionToken),
      filters: command.filters
        ? {
            ...command.filters,
            startsAt: this.toDate(command.filters.startsAt),
            endsAt: this.toDate(command.filters.endsAt)
          }
        : undefined
    });
  }

  @Post('events')
  async scheduleEvent(
    @Headers('x-ops-portal-session') sessionToken: string | undefined,
    @Body() command: ScheduleAgendaEventCommand
  ): Promise<ScheduleAgendaEventCommandResult> {
    return await this.agendaApplicationService.scheduleEvent({
      ...command,
      actor: this.portalSessionService.resolveActor(command.actor, sessionToken),
      candidateEvent: {
        ...command.candidateEvent,
        startsAt: this.toDate(command.candidateEvent.startsAt) as Date,
        endsAt: this.toDate(command.candidateEvent.endsAt) as Date,
        validatedAt: this.toDate(command.candidateEvent.validatedAt)
      }
    });
  }

  @Post('events/:eventId/reschedule')
  async rescheduleEvent(
    @Param('eventId') eventId: string,
    @Headers('x-ops-portal-session') sessionToken: string | undefined,
    @Body() command: RescheduleAgendaEventCommand
  ): Promise<RescheduleAgendaEventCommandResult> {
    return await this.agendaApplicationService.rescheduleEvent({
      ...command,
      actor: this.portalSessionService.resolveActor(command.actor, sessionToken),
      eventId,
      updatedEvent: {
        ...command.updatedEvent,
        startsAt: this.toDate(command.updatedEvent.startsAt) as Date,
        endsAt: this.toDate(command.updatedEvent.endsAt) as Date,
        validatedAt: this.toDate(command.updatedEvent.validatedAt)
      }
    });
  }

  @Post('events/:eventId/delete')
  async deleteEvent(
    @Param('eventId') eventId: string,
    @Headers('x-ops-portal-session') sessionToken: string | undefined,
    @Body() command: DeleteAgendaEventCommand
  ): Promise<DeleteAgendaEventCommandResult> {
    return await this.agendaApplicationService.deleteEvent({
      ...command,
      actor: this.portalSessionService.resolveActor(command.actor, sessionToken),
      eventId
    });
  }

  @Post('events/:eventId/conflict-override')
  async overrideConflict(
    @Param('eventId') eventId: string,
    @Headers('x-ops-portal-session') sessionToken: string | undefined,
    @Body() command: OverrideAgendaConflictCommand
  ): Promise<OverrideAgendaConflictCommandResult> {
    return await this.agendaApplicationService.overrideConflict({
      ...command,
      actor: this.portalSessionService.resolveActor(command.actor, sessionToken),
      eventId
    });
  }

  @Post('provisional-blocks')
  async applyProvisionalBlock(
    @Headers('x-ops-portal-session') sessionToken: string | undefined,
    @Body() command: ApplyProvisionalBlockCommand
  ): Promise<ApplyProvisionalBlockCommandResult> {
    return await this.agendaApplicationService.applyProvisionalBlock({
      ...command,
      actor: this.portalSessionService.resolveActor(command.actor, sessionToken),
      input: {
        ...command.input,
        startsAt: this.toDate(command.input.startsAt) as Date,
        endsAt: this.toDate(command.input.endsAt) as Date
      }
    });
  }

  @Post('events/:eventId/validate-provisional-block')
  async validateProvisionalBlock(
    @Param('eventId') eventId: string,
    @Headers('x-ops-portal-session') sessionToken: string | undefined,
    @Body() command: ValidateProvisionalBlockCommand
  ): Promise<ValidateProvisionalBlockCommandResult> {
    return await this.agendaApplicationService.validateProvisionalBlock({
      ...command,
      actor: this.portalSessionService.resolveActor(command.actor, sessionToken),
      eventId,
      validatedAt: this.toDate(command.validatedAt) as Date
    });
  }

  private toDate(value?: Date | string): Date | undefined {
    if (!value) {
      return undefined;
    }

    return value instanceof Date ? value : new Date(value);
  }
}
