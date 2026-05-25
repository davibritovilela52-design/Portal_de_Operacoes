import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';

import {
  AccessApplicationService,
  ListAccessAssignmentsCommand,
  ListAccessAssignmentsCommandResult,
  RevokeAccessAssignmentCommand,
  RevokeAccessAssignmentCommandResult,
  UpsertAccessAssignmentCommand,
  UpsertAccessAssignmentCommandResult
} from './access-application.service.js';
import { PortalSessionService } from '../auth/portal-session.service.js';

function toDate(value: Date | string | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }

  return value instanceof Date ? value : new Date(value);
}

@Controller('access')
export class AccessController {
  constructor(
    private readonly accessApplicationService: AccessApplicationService,
    private readonly portalSessionService: PortalSessionService
  ) {}

  @Get('catalog')
  getCatalog(): ReturnType<AccessApplicationService['getCatalog']> {
    return this.accessApplicationService.getCatalog();
  }

  @Post('assignments/search')
  listAssignments(
    @Headers('x-ops-portal-session') sessionToken: string | undefined,
    @Body() command: ListAccessAssignmentsCommand
  ): Promise<ListAccessAssignmentsCommandResult> {
    return this.accessApplicationService.listAssignments({
      ...command,
      actor: this.portalSessionService.resolveActor(command.actor, sessionToken),
      now: toDate(command.now) as Date
    });
  }

  @Post('assignments')
  upsertAssignment(
    @Headers('x-ops-portal-session') sessionToken: string | undefined,
    @Body() command: UpsertAccessAssignmentCommand
  ): Promise<UpsertAccessAssignmentCommandResult> {
    const revokedAt = toDate(command.input.revokedAt);

    return this.accessApplicationService.upsertAssignment({
      ...command,
      actor: this.portalSessionService.resolveActor(command.actor, sessionToken),
      input: {
        ...command.input,
        lastReviewedAt: toDate(command.input.lastReviewedAt) as Date,
        ...(revokedAt ? { revokedAt } : {})
      }
    });
  }

  @Post('assignments/:assignmentId/revoke')
  revokeAssignment(
    @Param('assignmentId') assignmentId: string,
    @Headers('x-ops-portal-session') sessionToken: string | undefined,
    @Body() command: RevokeAccessAssignmentCommand
  ): Promise<RevokeAccessAssignmentCommandResult> {
    return this.accessApplicationService.revokeAssignment({
      ...command,
      actor: this.portalSessionService.resolveActor(command.actor, sessionToken),
      assignmentId,
      requestedAt: toDate(command.requestedAt) as Date,
      removedAt: toDate(command.removedAt) as Date
    });
  }
}
