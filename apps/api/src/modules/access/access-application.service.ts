import { Inject, Injectable } from '@nestjs/common';

import { AccessGovernanceService } from '../governance/access-governance.service.js';
import {
  AccessAssignmentWriter,
  PersistedAccessAssignment,
  PrismaAccessAssignmentRepository
} from './access-assignment.repository.js';
import {
  BetterAuthProvisioningService,
  type PortalOnboardingCommand
} from '../auth/better-auth-provisioning.service.js';
import {
  AccessActor,
  AccessDecisionReason,
  AccessPolicyService,
  PortalRole
} from './access-policy.service.js';

export type AccessAssignmentInput = {
  userId: string;
  displayName: string;
  email: string;
  role: PortalRole;
  assetIds: string[];
  mfaEnabled: boolean;
  lastReviewedAt: Date;
  revokedAt?: Date;
};

export type AccessAssignmentView = PersistedAccessAssignment & {
  mfaRequired: boolean;
  mfaCompliant: boolean;
  reviewCadence: 'monthly' | 'quarterly';
  reviewDue: boolean;
};

export type ListAccessAssignmentsCommand = {
  actor: AccessActor;
  tenantId: string;
  now: Date;
};

export type ListAccessAssignmentsCommandResult =
  | {
      assignments: AccessAssignmentView[];
    }
  | {
      assignments: [];
      reason: 'FORBIDDEN';
      accessReason: AccessDecisionReason;
    };

export type UpsertAccessAssignmentCommand = {
  actor: AccessActor;
  tenantId: string;
  assignmentId?: string;
  input: AccessAssignmentInput;
};

export type UpsertAccessAssignmentCommandResult =
  | {
      updated: true;
      reason: 'UPSERTED';
      assignment: AccessAssignmentView;
    }
  | {
      updated: false;
      reason: 'NOT_FOUND';
    }
  | {
      updated: false;
      reason: 'FORBIDDEN';
      accessReason: AccessDecisionReason;
    }
  | {
      updated: false;
      reason: 'MFA_REQUIRED_FOR_ROLE';
    }
  | {
      updated: false;
      reason: 'ACTIVE_ASSIGNMENT_ALREADY_EXISTS';
    };

export type RevokeAccessAssignmentCommand = {
  actor: AccessActor;
  tenantId: string;
  assignmentId: string;
  requestedAt: Date;
  removedAt: Date;
};

export type RevokeAccessAssignmentCommandResult =
  | {
      revoked: true;
      reason: 'REVOKED';
      assignment: PersistedAccessAssignment;
      evaluation: ReturnType<AccessGovernanceService['evaluateRevocation']>;
    }
  | {
      revoked: false;
      reason: 'FORBIDDEN';
      accessReason: AccessDecisionReason;
    }
  | {
      revoked: false;
      reason: 'NOT_FOUND';
    };

const portalRoles: PortalRole[] = [
  'portal_admin',
  'central_operations',
  'yachts_operations',
  'yachts_technical_coordination',
  'asset_field_team'
];

@Injectable()
export class AccessApplicationService {
  constructor(
    private readonly accessPolicyService: AccessPolicyService,
    @Inject(PrismaAccessAssignmentRepository)
    private readonly accessAssignmentRepository: AccessAssignmentWriter,
    @Inject(BetterAuthProvisioningService)
    private readonly betterAuthProvisioningService: {
      ensurePortalUser(command: PortalOnboardingCommand): Promise<void>;
    } = createNoopPortalProvisioningService(),
    private readonly accessGovernanceService: AccessGovernanceService = new AccessGovernanceService()
  ) {}

  getCatalog(): {
    roles: PortalRole[];
    criticalRoles: PortalRole[];
    revocationSlaMinutes: 15;
  } {
    return {
      roles: [...portalRoles],
      criticalRoles: portalRoles.filter((role) => this.accessGovernanceService.requiresMfa(role)),
      revocationSlaMinutes: 15
    };
  }

  async listAssignments(
    command: ListAccessAssignmentsCommand
  ): Promise<ListAccessAssignmentsCommandResult> {
    const accessDecision = this.authorizeReader(command.actor, command.tenantId);

    if (!accessDecision.allowed) {
      return {
        assignments: [],
        reason: 'FORBIDDEN',
        accessReason: accessDecision.reason
      };
    }

    const assignments = await this.accessAssignmentRepository.listByTenant(command.tenantId);

    return {
      assignments: assignments.map((assignment) =>
        this.toAccessAssignmentView(
          assignment,
          this.isReviewDue(assignment.userId, assignment.role, assignments, command.now)
        )
      )
    };
  }

