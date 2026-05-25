import { describe, expect, it, vi } from 'vitest';

import {
  AccessApplicationService,
  AccessAssignmentInput
} from '../src/modules/access/access-application.service.js';
import {
  AccessAssignmentWriter,
  PersistedAccessAssignment
} from '../src/modules/access/access-assignment.repository.js';
import { AccessPolicyService } from '../src/modules/access/access-policy.service.js';

describe('AccessApplicationService', () => {
  const actorAdmin = {
    userId: 'admin-1',
    tenantId: 'tenant-a',
    role: 'portal_admin' as const,
    assetIds: []
  };

  const assignment = {
    userId: 'central-1',
    displayName: 'Central Ops',
    email: 'central@example.com',
    role: 'central_operations' as const,
    assetIds: [],
    mfaEnabled: true,
    lastReviewedAt: new Date('2026-03-10T00:00:00.000Z')
  };

  it('upserts access assignments for portal admins and annotates governance state', async () => {
    const repository = createAssignmentRepository();
    const provisioningService = createProvisioningService();
    const service = new AccessApplicationService(
      new AccessPolicyService(),
      repository,
      provisioningService
    );

    const result = await service.upsertAssignment({
      actor: actorAdmin,
      tenantId: 'tenant-a',
      input: assignment
    });

    expect(result).toEqual({
      updated: true,
      reason: 'UPSERTED',
      assignment: expect.objectContaining({
        userId: 'central-1',
        role: 'central_operations',
        mfaRequired: true,
        reviewCadence: 'monthly'
      })
    });
  });

  it('updates access assignments by assignment id when editing users', async () => {
    const repository = createAssignmentRepository([
      {
        id: 'assignment-1',
        tenantId: 'tenant-a',
        createdAt: new Date('2026-05-14T12:00:00.000Z'),
        updatedAt: new Date('2026-05-14T12:00:00.000Z'),
        ...assignment,
        revokedAt: null
      }
    ]);
    const provisioningService = createProvisioningService();
    const service = new AccessApplicationService(
      new AccessPolicyService(),
      repository,
      provisioningService
    );

    await expect(
      service.upsertAssignment({
        actor: actorAdmin,
        tenantId: 'tenant-a',
        assignmentId: 'assignment-1',
        input: {
          ...assignment,
          displayName: 'Central Operations',
          email: 'central.ops@example.com',
          lastReviewedAt: new Date('2026-05-15T12:00:00.000Z')
        }
      })
    ).resolves.toEqual({
      updated: true,
      reason: 'UPSERTED',
      assignment: expect.objectContaining({
        id: 'assignment-1',
        displayName: 'Central Operations',
        email: 'central.ops@example.com'
      })
    });
  });

  it('denies access assignment changes for non-portal-admin users', async () => {
    const repository = createAssignmentRepository();
    const provisioningService = createProvisioningService();
    const service = new AccessApplicationService(
      new AccessPolicyService(),
      repository,
      provisioningService
    );

    await expect(
      service.upsertAssignment({
        actor: {
          userId: 'central-1',
          tenantId: 'tenant-a',
          role: 'central_operations',
          assetIds: []
        },
        tenantId: 'tenant-a',
        input: assignment
      })
    ).resolves.toEqual({
      updated: false,
      reason: 'FORBIDDEN',
      accessReason: 'ROLE_NOT_ALLOWED'
    });
  });

  it('allows central operations to list assignments in read-only mode', async () => {
    const repository = createAssignmentRepository([
      {
        id: 'assignment-1',
        tenantId: 'tenant-a',
        createdAt: new Date('2026-05-14T12:00:00.000Z'),
        updatedAt: new Date('2026-05-14T12:00:00.000Z'),
        ...assignment,
        revokedAt: null
      }
    ]);
    const provisioningService = createProvisioningService();
    const service = new AccessApplicationService(
      new AccessPolicyService(),
      repository,
      provisioningService
    );

    await expect(
      service.listAssignments({
        actor: {
          userId: 'central-1',
          tenantId: 'tenant-a',
          role: 'central_operations',
          assetIds: []
        },
        tenantId: 'tenant-a',
        now: new Date('2026-05-14T00:00:00.000Z')
      })
    ).resolves.toEqual({
      assignments: [
        expect.objectContaining({
          userId: 'central-1',
          role: 'central_operations'
        })
      ]
    });
  });

  it('rejects provisioning a second active assignment for the same email', async () => {
    const repository = createAssignmentRepository([
      {
        id: 'assignment-1',
        tenantId: 'tenant-a',
        createdAt: new Date('2026-05-14T12:00:00.000Z'),
        updatedAt: new Date('2026-05-14T12:00:00.000Z'),
        ...assignment,
        revokedAt: null
      }
    ]);
    const provisioningService = createProvisioningService();
    const service = new AccessApplicationService(
      new AccessPolicyService(),
      repository,
      provisioningService
    );

    await expect(
      service.upsertAssignment({
        actor: actorAdmin,
        tenantId: 'tenant-a',
        input: {
          ...assignment,
          userId: 'field-2',
          role: 'asset_field_team'
        }
      })
    ).resolves.toEqual({
      updated: false,
      reason: 'ACTIVE_ASSIGNMENT_ALREADY_EXISTS'
    });
  });

  it('lists assignments with review due states and revokes them under the 15 minute SLA model', async () => {
    const repository = createAssignmentRepository([
      {
        id: 'assignment-1',
        tenantId: 'tenant-a',
        createdAt: new Date('2026-05-14T12:00:00.000Z'),
        updatedAt: new Date('2026-05-14T12:00:00.000Z'),
        ...assignment,
        revokedAt: null
      }
    ]);
    const provisioningService = createProvisioningService();
    const service = new AccessApplicationService(
      new AccessPolicyService(),
      repository,
      provisioningService
    );

    await expect(
      service.listAssignments({
        actor: actorAdmin,
        tenantId: 'tenant-a',
        now: new Date('2026-05-14T00:00:00.000Z')
      })
    ).resolves.toEqual({
      assignments: [
        expect.objectContaining({
          userId: 'central-1',
          reviewCadence: 'monthly',
          reviewDue: true
        })
      ]
    });

    await expect(
      service.revokeAssignment({
        actor: actorAdmin,
        tenantId: 'tenant-a',
        assignmentId: 'assignment-1',
        requestedAt: new Date('2026-05-14T12:00:00.000Z'),
        removedAt: new Date('2026-05-14T12:10:00.000Z')
      })
    ).resolves.toEqual({
      revoked: true,
      reason: 'REVOKED',
      assignment: expect.objectContaining({
        id: 'assignment-1',
        revokedAt: new Date('2026-05-14T12:10:00.000Z')
      }),
      evaluation: {
        breach: false,
        elapsedMinutes: 10,
        slaMinutes: 15
      }
    });
  });

  it('provisions Better Auth onboarding when creating a brand new access assignment', async () => {
    const repository = createAssignmentRepository();
    const provisioningService = createProvisioningService();
    const service = new AccessApplicationService(
      new AccessPolicyService(),
      repository,
      provisioningService
    );

    await service.upsertAssignment({
      actor: actorAdmin,
      tenantId: 'tenant-a',
      input: assignment
    });

    expect(provisioningService.ensurePortalUser).toHaveBeenCalledWith({
      email: 'central@example.com',
      displayName: 'Central Ops',
      shouldSendVerificationEmail: true,
      shouldSendPasswordReset: true
    });
  });
});

