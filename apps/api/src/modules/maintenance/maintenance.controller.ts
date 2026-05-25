import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';

import {
  AttachMaintenanceEvidenceCommand,
  AttachMaintenanceEvidenceCommandResult,
  CreateMaintenanceTicketCommand,
  CreateMaintenanceTicketCommandResult,
  GetMaintenanceTicketDetailCommand,
  GetMaintenanceTicketDetailCommandResult,
  MaintenanceApplicationService,
  RegisterMaintenanceCommentCommand,
  RegisterMaintenanceCommentCommandResult,
  RequestMaintenanceEvidenceAccessCommand,
  RequestMaintenanceEvidenceAccessCommandResult,
  SearchMaintenanceSummaryCommand,
  SearchMaintenanceSummaryCommandResult,
  SearchMaintenanceTicketsCommand,
  SearchMaintenanceTicketsCommandResult,
  TransitionMaintenanceTicketCommand,
  TransitionMaintenanceTicketCommandResult,
  UpdateMaintenanceSubstepCommand,
  UpdateMaintenanceSubstepCommandResult
} from './maintenance-application.service.js';
import { PortalSessionService } from '../auth/portal-session.service.js';

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

@Controller('maintenance')
export class MaintenanceController {
  constructor(
    private readonly maintenanceApplicationService: MaintenanceApplicationService,
    private readonly portalSessionService: PortalSessionService
  ) {}

  @Get('catalog')
  getCatalog(): ReturnType<MaintenanceApplicationService['getCatalog']> {
    return this.maintenanceApplicationService.getCatalog();
  }

  @Post('tickets/search')
  async searchTickets(
    @Headers('x-ops-portal-session') sessionToken: string | undefined,
    @Body() command: SearchMaintenanceTicketsCommand
  ): Promise<SearchMaintenanceTicketsCommandResult> {
    return await this.maintenanceApplicationService.searchTickets({
      ...command,
      actor: this.portalSessionService.resolveActor(command.actor, sessionToken)
    });
  }

  @Post('summary')
  async searchSummary(
    @Headers('x-ops-portal-session') sessionToken: string | undefined,
    @Body() command: SearchMaintenanceSummaryCommand
  ): Promise<SearchMaintenanceSummaryCommandResult> {
    return await this.maintenanceApplicationService.searchSummary({
      ...command,
      actor: this.portalSessionService.resolveActor(command.actor, sessionToken)
    });
  }

  @Post('tickets/:ticketId/detail')
  async getTicketDetail(
    @Param('ticketId') ticketId: string,
    @Headers('x-ops-portal-session') sessionToken: string | undefined,
    @Body() command: Omit<GetMaintenanceTicketDetailCommand, 'ticketId'>
  ): Promise<GetMaintenanceTicketDetailCommandResult> {
    return await this.maintenanceApplicationService.getTicketDetail({
      ...command,
      actor: this.portalSessionService.resolveActor(command.actor, sessionToken),
      ticketId
    });
  }

  @Post('tickets')
  async createTicket(
    @Headers('x-ops-portal-session') sessionToken: string | undefined,
    @Body() command: CreateMaintenanceTicketCommand
  ): Promise<CreateMaintenanceTicketCommandResult> {
    return await this.maintenanceApplicationService.createTicket({
      ...command,
      actor: this.portalSessionService.resolveActor(command.actor, sessionToken),
      input: {
        ...command.input,
        openedAt: toDate(command.input.openedAt)
      }
    });
  }

  @Post('tickets/:ticketId/transitions')
  async transitionTicket(
    @Param('ticketId') ticketId: string,
    @Headers('x-ops-portal-session') sessionToken: string | undefined,
    @Body() command: TransitionMaintenanceTicketCommand
  ): Promise<TransitionMaintenanceTicketCommandResult> {
    return await this.maintenanceApplicationService.transitionTicket({
      ...command,
      actor: this.portalSessionService.resolveActor(command.actor, sessionToken),
      ticketId
    });
  }

  @Post('tickets/:ticketId/comments')
  async registerComment(
    @Param('ticketId') ticketId: string,
    @Headers('x-ops-portal-session') sessionToken: string | undefined,
    @Body() command: RegisterMaintenanceCommentCommand
  ): Promise<RegisterMaintenanceCommentCommandResult> {
    return await this.maintenanceApplicationService.registerComment({
      ...command,
      actor: this.portalSessionService.resolveActor(command.actor, sessionToken),
      ticketId,
      input: {
        ...command.input,
        commentedAt: toDate(command.input.commentedAt)
      }
    });
  }

  @Post('tickets/:ticketId/substep')
  async updateSubstep(
    @Param('ticketId') ticketId: string,
    @Headers('x-ops-portal-session') sessionToken: string | undefined,
    @Body() command: UpdateMaintenanceSubstepCommand
  ): Promise<UpdateMaintenanceSubstepCommandResult> {
    return await this.maintenanceApplicationService.updateSubstep({
      ...command,
      actor: this.portalSessionService.resolveActor(command.actor, sessionToken),
      ticketId
    });
  }

  @Post('tickets/:ticketId/evidences')
  async attachEvidence(
    @Param('ticketId') ticketId: string,
    @Headers('x-ops-portal-session') sessionToken: string | undefined,
    @Body() command: AttachMaintenanceEvidenceCommand
  ): Promise<AttachMaintenanceEvidenceCommandResult> {
    return await this.maintenanceApplicationService.attachEvidence({
      ...command,
      actor: this.portalSessionService.resolveActor(command.actor, sessionToken),
      ticketId,
      input: {
        ...command.input,
        uploadedAt: toDate(command.input.uploadedAt)
      }
    });
  }

  @Post('tickets/:ticketId/evidences/:evidenceId/access')
  async requestEvidenceAccess(
    @Param('ticketId') ticketId: string,
    @Param('evidenceId') evidenceId: string,
    @Headers('x-ops-portal-session') sessionToken: string | undefined,
    @Body() command: RequestMaintenanceEvidenceAccessCommand
  ): Promise<RequestMaintenanceEvidenceAccessCommandResult> {
    return await this.maintenanceApplicationService.requestEvidenceAccess({
      ...command,
      actor: this.portalSessionService.resolveActor(command.actor, sessionToken),
      ticketId,
      evidenceId
    });
  }
}