  async upsertAssignment(
    command: UpsertAccessAssignmentCommand
  ): Promise<UpsertAccessAssignmentCommandResult> {
    const accessDecision = this.authorizeAdmin(command.actor, command.tenantId);

    if (!accessDecision.allowed) {
      return {
        updated: false,
        reason: 'FORBIDDEN',
        accessReason: accessDecision.reason
      };
    }

    if (
      this.accessGovernanceService.requiresMfa(command.input.role) &&
      !command.input.mfaEnabled
    ) {
      return {
        updated: false,
        reason: 'MFA_REQUIRED_FOR_ROLE'
      };
    }

    const normalizedInput = this.normalizeAssignmentInput(command.input);
    const normalizedEmail = normalizedInput.email;
    const existingAssignment = await this.findExistingAssignment({
      ...command,
      input: normalizedInput
    });

    if (command.assignmentId && !existingAssignment) {
      return {
        updated: false,
        reason: 'NOT_FOUND'
      };
    }

    const conflictingAssignments = await this.accessAssignmentRepository.findActiveByEmail(
      command.tenantId,
      normalizedEmail
    );
    const hasConflictingActiveAssignment = conflictingAssignments.some(
      (assignment) => assignment.id !== existingAssignment?.id
    );

    if (hasConflictingActiveAssignment) {
      return {
        updated: false,
        reason: 'ACTIVE_ASSIGNMENT_ALREADY_EXISTS'
      };
    }

    const assignment = await this.accessAssignmentRepository.upsert(
      command.tenantId,
      normalizedInput,
      command.assignmentId
    );

    const shouldSendPasswordReset =
      !existingAssignment || existingAssignment.email.trim().toLowerCase() !== normalizedEmail;

    await this.betterAuthProvisioningService.ensurePortalUser({
      email: normalizedInput.email,
      displayName: normalizedInput.displayName,
      shouldSendVerificationEmail: shouldSendPasswordReset,
      shouldSendPasswordReset
    });

    return {
      updated: true,
      reason: 'UPSERTED',
      assignment: this.toAccessAssignmentView(assignment, this.isAssignmentDue(assignment, new Date()))
    };
  }

  async revokeAssignment(
    command: RevokeAccessAssignmentCommand
  ): Promise<RevokeAccessAssignmentCommandResult> {
    const accessDecision = this.authorizeAdmin(command.actor, command.tenantId);

    if (!accessDecision.allowed) {
      return {
        revoked: false,
        reason: 'FORBIDDEN',
        accessReason: accessDecision.reason
      };
    }

    const assignment = await this.accessAssignmentRepository.findById(
      command.tenantId,
      command.assignmentId
    );

    if (!assignment) {
      return {
        revoked: false,
        reason: 'NOT_FOUND'
      };
    }

    const revokedAssignment = await this.accessAssignmentRepository.revoke(
      command.tenantId,
      command.assignmentId,
      command.removedAt
    );

    return {
      revoked: true,
      reason: 'REVOKED',
      assignment: revokedAssignment,
      evaluation: this.accessGovernanceService.evaluateRevocation({
        requestedAt: command.requestedAt,
        removedAt: command.removedAt
      })
    };
  }

  private authorizeReader(
    actor: AccessActor,
    tenantId: string
  ): {
    allowed: boolean;
    reason: AccessDecisionReason;
  } {
    if (actor.tenantId !== tenantId) {
      return {
        allowed: false,
        reason: 'TENANT_SCOPE_MISMATCH'
      };
    }

    if (actor.role !== 'portal_admin' && actor.role !== 'central_operations') {
      return {
        allowed: false,
        reason: 'ROLE_NOT_ALLOWED'
      };
    }

    return this.accessPolicyService.authorize({
      actor,
      action: 'structural_registry.manage',
      subject: {
        tenantId
      }
    });
  }

  private authorizeAdmin(
    actor: AccessActor,
    tenantId: string
  ): {
    allowed: boolean;
    reason: AccessDecisionReason;
  } {
    if (actor.tenantId !== tenantId) {
      return {
        allowed: false,
        reason: 'TENANT_SCOPE_MISMATCH'
      };
    }

    if (actor.role !== 'portal_admin') {
      return {
        allowed: false,
        reason: 'ROLE_NOT_ALLOWED'
      };
    }

    return this.accessPolicyService.authorize({
      actor,
      action: 'structural_registry.manage',
      subject: {
        tenantId
      }
    });
  }

  private isReviewDue(
    userId: string,
    role: PortalRole,
    assignments: PersistedAccessAssignment[],
    now: Date
  ): boolean {
    return this.accessGovernanceService
      .buildAccessReviewReport(
        assignments.map((assignment) => ({
          userId: assignment.userId,
          role: assignment.role,
          lastReviewedAt: assignment.lastReviewedAt
        })),
        now
      )
      .dueReviews.some((assignment) => assignment.userId === userId && assignment.role === role);
  }

  private isAssignmentDue(assignment: PersistedAccessAssignment, now: Date): boolean {
    return this.isReviewDue(assignment.userId, assignment.role, [assignment], now);
  }

  private toAccessAssignmentView(
    assignment: PersistedAccessAssignment,
    reviewDue: boolean
  ): AccessAssignmentView {
    const mfaRequired = this.accessGovernanceService.requiresMfa(assignment.role);

    return {
      ...assignment,
      mfaRequired,
      mfaCompliant: !mfaRequired || assignment.mfaEnabled,
      reviewCadence: mfaRequired ? 'monthly' : 'quarterly',
      reviewDue
    };
  }

  private normalizeAssignmentInput(input: AccessAssignmentInput): AccessAssignmentInput {
    return {
      ...input,
      userId: input.userId.trim(),
      displayName: input.displayName.trim(),
      email: input.email.trim().toLowerCase(),
      assetIds: [...new Set(input.assetIds.map((assetId) => assetId.trim()).filter(Boolean))]
    };
  }

  private async findExistingAssignment(command: UpsertAccessAssignmentCommand) {
    if (command.assignmentId) {
      return this.accessAssignmentRepository.findById(command.tenantId, command.assignmentId);
    }

    return this.accessAssignmentRepository.findActiveByUserIdAndRole(
      command.tenantId,
      command.input.userId,
      command.input.role
    );
  }
}

function createNoopPortalProvisioningService() {
  return {
    async ensurePortalUser(): Promise<void> {
      return;
    }
  };
}
