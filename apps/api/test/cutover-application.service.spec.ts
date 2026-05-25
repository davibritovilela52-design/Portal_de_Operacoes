import { describe, expect, it, vi } from 'vitest';

import { CutoverApplicationService } from '../src/modules/cutover/cutover-application.service.js';
import { CutoverGateService } from '../src/modules/cutover/cutover-gate.service.js';

describe('CutoverApplicationService', () => {
  const validRunInput = {
    label: 'Go-live Yachts wave 1',
    finalFreezeApplied: true,
    futureAgendaDaysMigrated: 90,
    invalidCriticalAttachmentIds: [],
    entityCounts: [
      {
        entity: 'maintenance_tickets' as const,
        sourceCount: 657,
        migratedCount: 657
      },
      {
        entity: 'agenda_events' as const,
        sourceCount: 270,
        migratedCount: 270
      }
    ],
    approvals: {
      centralOperations: {
        approved: true,
        approvedBy: 'Renata Serra',
        approvedAt: new Date('2026-05-15T09:00:00.000Z')
      },
      technicalCoordination: {
        approved: true,
        approvedBy: 'Carlos Medina',
        approvedAt: new Date('2026-05-15T09:05:00.000Z')
      },
      portalAdmin: {
        approved: true,
        approvedBy: 'Paulo Braga',
        approvedAt: new Date('2026-05-15T09:10:00.000Z')
      }
    },
    evidences: [
      {
        type: 'migration_report',
        title: 'Dry-run report',
        detail: 'Dry-run and reconciliation validated.',
        reference: '.tmp/legacy-yachts-import-report.json',
        valid: true
      }
    ]
  };

  it('persists a cutover run, evaluates gates, records checkpoints and exposes the detail snapshot', async () => {
    const persistedRun = createPersistedRun({
      status: 'draft',
      goLiveDecision: null,
      futureAgendaDaysMigrated: validRunInput.futureAgendaDaysMigrated,
      finalFreezeApplied: validRunInput.finalFreezeApplied,
      invalidCriticalAttachmentIds: validRunInput.invalidCriticalAttachmentIds,
      lastEvaluationApproved: null,
      lastEvaluationBlockers: [],
      approvals: validRunInput.approvals,
      entityCounts: validRunInput.entityCounts,
      evidences: validRunInput.evidences,
      checkpoints: []
    });
    const repository = createRepository({
      upsertRun: vi.fn(async () => persistedRun),
      findRunById: vi
        .fn()
        .mockResolvedValueOnce(persistedRun)
        .mockResolvedValueOnce({
          ...persistedRun,
          status: 'approved',
          lastEvaluationApproved: true,
          lastEvaluationBlockers: [],
          checkpoints: [
            {
              id: 'checkpoint-1',
              checkpoint: 'T+1',
              status: 'completed',
              notes: 'Portal online and reconciled.',
              recordedBy: 'Paulo Braga',
              recordedAt: new Date('2026-05-15T11:00:00.000Z')
            }
          ]
        })
        .mockResolvedValueOnce({
          ...persistedRun,
          status: 'approved',
          lastEvaluationApproved: true,
          lastEvaluationBlockers: [],
          checkpoints: [
            {
              id: 'checkpoint-1',
              checkpoint: 'T+1',
              status: 'completed',
              notes: 'Portal online and reconciled.',
              recordedBy: 'Paulo Braga',
              recordedAt: new Date('2026-05-15T11:00:00.000Z')
            }
          ]
        }),
      updateRunEvaluation: vi.fn(async () => ({
        ...persistedRun,
        status: 'approved',
        lastEvaluationApproved: true,
        lastEvaluationBlockers: []
      })),
      recordCheckpoint: vi.fn(async () => ({
        id: 'checkpoint-1',
        checkpoint: 'T+1',
        status: 'completed',
        notes: 'Portal online and reconciled.',
        recordedBy: 'Paulo Braga',
        recordedAt: new Date('2026-05-15T11:00:00.000Z')
      })),
      listRunsByTenant: vi.fn(async () => [persistedRun]),
      recordDecision: vi.fn(),
      findLatestCompletedGoRunByTenant: vi.fn(async () => null)
    });
    const service = new (CutoverApplicationService as unknown as {
      new (gateService: CutoverGateService, repository: unknown): {
        upsertRun: (command: unknown) => Promise<unknown>;
        evaluateRun: (command: unknown) => Promise<unknown>;
        recordCheckpoint: (command: unknown) => Promise<unknown>;
        getRunDetail: (command: unknown) => Promise<unknown>;
      };
    })(new CutoverGateService(), repository);

    await expect(
      service.upsertRun({
        actor: createActor('portal_admin'),
        tenantId: 'prime-you',
        input: validRunInput
      })
    ).resolves.toMatchObject({
      saved: true,
      run: {
        id: 'cutover-1',
        status: 'draft'
      }
    });

    await expect(
      service.evaluateRun({
        actor: createActor('portal_admin'),
        tenantId: 'prime-you',
        runId: 'cutover-1'
      })
    ).resolves.toMatchObject({
      approved: true,
      blockers: [],
      run: {
        id: 'cutover-1',
        status: 'approved'
      }
    });

    await expect(
      service.recordCheckpoint({
        actor: createActor('portal_admin'),
        tenantId: 'prime-you',
        runId: 'cutover-1',
        input: {
          checkpoint: 'T+1',
          status: 'completed',
          notes: 'Portal online and reconciled.'
        }
      })
    ).resolves.toMatchObject({
      recorded: true,
      checkpoint: {
        checkpoint: 'T+1',
        status: 'completed'
      }
    });

    await expect(
      service.getRunDetail({
        actor: createActor('portal_admin'),
        tenantId: 'prime-you',
        runId: 'cutover-1'
      })
    ).resolves.toMatchObject({
      found: true,
      run: {
        id: 'cutover-1',
        status: 'approved',
        checkpoints: [
          {
            checkpoint: 'T+1'
          }
        ]
      }
    });
  });

  it('records a go decision only when the gate passes and derives legacy write policy from persisted completion', async () => {
    const completedRun = createPersistedRun({
      status: 'completed',
      goLiveDecision: 'go',
      decisionAt: new Date('2026-05-15T10:30:00.000Z'),
      decidedBy: 'Paulo Braga',
      futureAgendaDaysMigrated: validRunInput.futureAgendaDaysMigrated,
      finalFreezeApplied: validRunInput.finalFreezeApplied,
      invalidCriticalAttachmentIds: validRunInput.invalidCriticalAttachmentIds,
      lastEvaluationApproved: true,
      lastEvaluationBlockers: [],
      approvals: validRunInput.approvals,
      entityCounts: validRunInput.entityCounts,
      evidences: validRunInput.evidences,
      checkpoints: [
        {
          id: 'checkpoint-1',
          checkpoint: 'T+1',
          status: 'completed',
          notes: 'Portal online and reconciled.',
          recordedBy: 'Paulo Braga',
          recordedAt: new Date('2026-05-15T11:00:00.000Z')
        }
      ]
    });
    const repository = createRepository({
      upsertRun: vi.fn(),
      findRunById: vi.fn(async () =>
        createPersistedRun({
          status: 'approved',
          goLiveDecision: null,
          futureAgendaDaysMigrated: validRunInput.futureAgendaDaysMigrated,
          finalFreezeApplied: validRunInput.finalFreezeApplied,
          invalidCriticalAttachmentIds: validRunInput.invalidCriticalAttachmentIds,
          lastEvaluationApproved: true,
          lastEvaluationBlockers: [],
          approvals: validRunInput.approvals,
          entityCounts: validRunInput.entityCounts,
          evidences: validRunInput.evidences,
          checkpoints: []
        })
      ),
      updateRunEvaluation: vi.fn(async () =>
        createPersistedRun({
          status: 'approved',
          goLiveDecision: null,
          futureAgendaDaysMigrated: validRunInput.futureAgendaDaysMigrated,
          finalFreezeApplied: validRunInput.finalFreezeApplied,
          invalidCriticalAttachmentIds: validRunInput.invalidCriticalAttachmentIds,
          lastEvaluationApproved: true,
          lastEvaluationBlockers: [],
          approvals: validRunInput.approvals,
          entityCounts: validRunInput.entityCounts,
          evidences: validRunInput.evidences,
          checkpoints: []
        })
      ),
      recordCheckpoint: vi.fn(),
      listRunsByTenant: vi.fn(async () => [completedRun]),
      recordDecision: vi.fn(async () => completedRun),
      findLatestCompletedGoRunByTenant: vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(completedRun)
    });
    const service = new (CutoverApplicationService as unknown as {
      new (gateService: CutoverGateService, repository: unknown): {
        recordDecision: (command: unknown) => Promise<unknown>;
        canWriteLegacyPortal: (tenantId: string) => Promise<unknown>;
      };
    })(new CutoverGateService(), repository);

    await expect(service.canWriteLegacyPortal('prime-you')).resolves.toEqual({
      allowed: true,
      reason: 'ALLOWED'
    });

    await expect(
      service.recordDecision({
        actor: createActor('portal_admin'),
        tenantId: 'prime-you',
        runId: 'cutover-1',
        input: {
          decision: 'go'
        }
      })
    ).resolves.toMatchObject({
      decided: true,
      decision: 'go',
      run: {
        id: 'cutover-1',
        status: 'completed'
      }
    });

    await expect(service.canWriteLegacyPortal('prime-you')).resolves.toEqual({
      allowed: false,
      reason: 'LEGACY_PORTAL_READ_ONLY'
    });
  });
});

