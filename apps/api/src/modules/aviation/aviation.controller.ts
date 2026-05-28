import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';

import { PortalSessionService } from '../auth/portal-session.service.js';
import {
  AttachAviationEvidenceCommand,
  AviationApplicationService,
  CreateAviationReportCommand,
  GetAviationReportDetailCommand,
  GetAviationTransitionHistoryCommand,
  RegisterAviationCommentCommand,
  SearchAviationReportsCommand,
  TransitionAviationReportCommand
} from './aviation-application.service.js';

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

@Controller('aviation')
export class AviationController {
  constructor(
    private readonly aviationApplicationService: AviationApplicationService,
    private readonly portalSessionService: PortalSessionService
  ) {}

  @Get('catalog')
  getCatalog() {
    return this.aviationApplicationService.getCatalog();
  }

  @Post('reports/search')
  async searchReports(
    @Headers('x-ops-portal-session') sessionToken: string | undefined,
    @Body() command: SearchAviationReportsCommand
  ) {
    return this.aviationApplicationService.searchReports({
      ...command,
      actor: this.portalSessionService.resolveActor(command.actor, sessionToken)
    });
  }

  @Post('reports')
  async createReport(
    @Headers('x-ops-portal-session') sessionToken: string | undefined,
    @Body() command: CreateAviationReportCommand
  ) {
    return this.aviationApplicationService.createReport({
      ...command,
      actor: this.portalSessionService.resolveActor(command.actor, sessionToken),
      input: { ...command.input, openedAt: toDate(command.input.openedAt) }
    });
  }

  @Post('reports/:reportId/transitions')
  async transitionReport(
    @Param('reportId') reportId: string,
    @Headers('x-ops-portal-session') sessionToken: string | undefined,
    @Body() command: TransitionAviationReportCommand
  ) {
    return this.aviationApplicationService.transitionReport({
      ...command,
      actor: this.portalSessionService.resolveActor(command.actor, sessionToken),
      reportId
    });
  }

  @Post('reports/:reportId/transitions/history')
  async getTransitionHistory(
    @Param('reportId') reportId: string,
    @Headers('x-ops-portal-session') sessionToken: string | undefined,
    @Body() command: Omit<GetAviationTransitionHistoryCommand, 'reportId'>
  ) {
    return this.aviationApplicationService.getTransitionHistory({
      ...command,
      actor: this.portalSessionService.resolveActor(command.actor, sessionToken),
      reportId
    });
  }

  @Post('reports/:reportId/comments')
  async registerComment(
    @Param('reportId') reportId: string,
    @Headers('x-ops-portal-session') sessionToken: string | undefined,
    @Body() command: RegisterAviationCommentCommand
  ) {
    return this.aviationApplicationService.registerComment({
      ...command,
      actor: this.portalSessionService.resolveActor(command.actor, sessionToken),
      reportId,
      input: { ...command.input, commentedAt: toDate(command.input.commentedAt) }
    });
  }

  @Post('reports/:reportId/evidences')
  async attachEvidence(
    @Param('reportId') reportId: string,
    @Headers('x-ops-portal-session') sessionToken: string | undefined,
    @Body() command: AttachAviationEvidenceCommand
  ) {
    return this.aviationApplicationService.attachEvidence({
      ...command,
      actor: this.portalSessionService.resolveActor(command.actor, sessionToken),
      reportId,
      input: { ...command.input, uploadedAt: toDate(command.input.uploadedAt) }
    });
  }

  @Post('reports/:reportId/detail')
  async getReportDetail(
    @Param('reportId') reportId: string,
    @Headers('x-ops-portal-session') sessionToken: string | undefined,
    @Body() command: Omit<GetAviationReportDetailCommand, 'reportId'>
  ) {
    return this.aviationApplicationService.getReportDetail({
      ...command,
      actor: this.portalSessionService.resolveActor(command.actor, sessionToken),
      reportId
    });
  }
}
