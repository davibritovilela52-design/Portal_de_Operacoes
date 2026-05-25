import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query
} from '@nestjs/common';

import type { AccessActor } from '../access/access-policy.service.js';
import {
  CutoverApplicationService,
  EvaluateCutoverRunCommand,
  GetCutoverRunDetailCommand,
  RecordCutoverCheckpointCommand,
  RecordCutoverDecisionCommand,
  SearchCutoverRunsCommand,
  UpsertCutoverRunCommand
} from './cutover-application.service.js';
import { PortalSessionService } from '../auth/portal-session.service.js';

@Controller('cutover')
export class CutoverController {
  constructor(
    private readonly cutoverApplicationService: CutoverApplicationService,
    private readonly portalSessionService: PortalSessionService = {
      resolveActor: (actor: AccessActor | undefined) => actor as AccessActor
    } as PortalSessionService
  ) {}

  @Post('runs/search')
  searchRuns(
    @Body() command: SearchCutoverRunsCommand,
    @Headers('x-ops-portal-session') sessionToken?: string
  ): ReturnType<CutoverApplicationService['searchRuns']> {
    return this.cutoverApplicationService.searchRuns({
      ...command,
      actor: this.portalSessionService.resolveActor(command.actor, sessionToken)
    });
  }

  @Post('runs')
  upsertRun(
    @Body() command: UpsertCutoverRunCommand,
    @Headers('x-ops-portal-session') sessionToken?: string
  ): ReturnType<CutoverApplicationService['upsertRun']> {
    return this.cutoverApplicationService.upsertRun({
      ...command,
      actor: this.portalSessionService.resolveActor(command.actor, sessionToken)
    });
  }

  @Post('runs/:runId/detail')
  getRunDetail(
    @Param('runId') runId: string,
    @Body() command: Omit<GetCutoverRunDetailCommand, 'runId'>,
    @Headers('x-ops-portal-session') sessionToken?: string
  ): ReturnType<CutoverApplicationService['getRunDetail']> {
    return this.cutoverApplicationService.getRunDetail({
      ...command,
      runId,
      actor: this.portalSessionService.resolveActor(command.actor, sessionToken)
    });
  }

  @Post('runs/:runId/evaluate')
  evaluateRun(
    @Param('runId') runId: string,
    @Body() command: Omit<EvaluateCutoverRunCommand, 'runId'>,
    @Headers('x-ops-portal-session') sessionToken?: string
  ): ReturnType<CutoverApplicationService['evaluateRun']> {
    return this.cutoverApplicationService.evaluateRun({
      ...command,
      runId,
      actor: this.portalSessionService.resolveActor(command.actor, sessionToken)
    });
  }

  @Post('runs/:runId/checkpoints')
  recordCheckpoint(
    @Param('runId') runId: string,
    @Body() command: Omit<RecordCutoverCheckpointCommand, 'runId'>,
    @Headers('x-ops-portal-session') sessionToken?: string
  ): ReturnType<CutoverApplicationService['recordCheckpoint']> {
    return this.cutoverApplicationService.recordCheckpoint({
      ...command,
      runId,
      actor: this.portalSessionService.resolveActor(command.actor, sessionToken)
    });
  }

  @Post('runs/:runId/decision')
  recordDecision(
    @Param('runId') runId: string,
    @Body() command: Omit<RecordCutoverDecisionCommand, 'runId'>,
    @Headers('x-ops-portal-session') sessionToken?: string
  ): ReturnType<CutoverApplicationService['recordDecision']> {
    return this.cutoverApplicationService.recordDecision({
      ...command,
      runId,
      actor: this.portalSessionService.resolveActor(command.actor, sessionToken)
    });
  }

  @Get('legacy-portal/write-policy')
  canWriteLegacyPortal(
    @Query('tenantId') tenantId: string
  ): ReturnType<CutoverApplicationService['canWriteLegacyPortal']> {
    return this.cutoverApplicationService.canWriteLegacyPortal(tenantId);
  }
}
