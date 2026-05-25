import { describe, expect, it } from 'vitest';

import {
  AccessApplicationService,
  ListAccessAssignmentsCommand,
  RevokeAccessAssignmentCommand,
  UpsertAccessAssignmentCommand
} from '../src/modules/access/access-application.service.js';
import { AccessController } from '../src/modules/access/access.controller.js';

describe('AccessController', () => {
  const portalSessionService = {
    resolveActor: (actor: unknown) => actor
  };
  const controller = new AccessController({
    getCatalog: () => ({
      roles: ['portal_admin']
    }),
    listAssignments: async (request: ListAccessAssignmentsCommand) => request,
    upsertAssignment: async (request: UpsertAccessAssignmentCommand) => request,
    revokeAssignment: async (request: RevokeAccessAssignmentCommand) => request
  } as unknown as AccessApplicationService, portalSessionService as any);

  it('returns the access catalog', () => {
    expect(controller.getCatalog()).toEqual({
      roles: ['portal_admin']
    });
  });

  it('delegates assignment listing requests to the application service', async () => {
    const request = {
      actor: {
        userId: 'admin-1',
        tenantId: 'tenant-a',
        role: 'portal_admin' as const,
        assetIds: []
      },
      tenantId: 'tenant-a',
      now: '2026-05-14T00:00:00.000Z'
    };

    await expect(
      controller.listAssignments(undefined, request as unknown as ListAccessAssignmentsCommand)
    ).resolves.toStrictEqual({
      ...request,
      now: new Date('2026-05-14T00:00:00.000Z')
    });
  });

  it('delegates assignment upsert requests to the application service', async () => {
    const request = {
      actor: {
        userId: 'admin-1',
        tenantId: 'tenant-a',
        role: 'portal_admin' as const,
        assetIds: []
      },
      tenantId: 'tenant-a',
      input: {
        userId: 'central-1',
        displayName: 'Central Ops',
        email: 'central@example.com',
        role: 'central_operations' as const,
        assetIds: [],
        mfaEnabled: true,
        lastReviewedAt: '2026-05-10T00:00:00.000Z'
      }
    };

    await expect(
      controller.upsertAssignment(undefined, request as unknown as UpsertAccessAssignmentCommand)
    ).resolves.toStrictEqual({
      ...request,
      input: {
        ...request.input,
        lastReviewedAt: new Date('2026-05-10T00:00:00.000Z')
      }
    });
  });

  it('delegates assignment revocation requests to the application service', async () => {
    const request = {
      actor: {
        userId: 'admin-1',
        tenantId: 'tenant-a',
        role: 'portal_admin' as const,
        assetIds: []
      },
      tenantId: 'tenant-a',
      assignmentId: 'assignment-1',
      requestedAt: '2026-05-14T12:00:00.000Z',
      removedAt: '2026-05-14T12:10:00.000Z'
    };

    await expect(
      controller.revokeAssignment(
        request.assignmentId,
        undefined,
        request as unknown as RevokeAccessAssignmentCommand
      )
    ).resolves.toStrictEqual({
      ...request,
      requestedAt: new Date('2026-05-14T12:00:00.000Z'),
      removedAt: new Date('2026-05-14T12:10:00.000Z')
    });
  });
});