function createActor(role: 'portal_admin' | 'central_operations' | 'yachts_technical_coordination') {
  return {
    userId: 'actor-1',
    tenantId: 'prime-you',
    role,
    assetIds: []
  };
}

function createRepository(overrides: Record<string, unknown>) {
  return overrides;
}

function createPersistedRun(overrides: Record<string, unknown>) {
  return {
    id: 'cutover-1',
    tenantId: 'prime-you',
    label: 'Go-live Yachts wave 1',
    status: 'draft',
    goLiveDecision: null,
    decisionAt: null,
    decidedBy: null,
    futureAgendaDaysMigrated: 90,
    finalFreezeApplied: true,
    invalidCriticalAttachmentIds: [],
    lastEvaluationApproved: null,
    lastEvaluationBlockers: [],
    approvals: {
      centralOperations: {
        approved: false,
        approvedBy: null,
        approvedAt: null
      },
      technicalCoordination: {
        approved: false,
        approvedBy: null,
        approvedAt: null
      },
      portalAdmin: {
        approved: false,
        approvedBy: null,
        approvedAt: null
      }
    },
    entityCounts: [],
    evidences: [],
    checkpoints: [],
    createdAt: new Date('2026-05-15T09:00:00.000Z'),
    updatedAt: new Date('2026-05-15T09:00:00.000Z'),
    ...overrides
  };
}
