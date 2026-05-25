import { Body, Controller, Get, Headers, Post } from '@nestjs/common';

import {
  AuditApplicationService,
  CreateDecisionMemoCommand,
  CreateDecisionMemoCommandResult,
  CreateRectificationCommand,
  CreateRectificationCommandResult,
  SearchAuditLedgerCommand,
  SearchAuditLedgerCommandResult
} from './audit-application.service.js';
import { PortalSessionService } from '../auth/portal-session.service.js';

@Controller('audit')
export class AuditController {
  constructor(
    private readonly auditApplicationService: AuditApplicationService,
    private readonly portalSessionService: PortalSessionService
  ) {}

  @Get('catalog')
  getCatalog(): ReturnType<AuditApplicationService['getCatalog']> {
    return this.auditApplicationService.getCatalog();
  }

  @Post('ledger/search')
  searchAuditLedger(
    @Headers('x-ops-portal-session') sessionToken: string | undefined,
    @Body() command: SearchAuditLedgerCommand
  ): Promise<SearchAuditLedgerCommandResult> {
    return this.auditApplicationService.searchAuditLedger({
      ...command,
      actor: this.portalSessionService.resolveActor(command.actor, sessionToken)
    });
  }

  @Post('rectifications')
  createRectification(
    @Headers('x-ops-portal-session') sessionToken: string | undefined,
    @Body() command: CreateRectificationCommand
  ): Promise<CreateRectificationCommandResult> {
    return this.auditApplicationService.createRectification({
      ...command,
      actor: this.portalSessionService.resolveActor(command.actor, sessionToken)
    });
  }

  @Post('decision-memos')
  createDecisionMemo(
    @Headers('x-ops-portal-session') sessionToken: string | undefined,
    @Body() command: CreateDecisionMemoCommand
  ): Promise<CreateDecisionMemoCommandResult> {
    return this.auditApplicationService.createDecisionMemo({
      ...command,
      actor: this.portalSessionService.resolveActor(command.actor, sessionToken)
    });
  }
}
