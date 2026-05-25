import { describe, expect, it } from 'vitest';

import { CutoverApplicationService } from '../src/modules/cutover/cutover-application.service.js';
import { CutoverController } from '../src/modules/cutover/cutover.controller.js';

describe('CutoverController', () => {
  const controller = new CutoverController({
    searchRuns: async (input: unknown) => input,
    getRunDetail: async (input: unknown) => input,
    upsertRun: async (input: unknown) => input,
    evaluateRun: async (input: unknown) => input,
    recordCheckpoint: async (input: unknown) => input,
    recordDecision: async (input: unknown) => input,
    canWriteLegacyPortal: async () => ({
      allowed: false,
      reason: 'LEGACY_PORTAL_READ_ONLY'
    })
  } as unknown as CutoverApplicationService);

  it('delegates cutover run search requests to the application service', async () => {
    const request = {
      actor: {
        userId: 'admin-1',
        tenantId: 'prime-you',
        role: 'portal_admin',
        assetIds: []
      },
      tenantId: 'prime-you'
    };

    await expect((controller as unknown as {
      searchRuns: (command: unknown) => Promise<unknown>;
    }).searchRuns(request)).resolves.toStrictEqual(request);
  });

  it('delegates cutover run upsert requests to the application service', async () => {
    const request = {
      actor: {
        userId: 'admin-1',
        tenantId: 'prime-you',
        role: 'portal_admin',
        assetIds: []
      },
      tenantId: 'prime-you',
      input: {
        label: 'Go-live Yachts wave 1',
        futureAgendaDaysMigrated: 90,
        finalFreezeApplied: true
      }
    };

    await expect((controller as unknown as {
      upsertRun: (command: unknown) => Promise<unknown>;
    }).upsertRun(request)).resolves.toStrictEqual(request);
  });

  it('delegates cutover evaluation requests to the application service', async () => {
    const request = {
      actor: {
        userId: 'admin-1',
        tenantId: 'prime-you',
        role: 'portal_admin',
        assetIds: []
      },
      tenantId: 'prime-you',
      runId: 'cutover-1'
    };

    await expect((controller as unknown as {
      evaluateRun: (runId: string, command: unknown) => Promise<unknown>;
    }).evaluateRun('cutover-1', request)).resolves.toStrictEqual({
      ...request,
      runId: 'cutover-1'
    });
  });

  it('delegates checkpoint recording requests to the application service', async () => {
    const request = {
      actor: {
        userId: 'admin-1',
        tenantId: 'prime-you',
        role: 'portal_admin',
        assetIds: []
      },
      tenantId: 'prime-you',
      input: {
        checkpoint: 'T+1',
        status: 'completed',
        notes: 'Portal online and reconciled.'
      }
    };

    await expect((controller as unknown as {
      recordCheckpoint: (runId: string, command: unknown) => Promise<unknown>;
    }).recordCheckpoint('cutover-1', request)).resolves.toStrictEqual({
      ...request,
      runId: 'cutover-1'
    });
  });

  it('delegates decision recording requests to the application service', async () => {
    const request = {
      actor: {
        userId: 'admin-1',
        tenantId: 'prime-you',
        role: 'portal_admin',
        assetIds: []
      },
      tenantId: 'prime-you',
      input: {
        decision: 'go'
      }
    };

    await expect((controller as unknown as {
      recordDecision: (runId: string, command: unknown) => Promise<unknown>;
    }).recordDecision('cutover-1', request)).resolves.toStrictEqual({
      ...request,
      runId: 'cutover-1'
    });
  });

  it('returns the current write policy for the legacy portal', async () => {
    await expect((controller as unknown as {
      canWriteLegacyPortal: (tenantId: string) => Promise<unknown>;
    }).canWriteLegacyPortal('prime-you')).resolves.toEqual({
      allowed: false,
      reason: 'LEGACY_PORTAL_READ_ONLY'
    });
  });
});
