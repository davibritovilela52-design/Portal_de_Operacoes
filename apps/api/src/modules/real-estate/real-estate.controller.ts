import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';

import { PortalSessionService } from '../auth/portal-session.service.js';
import {
  AttachRealEstateEvidenceCommand,
  RealEstateApplicationService,
  CreateRealEstateReportCommand,
  GetRealEstateStatsCommand,
  GetRealEstateReportDetailCommand,
  GetRealEstateTransitionHistoryCommand,
  RegisterRealEstateCommentCommand,
  SearchRealEstateReportsCommand,
  TransitionRealEstateReportCommand
} from './real-estate-application.service.js';

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

@Controller('real-estate')
export class RealEstateController {
  constructor(
    private readonly realEstateApplicationService: RealEstateApplicationService,
    private readonly portalSessionService: PortalSessionService
  ) {}

  @Get('catalog')
  getCatalog() {
    return this.realEstateApplicationService.getCatalog();
  }

  @Post('stats')
  async getStats(
    @Headers('x-ops-portal-session') sessionToken: string | undefined,
    @Body() command: GetRealEstateStatsCommand
  ) {
    return this.realEstateApplicationService.getStats({
      ...command,
      actor: this.portalSessionService.resolveActor(command.actor, sessionToken)
    });
  }

  @Post('reports/search')
  async searchReports(
    @Headers('x-ops-portal-session') sessionToken: string | undefined,
    @Body() command: SearchRealEstateReportsCommand
  ) {
    return this.realEstateApplicationService.searchReports({
      ...command,
      actor: this.portalSessionService.resolveActor(command.actor, sessionToken)
    });
  }

  @Post('reports')
  async createReport(
    @Headers('x-ops-portal-session') sessionToken: string | undefined,
    @Body() command: CreateRealEstateReportCommand
  ) {
    return this.realEstateApplicationService.createReport({
      ...command,
      actor: this.portalSessionService.resolveActor(command.actor, sessionToken),
      input: { ...command.input, openedAt: toDate(command.input.openedAt) }
    });
  }

  @Post('reports/:reportId/transitions')
  async transitionReport(
    @Param('reportId') reportId: string,
    @Headers('x-ops-portal-session') sessionToken: string | undefined,
    @Body() command: TransitionRealEstateReportCommand
  ) {
    return this.realEstateApplicationService.transitionReport({
      ...command,
      actor: this.portalSessionService.resolveActor(command.actor, sessionToken),
      reportId
    });
  }

  @Post('reports/:reportId/transitions/history')
  async getTransitionHistory(
    @Param('reportId') reportId: string,
    @Headers('x-ops-portal-session') sessionToken: string | undefined,
    @Body() command: Omit<GetRealEstateTransitionHistoryCommand, 'reportId'>
  ) {
    return this.realEstateApplicationService.getTransitionHistory({
      ...command,
      actor: this.portalSessionService.resolveActor(command.actor, sessionToken),
      reportId
    });
  }

  @Post('reports/:reportId/comments')
  async registerComment(
    @Param('reportId') reportId: string,
    @Headers('x-ops-portal-session') sessionToken: string | undefined,
    @Body() command: RegisterRealEstateCommentCommand
  ) {
    return this.realEstateApplicationService.registerComment({
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
    @Body() command: AttachRealEstateEvidenceCommand
  ) {
    return this.realEstateApplicationService.attachEvidence({
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
    @Body() command: Omit<GetRealEstateReportDetailCommand, 'reportId'>
  ) {
    return this.realEstateApplicationService.getReportDetail({
      ...command,
      actor: this.portalSessionService.resolveActor(command.actor, sessionToken),
      reportId
    });
  }
}