function createAssignmentRepository(records: PersistedAccessAssignment[] = []) {
  const state = [...records];

  return {
    async upsert(
      tenantId: string,
      assignment: AccessAssignmentInput,
      assignmentId?: string
    ): Promise<PersistedAccessAssignment> {
      const existingIndex = assignmentId
        ? state.findIndex((record) => record.tenantId === tenantId && record.id === assignmentId)
        : state.findIndex(
            (record) =>
              record.tenantId === tenantId &&
              record.userId === assignment.userId &&
              record.role === assignment.role
          );

      const persisted: PersistedAccessAssignment = {
        id: existingIndex === -1 ? `assignment-${state.length + 1}` : state[existingIndex].id,
        tenantId,
        createdAt:
          existingIndex === -1
            ? new Date('2026-05-14T12:00:00.000Z')
            : state[existingIndex].createdAt,
        updatedAt: new Date('2026-05-14T12:10:00.000Z'),
        ...assignment,
        revokedAt: assignment.revokedAt ?? null
      };

      if (existingIndex === -1) {
        state.push(persisted);
      } else {
        state[existingIndex] = persisted;
      }

      return persisted;
    },
    async listByTenant(tenantId: string): Promise<PersistedAccessAssignment[]> {
      return state.filter((record) => record.tenantId === tenantId);
    },
    async findActiveByEmail(
      tenantId: string,
      email: string
    ): Promise<PersistedAccessAssignment[]> {
      return state.filter(
        (record) =>
          record.tenantId === tenantId &&
          record.email === email &&
          record.revokedAt === null
      );
    },
    async findActiveByUserIdAndRole(
      tenantId: string,
      userId: string,
      role: string
    ): Promise<PersistedAccessAssignment | null> {
      return (
        state.find(
          (record) =>
            record.tenantId === tenantId &&
            record.userId === userId &&
            record.role === role &&
            record.revokedAt === null
        ) ?? null
      );
    },
    async findById(
      tenantId: string,
      assignmentId: string
    ): Promise<PersistedAccessAssignment | null> {
      return (
        state.find((record) => record.tenantId === tenantId && record.id === assignmentId) ?? null
      );
    },
    async revoke(
      tenantId: string,
      assignmentId: string,
      revokedAt: Date
    ): Promise<PersistedAccessAssignment> {
      const index = state.findIndex(
        (record) => record.tenantId === tenantId && record.id === assignmentId
      );

      if (index === -1) {
        throw new Error('not found');
      }

      const updated = {
        ...state[index],
        revokedAt,
        updatedAt: revokedAt
      };
      state[index] = updated;

      return updated;
    }
  } satisfies AccessAssignmentWriter;
}

function createProvisioningService() {
  return {
    ensurePortalUser: vi.fn().mockResolvedValue(undefined)
  };
}
