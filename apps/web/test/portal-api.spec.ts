import * as portalApiModule from '../lib/portal-api';

import { describe, expect, it, vi } from 'vitest';

import type { AssetRecord } from '../lib/portal-data';
import type { AccessUserRecord } from '../lib/portal-model';
import {
  attachMaintenanceEvidence,
  createDecisionMemo,
  createRectification,
  createMaintenanceTicket,
  deleteAgendaEvent,
  revokeAccessAssignment,
  type FrontendActor,
  fetchPortalAuditSnapshot,
  fetchMaintenanceDetailSnapshot,
  fetchPortalOperationsSnapshot,
  fetchPortalSnapshot,
  mapAuditLedgerToRecords,
  mapAgendaEventsToRecords,
  mapAccessAssignmentsToUsers,
  mapMaintenanceDetailToRecord,
  mapMaintenanceQueueToTickets,
  mergeAssetRegistryAssets,
  rescheduleAgendaEvent,
  scheduleAgendaEvent,
  transitionMaintenanceTicket,
  upsertAccessAssignment
} from '../lib/portal-api';

describe('portal-api', () => {
  it('maps access assignments returned by the backend into the frontend access view', () => {
    expect(
      mapAccessAssignmentsToUsers([
        createAssignment({
          id: 'asg-active',
          role: 'central_operations',
          assetIds: ['yacht-001'],
          revokedAt: null
        }),
        createAssignment({
          id: 'asg-revoked',
          role: 'asset_field_team',
          assetIds: ['yacht-002'],
          revokedAt: '2026-05-14T09:00:00.000Z'
        })
      ])
    ).toEqual<AccessUserRecord[]>([
      {
        id: 'asg-active',
        userId: 'user-1',
        displayName: 'Renata Serra',
        email: 'renata@primeyou.com',
        role: 'central_operations',
        assetScopes: ['yacht-001'],
        mfaEnabled: true,
        status: 'active',
        lastReviewedAt: '2026-05-01T10:00:00.000Z'
      },
      {
        id: 'asg-revoked',
        userId: 'user-1',
        displayName: 'Renata Serra',
        email: 'renata@primeyou.com',
        role: 'asset_field_team',
        assetScopes: ['yacht-002'],
        mfaEnabled: true,
        status: 'revoked',
        lastReviewedAt: '2026-05-01T10:00:00.000Z'
      }
    ]);
  });

  it('posts access assignment upsert to the live API contract', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          updated: true,
          reason: 'UPSERTED',
          assignment: createAssignment({
            id: 'asg-central',
            role: 'central_operations',
            assetIds: ['yacht-001', 'yacht-002'],
            revokedAt: null
          })
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' }
        }
      )
    );

    const result = await upsertAccessAssignment(
      {
        actor: {
          userId: 'admin-1',
          tenantId: 'prime-you',
          role: 'portal_admin',
          assetIds: []
        },
        input: {
          userId: 'central-1',
          displayName: 'Renata Serra',
          email: 'renata@primeyou.com',
          role: 'central_operations',
          assetIds: ['yacht-001', 'yacht-002'],
          mfaEnabled: true,
          lastReviewedAt: '2026-05-15T10:00:00.000Z'
        }
      },
      {
        apiBaseUrl: 'http://api.local/v1',
        fetchImpl,
        sessionToken: 'signed-session-token'
      }
    );

    expect(result).toMatchObject({
      updated: true,
      reason: 'UPSERTED'
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://api.local/v1/access/assignments',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'content-type': 'application/json',
          'x-ops-portal-session': 'signed-session-token'
        }),
        body: JSON.stringify({
          actor: {
            userId: 'admin-1',
            tenantId: 'prime-you',
            role: 'portal_admin',
            assetIds: []
          },
          tenantId: 'prime-you',
          input: {
            userId: 'central-1',
            displayName: 'Renata Serra',
            email: 'renata@primeyou.com',
            role: 'central_operations',
            assetIds: ['yacht-001', 'yacht-002'],
            mfaEnabled: true,
            lastReviewedAt: '2026-05-15T10:00:00.000Z'
          }
        })
      })
    );
  });

  it('posts access revocation to the live API contract', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          revoked: true,
          reason: 'REVOKED',
          assignment: createAssignment({
            id: 'asg-central',
            role: 'central_operations',
            assetIds: ['yacht-001'],
            revokedAt: '2026-05-15T11:12:00.000Z'
          }),
          evaluation: {
            breach: false,
            elapsedMinutes: 3,
            slaMinutes: 15
          }
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' }
        }
      )
    );

    const result = await revokeAccessAssignment(
      {
        actor: {
          userId: 'admin-1',
          tenantId: 'prime-you',
          role: 'portal_admin',
          assetIds: []
        },
        assignmentId: 'asg-central',
        requestedAt: '2026-05-15T11:09:00.000Z',
        removedAt: '2026-05-15T11:12:00.000Z'
      },
      {
        apiBaseUrl: 'http://api.local/v1',
        fetchImpl,
        sessionToken: 'signed-session-token'
      }
    );

    expect(result).toMatchObject({
      revoked: true,
      reason: 'REVOKED'
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://api.local/v1/access/assignments/asg-central/revoke',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'content-type': 'application/json',
          'x-ops-portal-session': 'signed-session-token'
        }),
        body: JSON.stringify({
          actor: {
            userId: 'admin-1',
            tenantId: 'prime-you',
            role: 'portal_admin',
            assetIds: []
          },
          tenantId: 'prime-you',
          requestedAt: '2026-05-15T11:09:00.000Z',
          removedAt: '2026-05-15T11:12:00.000Z'
        })
      })
    );
  });

  it('maps persisted cutover runs into cockpit records with gate, evidence and checkpoint context', () => {
    const { mapCutoverRunsToRecords } = portalApiModule as unknown as {
      mapCutoverRunsToRecords: (runs: Array<ReturnType<typeof createCutoverRunApiRecord>>) => unknown;
    };

    expect(
      mapCutoverRunsToRecords([
        createCutoverRunApiRecord({
          id: 'cutover-1',
          label: 'Go-live Yachts wave 1',
          status: 'approved',
          goLiveDecision: null,
          futureAgendaDaysMigrated: 90,
          finalFreezeApplied: true,
          invalidCriticalAttachmentIds: [],
          lastEvaluationApproved: true,
          lastEvaluationBlockers: [],
          approvals: {
            centralOperations: {
              approved: true,
              approvedBy: 'Renata Serra',
              approvedAt: '2026-05-15T09:00:00.000Z'
            },
            technicalCoordination: {
              approved: true,
              approvedBy: 'Carlos Medina',
              approvedAt: '2026-05-15T09:05:00.000Z'
            },
            portalAdmin: {
              approved: true,
              approvedBy: 'Paulo Braga',
              approvedAt: '2026-05-15T09:10:00.000Z'
            }
          },
          entityCounts: [
            {
              entity: 'maintenance_tickets',
              sourceCount: 657,
              migratedCount: 657
            },
            {
              entity: 'agenda_events',
              sourceCount: 270,
              migratedCount: 270
            }
          ],
          evidences: [
            {
              id: 'evidence-1',
              type: 'migration_report',
              title: 'Dry-run report',
              detail: 'Dry-run validated.',
              reference: '.tmp/legacy-yachts-import-report.json',
              valid: true,
              createdAt: '2026-05-15T09:15:00.000Z'
            }
          ],
          checkpoints: [
            {
              id: 'checkpoint-1',
              checkpoint: 'T+1',
              status: 'completed',
              notes: 'Portal online and reconciled.',
              recordedBy: 'Paulo Braga',
              recordedAt: '2026-05-15T11:00:00.000Z'
            }
          ]
        })
      ])
    ).toEqual([
      {
        id: 'cutover-1',
        label: 'Go-live Yachts wave 1',
        status: 'approved',
        goLiveDecision: null,
        futureAgendaDaysMigrated: 90,
        finalFreezeApplied: true,
        invalidCriticalAttachmentIds: [],
        approvals: {
          centralOperations: {
            approved: true,
            approvedBy: 'Renata Serra',
            approvedAt: '2026-05-15T09:00:00.000Z'
          },
          technicalCoordination: {
            approved: true,
            approvedBy: 'Carlos Medina',
            approvedAt: '2026-05-15T09:05:00.000Z'
          },
          portalAdmin: {
            approved: true,
            approvedBy: 'Paulo Braga',
            approvedAt: '2026-05-15T09:10:00.000Z'
          }
        },
        entityCounts: [
          {
            entity: 'maintenance_tickets',
            sourceCount: 657,
            migratedCount: 657
          },
          {
            entity: 'agenda_events',
            sourceCount: 270,
            migratedCount: 270
          }
        ],
        gate: {
          approved: true,
          blockers: []
        },
        evidences: [
          {
            id: 'evidence-1',
            type: 'migration_report',
            title: 'Dry-run report',
            detail: 'Dry-run validated.',
            reference: '.tmp/legacy-yachts-import-report.json',
            valid: true,
            createdAt: '2026-05-15T09:15:00.000Z'
          }
        ],
        checkpoints: [
          {
            id: 'checkpoint-1',
            checkpoint: 'T+1',
            status: 'completed',
            notes: 'Portal online and reconciled.',
            recordedBy: 'Paulo Braga',
            recordedAt: '2026-05-15T11:00:00.000Z'
          }
        ],
        createdAt: '2026-05-15T09:00:00.000Z',
        updatedAt: '2026-05-15T09:30:00.000Z'
      }
    ]);
  });

  it('fetches the cutover cockpit from the live API and forwards the signed session header', async () => {
    const { fetchPortalCutoverSnapshot } = portalApiModule as unknown as {
      fetchPortalCutoverSnapshot: (options: Record<string, unknown>) => Promise<unknown>;
    };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            runs: [
              createCutoverRunApiRecord({
                id: 'cutover-1',
                label: 'Go-live Yachts wave 1',
                status: 'approved',
                goLiveDecision: null,
                futureAgendaDaysMigrated: 90,
                finalFreezeApplied: true,
                invalidCriticalAttachmentIds: [],
                lastEvaluationApproved: true,
                lastEvaluationBlockers: [],
                approvals: {
                  centralOperations: {
                    approved: true,
                    approvedBy: 'Renata Serra',
                    approvedAt: '2026-05-15T09:00:00.000Z'
                  },
                  technicalCoordination: {
                    approved: true,
                    approvedBy: 'Carlos Medina',
                    approvedAt: '2026-05-15T09:05:00.000Z'
                  },
                  portalAdmin: {
                    approved: true,
                    approvedBy: 'Paulo Braga',
                    approvedAt: '2026-05-15T09:10:00.000Z'
                  }
                },
                entityCounts: [],
                evidences: [],
                checkpoints: []
              })
            ]
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            found: true,
            run: createCutoverRunApiRecord({
              id: 'cutover-1',
              label: 'Go-live Yachts wave 1',
              status: 'approved',
              goLiveDecision: null,
              futureAgendaDaysMigrated: 90,
              finalFreezeApplied: true,
              invalidCriticalAttachmentIds: [],
              lastEvaluationApproved: true,
              lastEvaluationBlockers: [],
              approvals: {
                centralOperations: {
                  approved: true,
                  approvedBy: 'Renata Serra',
                  approvedAt: '2026-05-15T09:00:00.000Z'
                },
                technicalCoordination: {
                  approved: true,
                  approvedBy: 'Carlos Medina',
                  approvedAt: '2026-05-15T09:05:00.000Z'
                },
                portalAdmin: {
                  approved: true,
                  approvedBy: 'Paulo Braga',
                  approvedAt: '2026-05-15T09:10:00.000Z'
                }
              },
              entityCounts: [],
              evidences: [],
              checkpoints: []
            })
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            allowed: false,
            reason: 'LEGACY_PORTAL_READ_ONLY'
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        )
      );

    const actor: FrontendActor = {
      userId: 'admin-1',
      tenantId: 'prime-you',
      role: 'portal_admin',
      assetIds: []
    };
    const snapshot = await fetchPortalCutoverSnapshot({
      apiBaseUrl: 'http://api.local/v1',
      fetchImpl,
      sessionToken: 'signed-session-token',
      tenantId: 'prime-you',
      actor
    });

    expect(snapshot).toMatchObject({
      source: 'api',
      writePolicy: {
        allowed: false,
        reason: 'LEGACY_PORTAL_READ_ONLY'
      },
      latestRun: {
        id: 'cutover-1',
        status: 'approved'
      }
    });
    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      'http://api.local/v1/cutover/runs/search',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'content-type': 'application/json',
          'x-ops-portal-session': 'signed-session-token'
        })
      })
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      3,
      'http://api.local/v1/cutover/legacy-portal/write-policy?tenantId=prime-you',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'content-type': 'application/json',
          'x-ops-portal-session': 'signed-session-token'
        })
      })
    );
  });

  it('posts cutover run upsert, checkpoint recording, gate evaluation and go-live decision to the live API contract', async () => {
    const {
      upsertCutoverRun,
      recordCutoverCheckpoint,
      evaluateCutoverRun,
      recordCutoverDecision
    } = portalApiModule as unknown as {
      upsertCutoverRun: (request: Record<string, unknown>, options: Record<string, unknown>) => Promise<unknown>;
      recordCutoverCheckpoint: (request: Record<string, unknown>, options: Record<string, unknown>) => Promise<unknown>;
      evaluateCutoverRun: (request: Record<string, unknown>, options: Record<string, unknown>) => Promise<unknown>;
      recordCutoverDecision: (request: Record<string, unknown>, options: Record<string, unknown>) => Promise<unknown>;
    };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            saved: true,
            run: createCutoverRunApiRecord({
              id: 'cutover-1',
              label: 'Go-live Yachts wave 1',
              status: 'draft',
              goLiveDecision: null,
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
              checkpoints: []
            })
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            recorded: true,
            checkpoint: {
              id: 'checkpoint-1',
              checkpoint: 'T+1',
              status: 'completed',
              notes: 'Portal online and reconciled.',
              recordedBy: 'Paulo Braga',
              recordedAt: '2026-05-15T11:00:00.000Z'
            }
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            approved: true,
            blockers: [],
            run: createCutoverRunApiRecord({
              id: 'cutover-1',
              label: 'Go-live Yachts wave 1',
              status: 'approved',
              goLiveDecision: null,
              futureAgendaDaysMigrated: 90,
              finalFreezeApplied: true,
              invalidCriticalAttachmentIds: [],
              lastEvaluationApproved: true,
              lastEvaluationBlockers: [],
              approvals: {
                centralOperations: {
                  approved: true,
                  approvedBy: 'Renata Serra',
                  approvedAt: '2026-05-15T09:00:00.000Z'
                },
                technicalCoordination: {
                  approved: true,
                  approvedBy: 'Carlos Medina',
                  approvedAt: '2026-05-15T09:05:00.000Z'
                },
                portalAdmin: {
                  approved: true,
                  approvedBy: 'Paulo Braga',
                  approvedAt: '2026-05-15T09:10:00.000Z'
                }
              },
              entityCounts: [],
              evidences: [],
              checkpoints: []
            })
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            decided: true,
            decision: 'go',
            legacyPortalMode: 'read_only',
            run: createCutoverRunApiRecord({
              id: 'cutover-1',
              label: 'Go-live Yachts wave 1',
              status: 'completed',
              goLiveDecision: 'go',
              futureAgendaDaysMigrated: 90,
              finalFreezeApplied: true,
              invalidCriticalAttachmentIds: [],
              lastEvaluationApproved: true,
              lastEvaluationBlockers: [],
              approvals: {
                centralOperations: {
                  approved: true,
                  approvedBy: 'Renata Serra',
                  approvedAt: '2026-05-15T09:00:00.000Z'
                },
                technicalCoordination: {
                  approved: true,
                  approvedBy: 'Carlos Medina',
                  approvedAt: '2026-05-15T09:05:00.000Z'
                },
                portalAdmin: {
                  approved: true,
                  approvedBy: 'Paulo Braga',
                  approvedAt: '2026-05-15T09:10:00.000Z'
                }
              },
              entityCounts: [],
              evidences: [],
              checkpoints: []
            })
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        )
      );

    const actor: FrontendActor = {
      userId: 'admin-1',
      tenantId: 'prime-you',
      role: 'portal_admin',
      assetIds: []
    };
    const upsertResult = await upsertCutoverRun(
      {
        actor,
        input: {
          label: 'Go-live Yachts wave 1',
          finalFreezeApplied: true,
          futureAgendaDaysMigrated: 90,
          invalidCriticalAttachmentIds: [],
          approvals: {
            centralOperations: {
              approved: true,
              approvedBy: 'Renata Serra',
              approvedAt: '2026-05-15T09:00:00.000Z'
            },
            technicalCoordination: {
              approved: true,
              approvedBy: 'Carlos Medina',
              approvedAt: '2026-05-15T09:05:00.000Z'
            },
            portalAdmin: {
              approved: true,
              approvedBy: 'Paulo Braga',
              approvedAt: '2026-05-15T09:10:00.000Z'
            }
          },
          entityCounts: [],
          evidences: []
        }
      },
      {
        apiBaseUrl: 'http://api.local/v1',
        fetchImpl,
        sessionToken: 'signed-session-token'
      }
    );
    const checkpointResult = await recordCutoverCheckpoint(
      {
        actor,
        runId: 'cutover-1',
        input: {
          checkpoint: 'T+1',
          status: 'completed',
          notes: 'Portal online and reconciled.'
        }
      },
      {
        apiBaseUrl: 'http://api.local/v1',
        fetchImpl,
        sessionToken: 'signed-session-token'
      }
    );
    const evaluationResult = await evaluateCutoverRun(
      {
        actor,
        runId: 'cutover-1'
      },
      {
        apiBaseUrl: 'http://api.local/v1',
        fetchImpl,
        sessionToken: 'signed-session-token'
      }
    );
    const decisionResult = await recordCutoverDecision(
      {
        actor,
        runId: 'cutover-1',
        input: {
          decision: 'go'
        }
      },
      {
        apiBaseUrl: 'http://api.local/v1',
        fetchImpl,
        sessionToken: 'signed-session-token'
      }
    );

    expect(upsertResult).toMatchObject({
      saved: true
    });
    expect(checkpointResult).toMatchObject({
      recorded: true
    });
    expect(evaluationResult).toMatchObject({
      approved: true
    });
    expect(decisionResult).toMatchObject({
      decided: true,
      decision: 'go'
    });
    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      'http://api.local/v1/cutover/runs',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          actor,
          tenantId: 'prime-you',
          input: {
            label: 'Go-live Yachts wave 1',
            futureAgendaDaysMigrated: 90,
            finalFreezeApplied: true,
            invalidCriticalAttachmentIds: [],
            approvals: {
              centralOperations: {
                approved: true,
                approvedBy: 'Renata Serra',
                approvedAt: '2026-05-15T09:00:00.000Z'
              },
              technicalCoordination: {
                approved: true,
                approvedBy: 'Carlos Medina',
                approvedAt: '2026-05-15T09:05:00.000Z'
              },
              portalAdmin: {
                approved: true,
                approvedBy: 'Paulo Braga',
                approvedAt: '2026-05-15T09:10:00.000Z'
              }
            },
            entityCounts: [],
            evidences: []
          }
        })
      })
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      4,
      'http://api.local/v1/cutover/runs/cutover-1/decision',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          actor,
          tenantId: 'prime-you',
          input: {
            decision: 'go'
          }
        })
      })
    );
  });

  it('maps backend audit ledger entries into frontend governance records with asset labels', () => {
    expect(
      mapAuditLedgerToRecords(
        [
          createAuditLedgerApiRecord({
            id: 'memo-1',
            type: 'decision_memo',
            title: 'agenda.conflict.override · agenda_event',
            summary: 'Keep technical block and reschedule owner usage.',
            actor: 'central-1',
            at: '2026-05-14T09:30:00.000Z',
            assetId: 'yacht-001',
            aggregateType: 'agenda_event',
            aggregateId: 'event-1',
            status: 'confirmed'
          }),
          createAuditLedgerApiRecord({
            id: 'rect-1',
            type: 'rectification',
            title: 'Retificacao v3->v4',
            summary: 'Correct invoice reference.',
            actor: 'central-1',
            at: '2026-05-14T08:00:00.000Z',
            recordId: 'maintenance-1',
            sourceVersion: 3,
            targetVersion: 4
          })
        ],
        [
          {
            id: 'yacht-001',
            name: 'Yacht Aurora',
            status: 'restricted',
            location: 'Angra dos Reis',
            nextWindow: 'Bloqueio tecnico'
          }
        ]
      )
    ).toEqual([
      {
        id: 'memo-1',
        type: 'decision_memo',
        title: 'agenda.conflict.override · agenda_event',
        assetId: 'yacht-001',
        assetName: 'Yacht Aurora',
        actor: 'central-1',
        at: '2026-05-14T09:30:00.000Z',
        summary: 'Keep technical block and reschedule owner usage.',
        aggregateType: 'agenda_event',
        aggregateId: 'event-1',
        status: 'confirmed',
        recordId: '',
        sourceVersion: 0,
        targetVersion: 0
      },
      {
        id: 'rect-1',
        type: 'rectification',
        title: 'Retificacao v3->v4',
        assetId: '',
        assetName: 'Escopo global',
        actor: 'central-1',
        at: '2026-05-14T08:00:00.000Z',
        summary: 'Correct invoice reference.',
        aggregateType: '',
        aggregateId: '',
        status: '',
        recordId: 'maintenance-1',
        sourceVersion: 3,
        targetVersion: 4
      }
    ]);
  });

  it('merges structural asset registry data into the visual fleet cards without losing operational context', () => {
    const baseline: AssetRecord[] = [
      {
        id: 'yacht-001',
        name: 'Legacy Aurora',
        modality: 'yachts',
        status: 'restricted',
        location: 'Angra dos Reis',
        nextWindow: 'Bloqueio tecnico ate 14 Mai, 18:00'
      }
    ];

    expect(
      mergeAssetRegistryAssets(
        [
          createAsset({
            assetId: 'yacht-001',
            displayName: 'Yacht Aurora',
            active: true
          }),
          createAsset({
            assetId: 'yacht-009',
            displayName: 'Yacht Delta',
            active: false
          })
        ],
        baseline
      )
    ).toEqual<AssetRecord[]>([
      {
        id: 'yacht-001',
        name: 'Yacht Aurora',
        modality: 'yachts',
        status: 'restricted',
        location: 'Angra dos Reis',
        nextWindow: 'Bloqueio tecnico ate 14 Mai, 18:00'
      },
      {
        id: 'yacht-009',
        name: 'Yacht Delta',
        modality: 'yachts',
        status: 'unavailable',
        location: 'Não informado',
        nextWindow: 'Cadastro estrutural sem agenda sincronizada'
      }
    ]);
  });

  it('falls back to mock data when the backend snapshot cannot be loaded', async () => {
    const fallbackAssets: AssetRecord[] = [
      {
        id: 'yacht-001',
        name: 'Yacht Aurora',
        modality: 'yachts',
        status: 'available',
        location: 'Paraty',
        nextWindow: 'Livre'
      }
    ];
    const fallbackUsers: AccessUserRecord[] = [
      {
        id: 'user-1',
        displayName: 'Renata Serra',
        email: 'renata@primeyou.com',
        role: 'central_operations',
        assetScopes: ['yacht-001'],
        mfaEnabled: true,
        status: 'active',
        lastReviewedAt: '2026-05-01T10:00:00.000Z'
      }
    ];

    const snapshot = await fetchPortalSnapshot({
      apiBaseUrl: 'http://api.local/v1',
      fetchImpl: vi.fn().mockRejectedValue(new Error('offline')),
      fallbackAssets,
      fallbackUsers
    });

    expect(snapshot).toEqual({
      source: 'mock',
      fleetAssets: fallbackAssets,
      accessUsers: fallbackUsers
    });
  });

  it('fails authenticated snapshot reads instead of falling back to mock data', async () => {
    await expect(
      fetchPortalSnapshot({
        apiBaseUrl: 'http://api.local/v1',
        fetchImpl: vi.fn().mockRejectedValue(new Error('offline')),
        sessionToken: 'signed-session-token',
        fallbackAssets: [],
        fallbackUsers: []
      })
    ).rejects.toBeInstanceOf(portalApiModule.PortalApiReadError);
  });

  it('forwards the signed portal session header to API snapshot reads', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            assets: [
              createAsset({
                assetId: 'yacht-001',
                displayName: 'Yacht Aurora',
                active: true
              })
            ]
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            assignments: [
              createAssignment({
                id: 'asg-001',
                role: 'portal_admin',
                assetIds: ['global'],
                revokedAt: null
              })
            ]
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        )
      );

    await fetchPortalSnapshot({
      apiBaseUrl: 'http://api.local/v1',
      fetchImpl,
      sessionToken: 'signed-session-token',
      fallbackAssets: [],
      fallbackUsers: []
    });

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      'http://api.local/v1/asset-registry/assets/search',
      expect.objectContaining({
        headers: expect.objectContaining({
          'content-type': 'application/json',
          'x-ops-portal-session': 'signed-session-token'
        })
      })
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      'http://api.local/v1/access/assignments/search',
      expect.objectContaining({
        headers: expect.objectContaining({
          'content-type': 'application/json',
          'x-ops-portal-session': 'signed-session-token'
        })
      })
    );
  });

  it('uses backend responses when asset registry and access endpoints are available', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            assets: [
              createAsset({
                assetId: 'yacht-001',
                displayName: 'Yacht Aurora',
                active: true
              })
            ]
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            assignments: [
              createAssignment({
                id: 'asg-001',
                role: 'portal_admin',
                assetIds: ['global'],
                revokedAt: null
              })
            ]
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        )
      );

    const snapshot = await fetchPortalSnapshot({
      apiBaseUrl: 'http://api.local/v1',
      fetchImpl,
      fallbackAssets: [],
      fallbackUsers: []
    });

    expect(snapshot).toEqual({
      source: 'api',
      fleetAssets: [
        {
          id: 'yacht-001',
          name: 'Yacht Aurora',
          modality: 'yachts',
          status: 'available',
          location: 'Não informado',
          nextWindow: 'Cadastro estrutural sem agenda sincronizada'
        }
      ],
      accessUsers: [
      {
        id: 'asg-001',
        userId: 'user-1',
        displayName: 'Renata Serra',
        email: 'renata@primeyou.com',
        role: 'portal_admin',
          assetScopes: ['global'],
          mfaEnabled: true,
          status: 'active',
          lastReviewedAt: '2026-05-01T10:00:00.000Z'
        }
      ]
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('reads access assignments for central operations snapshots as well', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            assets: [
              createAsset({
                assetId: 'yacht-001',
                displayName: 'Yacht Aurora',
                active: true
              })
            ]
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            assignments: [
              createAssignment({
                id: 'asg-006',
                role: 'central_operations',
                assetIds: ['yacht-001', 'yacht-002'],
                revokedAt: null
              })
            ]
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        )
      );

    const snapshot = await fetchPortalSnapshot({
      apiBaseUrl: 'http://api.local/v1',
      fetchImpl,
      fallbackAssets: [],
      fallbackUsers: [],
      actor: {
        userId: 'central-1',
        tenantId: 'prime-you',
        role: 'central_operations',
        assetIds: ['yacht-001', 'yacht-002']
      }
    });

    expect(snapshot.accessUsers).toEqual([
      expect.objectContaining({
        id: 'asg-006',
        role: 'central_operations'
      })
    ]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('maps backend maintenance queue items into frontend maintenance cards with derived owner and evidence progress', () => {
    expect(
      mapMaintenanceQueueToTickets(
        [
          createMaintenanceQueueTicket({
            id: 'mt-1',
            legacyRowId: '4402',
            legacyTicketCode: 'CH-4402',
            assetId: 'yacht-001',
            title: 'Pump oscillation diagnostic',
            category: 'corrective',
            priority: 'P2',
            description: 'Investigate starboard pump oscillation',
            maintenanceSystem: 'mechanical',
            origin: 'asset_field_team',
            openedBy: 'field-1',
            openedAt: '2026-05-14T09:00:00.000Z',
            status: 'pending',
            kanbanSubstatus: 'call_opening',
            freezeCount: 1,
            evidenceCount: 1,
            evidenceTypes: ['diagnostic']
          })
        ],
        [
          {
            id: 'yacht-001',
            name: 'Yacht Aurora',
            status: 'restricted',
            location: 'Angra dos Reis',
            nextWindow: 'Bloqueio tecnico'
          }
        ]
      )
    ).toEqual([
      {
        id: 'mt-1',
        ticketNumber: '4402',
        assetId: 'yacht-001',
        assetName: 'Yacht Aurora',
        title: 'Pump oscillation diagnostic',
        category: 'corrective',
        priority: 'P2',
        maintenanceSystem: 'mechanical',
        status: 'pending',
        owner: 'Equipe de campo - Embarcações',
        openedBy: 'field-1',
        openedAt: '2026-05-14T09:00:00.000Z',
        updatedAt: '2026-05-14T12:00:00.000Z',
        frozenCount: 1,
        thirdParty: false,
        kanbanSubstatus: 'call_opening',
        evidenceCompleteness: 0.25,
        slaProgress: 0.24
      }
    ]);
  });

  it('keeps warranty tickets distinct when the API exposes the presented category', () => {
    expect(
      mapMaintenanceQueueToTickets(
        [
          createMaintenanceQueueTicket({
            id: 'mt-warranty',
            assetId: 'yacht-002',
            title: 'Warranty seal replacement',
            category: 'warranty',
            priority: 'P3',
            description: 'Replace the failed seal under supplier warranty',
            origin: 'yachts_technical_coordination',
            openedBy: 'tech-1',
            openedAt: '2026-05-14T09:00:00.000Z',
            status: 'pending',
            freezeCount: 0,
            maintenanceSystem: 'hydraulic',
            evidenceCount: 0,
            evidenceTypes: []
          })
        ],
        [
          {
            id: 'yacht-002',
            name: 'Yacht Boreal',
            status: 'available',
            location: 'Paraty',
            nextWindow: 'Livre'
          }
        ]
      )
    ).toEqual([
      expect.objectContaining({
        id: 'mt-warranty',
        category: 'warranty',
        assetName: 'Yacht Boreal',
        title: 'Warranty seal replacement',
        maintenanceSystem: 'hydraulic'
      })
    ]);
  });

  it('maps backend agenda events into frontend records with derived titles and owners', () => {
    expect(
      mapAgendaEventsToRecords(
        [
          createAgendaApiEvent({
            id: 'ag-1',
            assetId: 'yacht-001',
            type: 'operational_block',
            title: 'Dry dock gate blocked',
            startsAt: '2026-05-14T10:00:00.000Z',
            endsAt: '2026-05-14T13:00:00.000Z',
            provisional: true,
            safeMinimumBreached: false,
            validatedAt: null
          }),
          createAgendaApiEvent({
            id: 'ag-2',
            assetId: 'yacht-002',
            type: 'crew_rest',
            startsAt: '2026-05-14T13:00:00.000Z',
            endsAt: '2026-05-14T16:00:00.000Z',
            provisional: false,
            safeMinimumBreached: true,
            validatedAt: null
          })
        ],
        [
          {
            id: 'yacht-001',
            name: 'Yacht Aurora',
            status: 'restricted',
            location: 'Angra dos Reis',
            nextWindow: 'Bloqueio tecnico'
          },
          {
            id: 'yacht-002',
            name: 'Yacht Boreal',
            status: 'available',
            location: 'Paraty',
            nextWindow: 'Livre'
          }
        ]
      )
    ).toEqual([
      {
        id: 'ag-1',
        assetId: 'yacht-001',
        assetName: 'Yacht Aurora',
        type: 'operational_block',
        title: 'Dry dock gate blocked',
        description: undefined,
        owner: 'Coordenação técnica - Embarcações',
        startsAt: '2026-05-14T10:00:00.000Z',
        endsAt: '2026-05-14T13:00:00.000Z',
        provisional: true,
        validatedAt: null,
        safeMinimumBreached: false
      },
      {
        id: 'ag-2',
        assetId: 'yacht-002',
        assetName: 'Yacht Boreal',
        type: 'crew_rest',
        title: 'Folga da tripulação - mínimo seguro',
        description: undefined,
        owner: 'Operações Centrais',
        startsAt: '2026-05-14T13:00:00.000Z',
        endsAt: '2026-05-14T16:00:00.000Z',
        provisional: false,
        validatedAt: null,
        safeMinimumBreached: true
      }
    ]);
  });

  it('uses backend responses when maintenance and agenda endpoints are available', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            assets: [
              createAsset({
                assetId: 'yacht-001',
                displayName: 'Yacht Aurora',
                active: true
              })
            ]
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            assignments: [
              createAssignment({
                id: 'asg-001',
                role: 'portal_admin',
                assetIds: ['global'],
                revokedAt: null
              })
            ]
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            tickets: [
              createMaintenanceQueueTicket({
                id: 'mt-1',
                assetId: 'yacht-001',
                title: 'Critical release inspection',
                category: 'inspection',
                priority: 'P1',
                description: 'Critical inspection before release',
                origin: 'central_operations',
                openedBy: 'central-1',
                openedAt: '2026-05-14T08:00:00.000Z',
                status: 'frozen',
                kanbanSubstatus: 'accounts_freeze',
                freezeCount: 2,
                frozenReason: 'awaiting_central_operations_decision',
                evidenceCount: 2,
                evidenceTypes: ['diagnostic', 'financial_document']
              })
            ]
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            costs: [
              createMaintenanceCostApiRecord({
                id: 'cost-1',
                assetId: 'yacht-001',
                maintenanceTicketId: 'mt-1',
                description: 'Critical inspection invoice',
                amount: 18750
              })
            ]
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            events: [
              createAgendaApiEvent({
                id: 'ag-1',
                assetId: 'yacht-001',
                type: 'utilization',
                title: 'Owners weekend',
                startsAt: '2026-05-14T09:00:00.000Z',
                endsAt: '2026-05-14T12:00:00.000Z',
                provisional: false,
                safeMinimumBreached: false,
                validatedAt: null
              })
            ]
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        )
      );

    const snapshot = await fetchPortalOperationsSnapshot({
      apiBaseUrl: 'http://api.local/v1',
      fetchImpl,
      fallbackAssets: [],
      fallbackUsers: [],
      nowIso: '2026-05-14T10:00:00.000Z'
    });

    expect(snapshot).toEqual({
      source: 'api',
      fleetAssets: [
        {
          id: 'yacht-001',
          name: 'Yacht Aurora',
          modality: 'yachts',
          status: 'available',
          location: 'Não informado',
          nextWindow: 'Cadastro estrutural sem agenda sincronizada'
        }
      ],
      accessUsers: [
      {
        id: 'asg-001',
        userId: 'user-1',
        displayName: 'Renata Serra',
        email: 'renata@primeyou.com',
        role: 'portal_admin',
          assetScopes: ['global'],
          mfaEnabled: true,
          status: 'active',
          lastReviewedAt: '2026-05-01T10:00:00.000Z'
        }
      ],
      maintenanceTickets: [
        {
          id: 'mt-1',
          ticketNumber: '1',
          assetId: 'yacht-001',
          assetName: 'Yacht Aurora',
          title: 'Critical release inspection',
          category: 'inspection',
          priority: 'P1',
          status: 'frozen',
          owner: 'Operações Centrais',
          openedBy: 'central-1',
          openedAt: '2026-05-14T08:00:00.000Z',
          updatedAt: '2026-05-14T12:00:00.000Z',
          frozenCount: 2,
          thirdParty: true,
          kanbanSubstatus: 'accounts_freeze',
          evidenceCompleteness: 0.5,
          slaProgress: 0.82
        }
      ],
      maintenanceCosts: [
        {
          id: 'cost-1',
          assetId: 'yacht-001',
          ticketId: 'mt-1',
          description: 'Critical inspection invoice',
          amount: 18750,
          currency: 'BRL',
          registeredAt: '2026-05-14T12:00:00.000Z'
        }
      ],
      agendaEvents: [
        {
          id: 'ag-1',
          assetId: 'yacht-001',
          assetName: 'Yacht Aurora',
          type: 'utilization',
          title: 'Owners weekend',
          description: undefined,
          owner: 'Operações Centrais',
          startsAt: '2026-05-14T09:00:00.000Z',
          endsAt: '2026-05-14T12:00:00.000Z',
          provisional: false,
          validatedAt: null,
          safeMinimumBreached: false
        }
      ]
    });
    expect(fetchImpl).toHaveBeenCalledTimes(5);
  });

  it('fails authenticated operational snapshots when a live domain read fails', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            assets: [
              createAsset({
                assetId: 'yacht-001',
                displayName: 'Yacht Aurora',
                active: true
              })
            ]
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            assignments: [
              createAssignment({
                id: 'asg-001',
                role: 'portal_admin',
                assetIds: ['global'],
                revokedAt: null
              })
            ]
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        )
      )
      .mockResolvedValueOnce(new Response('maintenance unavailable', { status: 503 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ costs: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ events: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      );

    await expect(
      fetchPortalOperationsSnapshot({
        apiBaseUrl: 'http://api.local/v1',
        fetchImpl,
        sessionToken: 'signed-session-token',
        fallbackAssets: [],
        fallbackUsers: [],
        fallbackMaintenanceTickets: [],
        fallbackMaintenanceCosts: [],
        fallbackAgendaEvents: []
      })
    ).rejects.toBeInstanceOf(portalApiModule.PortalApiReadError);
  });

  it('scopes fallback dashboard data to the assigned assets for field team users', async () => {
    const snapshot = await fetchPortalOperationsSnapshot({
      actor: {
        userId: 'field-1',
        tenantId: 'prime-you',
        role: 'asset_field_team',
        assetIds: ['yacht-001']
      },
      fallbackAssets: [
        createFrontendAsset('yacht-001', 'Yacht Aurora'),
        createFrontendAsset('yacht-002', 'Yacht Boreal')
      ],
      fallbackUsers: [],
      fallbackMaintenanceTickets: [
        createFrontendTicket('mt-1', 'yacht-001', 'Generator review'),
        createFrontendTicket('mt-2', 'yacht-002', 'Hull review')
      ],
      fallbackMaintenanceCosts: [],
      fallbackAgendaEvents: [
        createFrontendAgendaEvent('ag-1', 'yacht-001', 'Owner weekend'),
        createFrontendAgendaEvent('ag-2', 'yacht-002', 'Charter handoff')
      ]
    });

    expect(snapshot).toEqual({
      source: 'mock',
      fleetAssets: [createFrontendAsset('yacht-001', 'Yacht Aurora')],
      accessUsers: [],
      maintenanceTickets: [createFrontendTicket('mt-1', 'yacht-001', 'Generator review')],
      maintenanceCosts: [],
      agendaEvents: [createFrontendAgendaEvent('ag-1', 'yacht-001', 'Owner weekend')]
    });
  });

  it('uses backend responses when audit ledger endpoint is available', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            assets: [
              createAsset({
                assetId: 'yacht-001',
                displayName: 'Yacht Aurora',
                active: true
              })
            ]
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            assignments: []
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            entries: [
              createAuditLedgerApiRecord({
                id: 'memo-1',
                type: 'decision_memo',
                title: 'agenda.conflict.override · agenda_event',
                summary: 'Keep technical block and reschedule owner usage.',
                actor: 'central-1',
                at: '2026-05-14T09:30:00.000Z',
                assetId: 'yacht-001',
                aggregateType: 'agenda_event',
                aggregateId: 'event-1',
                status: 'confirmed'
              })
            ]
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        )
      );

    const snapshot = await fetchPortalAuditSnapshot({
      apiBaseUrl: 'http://api.local/v1',
      fetchImpl,
      fallbackAssets: [],
      fallbackUsers: []
    });

    expect(snapshot).toEqual({
      source: 'api',
      fleetAssets: [
        {
          id: 'yacht-001',
          name: 'Yacht Aurora',
          modality: 'yachts',
          status: 'available',
          location: 'Não informado',
          nextWindow: 'Cadastro estrutural sem agenda sincronizada'
        }
      ],
      auditRecords: [
        {
          id: 'memo-1',
          type: 'decision_memo',
          title: 'agenda.conflict.override · agenda_event',
          assetId: 'yacht-001',
          assetName: 'Yacht Aurora',
          actor: 'central-1',
          at: '2026-05-14T09:30:00.000Z',
          summary: 'Keep technical block and reschedule owner usage.',
          aggregateType: 'agenda_event',
          aggregateId: 'event-1',
          status: 'confirmed',
          recordId: '',
          sourceVersion: 0,
          targetVersion: 0
        }
      ]
    });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('maps backend maintenance detail into the frontend detail record with derived evidence and audit sections', () => {
    const detail = mapMaintenanceDetailToRecord(
      createMaintenanceDetailTicket({
        id: 'mt-1',
        assetId: 'yacht-001',
        category: 'corrective',
        priority: 'P2',
        description: 'Investigate starboard pump oscillation',
        maintenanceSystem: 'electrical',
        notes: 'Contexto do chamado aberto pela tripulação.',
        origin: 'asset_field_team',
        openedBy: 'field-1',
        openedAt: '2026-05-14T09:00:00.000Z',
        status: 'frozen',
        freezeCount: 1,
        frozenReason: 'awaiting_supplier_response',
        updatedAt: '2026-05-14T13:30:00.000Z',
        evidenceCount: 2,
        evidenceTypes: ['diagnostic', 'financial_document'],
        evidences: [
          createMaintenanceEvidence({
            id: 'ev-1',
            type: 'diagnostic',
            fileName: 'diagnostic-photo.jpg',
            uploadedBy: 'field-1',
            uploadedAt: '2026-05-14T10:00:00.000Z'
          }),
          createMaintenanceEvidence({
            id: 'ev-2',
            type: 'financial_document',
            fileName: 'quote.pdf',
            uploadedBy: 'central-1',
            uploadedAt: '2026-05-14T11:00:00.000Z'
          })
        ]
      }),
      [
        {
          id: 'yacht-001',
          name: 'Yacht Aurora',
          status: 'restricted',
          location: 'Angra dos Reis',
          nextWindow: 'Bloqueio tecnico'
        }
      ]
    );

    expect(detail).toMatchObject({
      id: 'mt-1',
      assetId: 'yacht-001',
      assetName: 'Yacht Aurora',
      assetTag: 'YACHT-001',
      title: 'Investigate starboard pump oscillation',
      maintenanceSystem: 'electrical',
      openedBy: 'field-1',
      notes: 'Contexto do chamado aberto pela tripulação.',
      owner: 'Equipe de campo - Embarcações',
      status: 'frozen',
      evidenceChecklist: [
        { label: 'Evidencia diagnostica', status: 'complete' },
        { label: 'Documento financeiro', status: 'complete' },
        { label: 'Evidencia de execucao', status: 'pending' },
        { label: 'Liberacao de qualidade', status: 'pending' }
      ],
      thirdParty: {
        involved: true,
        supplier: 'Não sincronizado',
        centralValidation: 'A confirmar pela operação central'
      }
    });
    expect(detail.freezeHistory).toEqual([
      {
        reason: 'Aguardando resposta do fornecedor',
        at: '2026-05-14T13:30:00.000Z',
        by: 'Equipe de campo - Embarcações'
      }
    ]);
    expect(detail.auditTrail).toEqual([
      {
        title: 'Chamado aberto',
        at: '2026-05-14T09:00:00.000Z',
        actor: 'field-1',
        note: 'Origem: asset_field_team'
      },
      {
        title: 'Evidencia anexada',
        at: '2026-05-14T10:00:00.000Z',
        actor: 'field-1',
        note: 'diagnostic - diagnostic-photo.jpg'
      },
      {
        title: 'Evidencia anexada',
        at: '2026-05-14T11:00:00.000Z',
        actor: 'central-1',
        note: 'financial_document - quote.pdf'
      },
      {
        title: 'Ultima atualizacao',
        at: '2026-05-14T13:30:00.000Z',
        actor: 'Equipe de campo - Embarcações',
        note: 'Status atual: frozen'
      }
    ]);
  });

  it('extracts structured comments from the maintenance notes document', () => {
    const detail = mapMaintenanceDetailToRecord(
      createMaintenanceDetailTicket({
        id: 'mt-3',
        assetId: 'yacht-002',
        category: 'improvement',
        priority: 'P3',
        description: 'Improve helm response',
        notes:
          'Solicitante: Operacoes\n\n[[OPS_PORTAL_COMMENTS_V1]]\n{"version":1,"comments":[{"id":"comment-1","author":"Operacoes","message":"Aguardando validacao do fornecedor.","at":"2026-05-20T14:15:00.000Z"}]}',
        origin: 'central_operations',
        openedBy: 'central-1',
        openedAt: '2026-05-20T10:00:00.000Z',
        status: 'in_progress',
        freezeCount: 0,
        updatedAt: '2026-05-20T14:15:00.000Z',
        evidenceCount: 0,
        evidenceTypes: [],
        evidences: []
      }),
      [
        {
          id: 'yacht-002',
          name: 'Yacht Boreal',
          status: 'available',
          location: 'Rio de Janeiro',
          nextWindow: 'Disponivel'
        }
      ]
    );

    expect(detail.notes).toBe('Solicitante: Operacoes');
    expect(detail.comments).toEqual([
      {
        id: 'comment-1',
        author: 'Operacoes',
        message: 'Aguardando validacao do fornecedor.',
        at: '2026-05-20T14:15:00.000Z'
      }
    ]);
  });

  it('loads maintenance detail from the backend when the ticket detail endpoint is available', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            assets: [
              createAsset({
                assetId: 'yacht-001',
                displayName: 'Yacht Aurora',
                active: true
              })
            ]
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            assignments: []
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            found: true,
            ticket: createMaintenanceDetailTicket({
              id: 'mt-1',
              assetId: 'yacht-001',
              category: 'inspection',
              priority: 'P1',
              description: 'Critical inspection before release',
              origin: 'central_operations',
              openedBy: 'central-1',
              openedAt: '2026-05-14T08:00:00.000Z',
              status: 'payment',
              freezeCount: 0,
              updatedAt: '2026-05-14T12:30:00.000Z',
              evidenceCount: 2,
              evidenceTypes: ['diagnostic', 'financial_document'],
              evidences: [
                createMaintenanceEvidence({
                  id: 'ev-1',
                  type: 'diagnostic',
                  fileName: 'diagnostic.jpg',
                  uploadedBy: 'central-1',
                  uploadedAt: '2026-05-14T09:00:00.000Z'
                })
              ]
            })
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        )
      );

    const detail = await fetchMaintenanceDetailSnapshot('mt-1', {
      apiBaseUrl: 'http://api.local/v1',
      fetchImpl
    });

    expect(detail.source).toBe('api');
    expect(detail.ticket).toMatchObject({
      id: 'mt-1',
      assetName: 'Yacht Aurora',
      title: 'Critical inspection before release',
      owner: 'Operações Centrais',
      status: 'payment'
    });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('does not expose fallback maintenance detail outside the assigned asset scope', async () => {
    const detail = await fetchMaintenanceDetailSnapshot('mt-2', {
      actor: {
        userId: 'field-1',
        tenantId: 'prime-you',
        role: 'asset_field_team',
        assetIds: ['yacht-001']
      },
      fallbackMaintenanceDetails: [
        createFrontendMaintenanceDetail('mt-2', 'yacht-002', 'Propulsion review')
      ]
    });

    expect(detail).toEqual({
      source: 'mock',
      ticket: null
    });
  });

  it('posts maintenance ticket creation to the live API contract', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          created: true,
          reason: 'CREATED',
          ticket: {
            assetId: 'yacht-001',
            category: 'inspection',
            priority: 'P1',
            description: 'Critical inspection before release',
            origin: 'asset_field_team',
            openedBy: 'field-1',
            openedAt: '2026-05-14T08:00:00.000Z',
            status: 'pending',
            freezeCount: 0
          }
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' }
        }
      )
    );

    const result = await createMaintenanceTicket(
      {
        actor: {
          userId: 'field-1',
          tenantId: 'prime-you',
          role: 'asset_field_team',
          assetIds: ['yacht-001']
        },
        input: {
          assetId: 'yacht-001',
          category: 'inspection',
          priority: 'P1',
          description: 'Critical inspection before release',
          origin: 'asset_field_team',
          openedBy: 'field-1',
          openedAt: '2026-05-14T08:00:00.000Z'
        }
      },
      {
        apiBaseUrl: 'http://api.local/v1',
        fetchImpl
      }
    );

    expect(result).toMatchObject({
      created: true,
      reason: 'CREATED'
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://api.local/v1/maintenance/tickets',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          actor: {
            userId: 'field-1',
            tenantId: 'prime-you',
            role: 'asset_field_team',
            assetIds: ['yacht-001']
          },
          tenantId: 'prime-you',
          input: {
            assetId: 'yacht-001',
            category: 'inspection',
            priority: 'P1',
            description: 'Critical inspection before release',
            origin: 'asset_field_team',
            openedBy: 'field-1',
            openedAt: '2026-05-14T08:00:00.000Z'
          }
        })
      })
    );
  });

  it('posts decision memo creation to the live API contract', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          confirmed: true,
          memo: {
            context: 'Two overlapping events were escalated by central operations.',
            decision: 'Keep the technical block and reschedule the owner usage.',
            decidedBy: 'central-1',
            alternativesConsidered: ['Cancel maintenance'],
            expectedImpact: 'Avoids unsafe overlap and preserves compliance.',
            status: 'confirmed'
          }
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' }
        }
      )
    );

    const result = await createDecisionMemo(
      {
        actor: {
          userId: 'central-1',
          tenantId: 'prime-you',
          role: 'central_operations',
          assetIds: []
        },
        action: 'agenda.conflict.override',
        aggregateType: 'agenda_event',
        aggregateId: 'event-1',
        assetId: 'yacht-001',
        justification: {
          context: 'Two overlapping events were escalated by central operations.',
          decision: 'Keep the technical block and reschedule the owner usage.',
          decidedBy: 'central-1',
          alternativesConsidered: ['Cancel maintenance'],
          expectedImpact: 'Avoids unsafe overlap and preserves compliance.'
        }
      },
      {
        apiBaseUrl: 'http://api.local/v1',
        fetchImpl
      }
    );

    expect(result).toMatchObject({
      confirmed: true
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://api.local/v1/audit/decision-memos',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          actor: {
            userId: 'central-1',
            tenantId: 'prime-you',
            role: 'central_operations',
            assetIds: []
          },
          tenantId: 'prime-you',
          action: 'agenda.conflict.override',
          aggregateType: 'agenda_event',
          aggregateId: 'event-1',
          assetId: 'yacht-001',
          justification: {
            context: 'Two overlapping events were escalated by central operations.',
            decision: 'Keep the technical block and reschedule the owner usage.',
            decidedBy: 'central-1',
            alternativesConsidered: ['Cancel maintenance'],
            expectedImpact: 'Avoids unsafe overlap and preserves compliance.'
          }
        })
      })
    );
  });

  it('posts rectification creation to the live API contract', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          created: true,
          reason: 'RECTIFICATION_CREATED',
          rectification: {
            recordId: 'maintenance-1',
            sourceVersion: 3,
            targetVersion: 4,
            changedBy: 'central-1',
            reason: 'Correct invoice reference.',
            afterSnapshot: {
              supplierInvoiceNumber: 'INV-055'
            }
          }
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' }
        }
      )
    );

    const result = await createRectification(
      {
        actor: {
          userId: 'central-1',
          tenantId: 'prime-you',
          role: 'central_operations',
          assetIds: []
        },
        record: {
          recordId: 'maintenance-1',
          status: 'completed',
          version: 3
        },
        input: {
          changedBy: 'central-1',
          reason: 'Correct invoice reference.',
          afterSnapshot: {
            supplierInvoiceNumber: 'INV-055'
          }
        }
      },
      {
        apiBaseUrl: 'http://api.local/v1',
        fetchImpl
      }
    );

    expect(result).toMatchObject({
      created: true,
      reason: 'RECTIFICATION_CREATED'
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://api.local/v1/audit/rectifications',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          actor: {
            userId: 'central-1',
            tenantId: 'prime-you',
            role: 'central_operations',
            assetIds: []
          },
          tenantId: 'prime-you',
          record: {
            recordId: 'maintenance-1',
            status: 'completed',
            version: 3
          },
          input: {
            changedBy: 'central-1',
            reason: 'Correct invoice reference.',
            afterSnapshot: {
              supplierInvoiceNumber: 'INV-055'
            }
          }
        })
      })
    );
  });

  it('posts maintenance transitions to the live API contract', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          allowed: true,
          reason: 'ALLOWED',
          escalationRequired: false,
          ticket: {
            assetId: 'yacht-001',
            category: 'inspection',
            priority: 'P1',
            description: 'Critical inspection before release',
            origin: 'asset_field_team',
            openedBy: 'field-1',
            openedAt: '2026-05-14T08:00:00.000Z',
            status: 'in_progress',
            freezeCount: 0
          }
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' }
        }
      )
    );

    const result = await transitionMaintenanceTicket(
      {
        actor: {
          userId: 'tech-1',
          tenantId: 'prime-you',
          role: 'yachts_technical_coordination',
          assetIds: []
        },
        ticketId: 'mt-1',
        input: {
          toStatus: 'in_progress'
        }
      },
      {
        apiBaseUrl: 'http://api.local/v1',
        fetchImpl
      }
    );

    expect(result).toMatchObject({
      allowed: true,
      reason: 'ALLOWED'
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://api.local/v1/maintenance/tickets/mt-1/transitions',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          actor: {
            userId: 'tech-1',
            tenantId: 'prime-you',
            role: 'yachts_technical_coordination',
            assetIds: []
          },
          tenantId: 'prime-you',
          input: {
            toStatus: 'in_progress'
          }
        })
      })
    );
  });

  it('posts maintenance evidence registration to the live API contract', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          attached: true,
          reason: 'ATTACHED',
          evidence: {
            type: 'diagnostic',
            fileName: 'diagnostic-photo.jpg',
            mimeType: 'image/jpeg',
            fileSizeBytes: 1024,
            storageKey: 'maintenance/mt-1/aaaaaaaaaaaa-diagnostic-photo.jpg',
            sha256: 'a'.repeat(64),
            antivirusStatus: 'pending',
            uploadedBy: 'field-1',
            uploadedAt: '2026-05-14T08:30:00.000Z'
          }
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' }
        }
      )
    );

    const result = await attachMaintenanceEvidence(
      {
        actor: {
          userId: 'field-1',
          tenantId: 'prime-you',
          role: 'asset_field_team',
          assetIds: ['yacht-001']
        },
        ticketId: 'mt-1',
        input: {
          type: 'diagnostic',
          fileName: 'diagnostic-photo.jpg',
          mimeType: 'image/jpeg',
          fileSizeBytes: 1024,
          sha256: 'a'.repeat(64),
          uploadedBy: 'field-1',
          uploadedAt: '2026-05-14T08:30:00.000Z'
        }
      },
      {
        apiBaseUrl: 'http://api.local/v1',
        fetchImpl
      }
    );

    expect(result).toMatchObject({
      attached: true,
      reason: 'ATTACHED'
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://api.local/v1/maintenance/tickets/mt-1/evidences',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          actor: {
            userId: 'field-1',
            tenantId: 'prime-you',
            role: 'asset_field_team',
            assetIds: ['yacht-001']
          },
          tenantId: 'prime-you',
          input: {
            type: 'diagnostic',
            fileName: 'diagnostic-photo.jpg',
            mimeType: 'image/jpeg',
            fileSizeBytes: 1024,
            sha256: 'a'.repeat(64),
            uploadedBy: 'field-1',
            uploadedAt: '2026-05-14T08:30:00.000Z'
          }
        })
      })
    );
  });

  it('includes kanbanSubstatus when transitioning a maintenance ticket between kanban columns', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          allowed: true,
          reason: 'ALLOWED',
          escalationRequired: false,
          ticket: {
            assetId: 'yacht-001',
            category: 'corrective',
            priority: 'P2',
            description: 'Track supplier payment confirmation.',
            origin: 'central_operations',
            openedBy: 'central-1',
            openedAt: '2026-05-14T08:30:00.000Z',
            status: 'payment',
            kanbanSubstatus: 'payment_receipt',
            freezeCount: 0
          }
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' }
        }
      )
    );

    await transitionMaintenanceTicket(
      {
        actor: {
          userId: 'central-1',
          tenantId: 'prime-you',
          role: 'central_operations',
          assetIds: []
        },
        ticketId: 'mt-1',
        input: {
          toStatus: 'payment',
          kanbanSubstatus: 'payment_receipt'
        }
      },
      {
        apiBaseUrl: 'http://api.local/v1',
        fetchImpl
      }
    );

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://api.local/v1/maintenance/tickets/mt-1/transitions',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          actor: {
            userId: 'central-1',
            tenantId: 'prime-you',
            role: 'central_operations',
            assetIds: []
          },
          tenantId: 'prime-you',
          input: {
            toStatus: 'payment',
            kanbanSubstatus: 'payment_receipt'
          }
        })
      })
    );
  });

  it('posts agenda scheduling to the live API contract', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          allowed: true,
          reason: 'SCHEDULED',
          event: {
            id: 'ag-2',
            assetId: 'yacht-002',
            type: 'utilization',
            startsAt: '2026-05-14T12:00:00.000Z',
            endsAt: '2026-05-14T14:00:00.000Z'
          }
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' }
        }
      )
    );

    const result = await scheduleAgendaEvent(
      {
        actor: {
          userId: 'central-1',
          tenantId: 'prime-you',
          role: 'central_operations',
          assetIds: []
        },
        candidateEvent: {
          id: 'ag-2',
          assetId: 'yacht-002',
          type: 'utilization',
          startsAt: '2026-05-14T12:00:00.000Z',
          endsAt: '2026-05-14T14:00:00.000Z'
        }
      },
      {
        apiBaseUrl: 'http://api.local/v1',
        fetchImpl
      }
    );

    expect(result).toMatchObject({
      allowed: true,
      reason: 'SCHEDULED'
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://api.local/v1/agenda/events',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          actor: {
            userId: 'central-1',
            tenantId: 'prime-you',
            role: 'central_operations',
            assetIds: []
          },
          tenantId: 'prime-you',
          candidateEvent: {
            id: 'ag-2',
            assetId: 'yacht-002',
            type: 'utilization',
            startsAt: '2026-05-14T12:00:00.000Z',
            endsAt: '2026-05-14T14:00:00.000Z'
          }
        })
      })
    );
  });

  it('posts agenda rescheduling to the live API contract', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          allowed: true,
          reason: 'UPDATED',
          event: {
            id: 'ag-2',
            assetId: 'yacht-002',
            type: 'utilization',
            startsAt: '2026-05-14T13:00:00.000Z',
            endsAt: '2026-05-14T15:00:00.000Z'
          }
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' }
        }
      )
    );

    const result = await rescheduleAgendaEvent(
      {
        actor: {
          userId: 'central-1',
          tenantId: 'prime-you',
          role: 'central_operations',
          assetIds: []
        },
        eventId: 'ag-2',
        updatedEvent: {
          id: 'ag-2',
          assetId: 'yacht-002',
          type: 'utilization',
          startsAt: '2026-05-14T13:00:00.000Z',
          endsAt: '2026-05-14T15:00:00.000Z'
        }
      },
      {
        apiBaseUrl: 'http://api.local/v1',
        fetchImpl
      }
    );

    expect(result).toMatchObject({
      allowed: true,
      reason: 'UPDATED'
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://api.local/v1/agenda/events/ag-2/reschedule',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          actor: {
            userId: 'central-1',
            tenantId: 'prime-you',
            role: 'central_operations',
            assetIds: []
          },
          tenantId: 'prime-you',
          updatedEvent: {
            id: 'ag-2',
            assetId: 'yacht-002',
            type: 'utilization',
            startsAt: '2026-05-14T13:00:00.000Z',
            endsAt: '2026-05-14T15:00:00.000Z'
          }
        })
      })
    );
  });

  it('posts agenda deletion to the live API contract', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          allowed: true,
          reason: 'DELETED'
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' }
        }
      )
    );

    const result = await deleteAgendaEvent(
      {
        actor: {
          userId: 'field-1',
          tenantId: 'prime-you',
          role: 'asset_field_team',
          assetIds: ['yacht-001']
        },
        eventId: 'ag-2'
      },
      {
        apiBaseUrl: 'http://api.local/v1',
        fetchImpl
      }
    );

    expect(result).toMatchObject({
      allowed: true,
      reason: 'DELETED'
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://api.local/v1/agenda/events/ag-2/delete',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          actor: {
            userId: 'field-1',
            tenantId: 'prime-you',
            role: 'asset_field_team',
            assetIds: ['yacht-001']
          },
          tenantId: 'prime-you'
        })
      })
    );
  });
});

function createFrontendAsset(id: string, name: string) {
  return {
    id,
    name,
    status: 'available' as const,
    location: 'Não informado',
    nextWindow: 'Cadastro estrutural sem agenda sincronizada'
  };
}

function createFrontendTicket(id: string, assetId: string, title: string) {
  return {
    id,
    ticketNumber: id.replace(/\D+/g, '') || id,
    assetId,
    assetName: assetId === 'yacht-001' ? 'Yacht Aurora' : 'Yacht Boreal',
    title,
    category: 'corrective' as const,
    priority: 'P2' as const,
    notes: '',
    comments: [],
    maintenanceSystem: 'mechanical' as const,
    status: 'pending' as const,
    owner: 'EmbarcaÃ§Ãµes',
    openedAt: '2026-05-14T08:00:00.000Z',
    frozenCount: 0,
    thirdParty: false,
    kanbanSubstatus: 'call_opening' as const,
    evidenceCompleteness: 0,
    slaProgress: 0.18
  };
}

function createFrontendAgendaEvent(id: string, assetId: string, title: string) {
  return {
    id,
    assetId,
    assetName: assetId === 'yacht-001' ? 'Yacht Aurora' : 'Yacht Boreal',
    type: 'utilization' as const,
    title,
    description: undefined,
    owner: 'OperaÃ§Ãµes - Real Estate e Yachts',
    startsAt: '2026-05-14T09:00:00.000Z',
    endsAt: '2026-05-14T12:00:00.000Z',
    provisional: false,
    validatedAt: null,
    safeMinimumBreached: false
  };
}


function createFrontendMaintenanceDetail(id: string, assetId: string, title: string) {
  return {
    id,
    ticketNumber: id.replace(/\D+/g, '') || id,
    assetId,
    assetTag: assetId.toUpperCase(),
    assetName: assetId === 'yacht-001' ? 'Yacht Aurora' : 'Yacht Boreal',
    title,
    description: title,
    category: 'corrective' as const,
    priority: 'P2' as const,
    notes: '',
    comments: [],
    maintenanceSystem: 'mechanical' as const,
    status: 'pending' as const,
    owner: 'EmbarcaÃ§Ãµes',
    openedAt: '2026-05-14T08:00:00.000Z',
    frozenCount: 0,
    kanbanSubstatus: 'call_opening' as const,
    freezeHistory: [],
    budget: {
      preliminary: 'Nao sincronizado',
      current: 'Nao sincronizado',
      deltaLabel: 'Sem integracao financeira',
      ownership: 'Operacoes confirmam pagamento quando aplicavel'
    },
    thirdParty: {
      involved: false,
      strategy: 'Nao aplicavel',
      supplier: 'Não sincronizado',
      centralValidation: 'A confirmar pela operação central'
    },
    evidenceCompleteness: 0,
    slaProgress: 0.18,
    substeps: [],
    evidenceChecklist: [],
    evidences: [],
    auditTrail: []
  };
}

function createAssignment(overrides: {
  id: string;
  role: AccessUserRecord['role'];
  assetIds: string[];
  revokedAt: string | null;
}) {
  return {
    id: overrides.id,
    tenantId: 'prime-you',
    userId: 'user-1',
    displayName: 'Renata Serra',
    email: 'renata@primeyou.com',
    role: overrides.role,
    assetIds: overrides.assetIds,
    mfaEnabled: true,
    lastReviewedAt: '2026-05-01T10:00:00.000Z',
    revokedAt: overrides.revokedAt,
    createdAt: '2026-05-01T10:00:00.000Z',
    updatedAt: '2026-05-01T10:00:00.000Z',
    mfaRequired: true,
    mfaCompliant: true,
    reviewCadence: 'monthly',
    reviewDue: false
  };
}

function createAsset(overrides: {
  assetId: string;
  displayName: string;
  active: boolean;
}) {
  return {
    id: `db-${overrides.assetId}`,
    tenantId: 'prime-you',
    assetId: overrides.assetId,
    displayName: overrides.displayName,
    modality: 'yachts',
    timezone: 'America/Sao_Paulo',
    legacyAssetId: null,
    active: overrides.active,
    createdAt: '2026-05-01T10:00:00.000Z',
    updatedAt: '2026-05-01T10:00:00.000Z'
  };
}

function createMaintenanceQueueTicket(overrides: {
  id: string;
  legacyRowId?: string | null;
  assetId: string;
  title?: string;
  category: 'preventive' | 'corrective' | 'emergency' | 'improvement' | 'inspection' | 'warranty';
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  description: string;
  maintenanceSystem?:
    | 'electrical'
    | 'hydraulic'
    | 'mechanical'
    | 'metalwork'
    | 'upholstery'
    | 'painting'
    | 'equipment'
    | 'electronics'
    | 'automation'
    | 'image_sound'
    | 'other';
  legacyTicketCode?: string | null;
  origin: 'asset_field_team' | 'yachts_technical_coordination' | 'central_operations';
  openedBy: string;
  openedAt: string;
  status: 'pending' | 'in_progress' | 'frozen' | 'payment' | 'completed' | 'cancelled' | 'reopened';
  kanbanSubstatus?:
    | 'call_opening'
    | 'ticket_qualification'
    | 'onsite_diagnosis'
    | 'preliminary_quote'
    | 'absorption_strategy'
    | 'date_scheduling'
    | 'technical_approval'
    | 'budget_allocation'
    | 'service_preparation'
    | 'service_execution'
    | 'complementary_quote'
    | 'quality_control'
    | 'accounts_freeze'
    | 'payment_request'
    | 'payment_scheduling'
    | 'payment_receipt'
    | 'closed_files'
    | 'cancelled';
  freezeCount: number;
  evidenceCount: number;
  evidenceTypes: Array<'diagnostic' | 'financial_document' | 'execution_evidence' | 'quality_release'>;
  frozenReason?:
    | 'awaiting_fiscal_document'
    | 'awaiting_supplier_response'
    | 'awaiting_central_operations_decision'
    | 'awaiting_critical_part'
    | 'awaiting_safe_operational_window';
}) {
  return {
    id: overrides.id,
    legacyRowId: overrides.legacyRowId ?? null,
    assetId: overrides.assetId,
    title: overrides.title ?? null,
    category: overrides.category,
    priority: overrides.priority,
    description: overrides.description,
    maintenanceSystem: overrides.maintenanceSystem ?? null,
    legacyTicketCode: overrides.legacyTicketCode ?? null,
    origin: overrides.origin,
    openedBy: overrides.openedBy,
    openedAt: overrides.openedAt,
    status: overrides.status,
    kanbanSubstatus: overrides.kanbanSubstatus ?? null,
    freezeCount: overrides.freezeCount,
    frozenReason: overrides.frozenReason ?? null,
    updatedAt: '2026-05-14T12:00:00.000Z',
    evidenceCount: overrides.evidenceCount,
    evidenceTypes: overrides.evidenceTypes
  };
}

function createAgendaApiEvent(overrides: {
  id: string;
  assetId: string;
  type: 'utilization' | 'planned_maintenance' | 'emergency_maintenance' | 'operational_block' | 'crew_rest';
  title?: string;
  description?: string | null;
  startsAt: string;
  endsAt: string;
  safeMinimumBreached: boolean;
  provisional: boolean;
  validatedAt: string | null;
}) {
  return {
    id: overrides.id,
    assetId: overrides.assetId,
    type: overrides.type,
    title: overrides.title ?? null,
    description: overrides.description ?? null,
    startsAt: overrides.startsAt,
    endsAt: overrides.endsAt,
    safeMinimumBreached: overrides.safeMinimumBreached,
    provisional: overrides.provisional,
    validatedAt: overrides.validatedAt,
    updatedAt: '2026-05-14T12:00:00.000Z'
  };
}

function createMaintenanceCostApiRecord(overrides: {
  id: string;
  assetId: string;
  maintenanceTicketId: string;
  description: string;
  amount: number;
  supplierId?: string | null;
  currency?: string;
  registeredAt?: string;
}) {
  return {
    id: overrides.id,
    assetId: overrides.assetId,
    maintenanceTicketId: overrides.maintenanceTicketId,
    supplierId: overrides.supplierId ?? null,
    description: overrides.description,
    amount: overrides.amount,
    currency: overrides.currency ?? 'BRL',
    registeredAt: overrides.registeredAt ?? '2026-05-14T12:00:00.000Z'
  };
}

function createMaintenanceDetailTicket(overrides: {
  id: string;
  assetId: string;
  title?: string;
  category: 'preventive' | 'corrective' | 'emergency' | 'improvement' | 'inspection' | 'warranty';
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  description: string;
  maintenanceSystem?:
    | 'electrical'
    | 'hydraulic'
    | 'mechanical'
    | 'metalwork'
    | 'upholstery'
    | 'painting'
    | 'equipment'
    | 'electronics'
    | 'automation'
    | 'image_sound'
    | 'other';
  notes?: string | null;
  legacyTicketCode?: string | null;
  origin: 'asset_field_team' | 'yachts_technical_coordination' | 'central_operations';
  openedBy: string;
  openedAt: string;
  status: 'pending' | 'in_progress' | 'frozen' | 'payment' | 'completed' | 'cancelled' | 'reopened';
  freezeCount: number;
  updatedAt: string;
  evidenceCount: number;
  evidenceTypes: Array<'diagnostic' | 'financial_document' | 'execution_evidence' | 'quality_release'>;
  evidences: Array<ReturnType<typeof createMaintenanceEvidence>>;
  frozenReason?:
    | 'awaiting_fiscal_document'
    | 'awaiting_supplier_response'
    | 'awaiting_central_operations_decision'
    | 'awaiting_critical_part'
    | 'awaiting_safe_operational_window';
}) {
  return {
    id: overrides.id,
    assetId: overrides.assetId,
    title: overrides.title ?? null,
    category: overrides.category,
    priority: overrides.priority,
    description: overrides.description,
    maintenanceSystem: overrides.maintenanceSystem ?? null,
    notes: overrides.notes ?? null,
    legacyTicketCode: overrides.legacyTicketCode ?? null,
    origin: overrides.origin,
    openedBy: overrides.openedBy,
    openedAt: overrides.openedAt,
    status: overrides.status,
    freezeCount: overrides.freezeCount,
    frozenReason: overrides.frozenReason ?? null,
    updatedAt: overrides.updatedAt,
    evidenceCount: overrides.evidenceCount,
    evidenceTypes: overrides.evidenceTypes,
    evidences: overrides.evidences
  };
}

function createMaintenanceEvidence(overrides: {
  id: string;
  type: 'diagnostic' | 'financial_document' | 'execution_evidence' | 'quality_release';
  fileName: string;
  uploadedBy: string;
  uploadedAt: string;
}) {
  return {
    id: overrides.id,
    tenantId: 'prime-you',
    ticketId: 'mt-1',
    type: overrides.type,
    fileName: overrides.fileName,
    mimeType: overrides.type === 'financial_document' ? 'application/pdf' : 'image/jpeg',
    fileSizeBytes: 1024,
    storageKey: `maintenance/${overrides.id}/${overrides.fileName}`,
    sha256: 'a'.repeat(64),
    antivirusStatus: 'clean',
    uploadedBy: overrides.uploadedBy,
    uploadedAt: overrides.uploadedAt,
    createdAt: overrides.uploadedAt
  };
}


function createAuditLedgerApiRecord(overrides: {
  id: string;
  type: 'decision_memo' | 'rectification';
  title: string;
  summary: string;
  actor: string;
  at: string;
  assetId?: string;
  aggregateType?: string;
  aggregateId?: string;
  recordId?: string;
  sourceVersion?: number;
  targetVersion?: number;
  status?: string;
}) {
  return {
    ...overrides
  };
}

function createCutoverRunApiRecord(overrides: {
  id: string;
  label: string;
  status: 'draft' | 'approved' | 'blocked' | 'completed';
  goLiveDecision: 'go' | 'no_go' | null;
  futureAgendaDaysMigrated: number;
  finalFreezeApplied: boolean;
  invalidCriticalAttachmentIds: string[];
  lastEvaluationApproved: boolean | null;
  lastEvaluationBlockers: Array<Record<string, unknown>>;
  approvals: {
    centralOperations: {
      approved: boolean;
      approvedBy: string | null;
      approvedAt: string | null;
    };
    technicalCoordination: {
      approved: boolean;
      approvedBy: string | null;
      approvedAt: string | null;
    };
    portalAdmin: {
      approved: boolean;
      approvedBy: string | null;
      approvedAt: string | null;
    };
  };
  entityCounts: Array<{
    entity: string;
    sourceCount: number;
    migratedCount: number;
  }>;
  evidences: Array<{
    id: string;
    type: string;
    title: string;
    detail: string;
    reference: string;
    valid: boolean;
    createdAt: string;
  }>;
  checkpoints: Array<{
    id: string;
    checkpoint: 'T+1' | 'T+4' | 'T+24';
    status: 'pending' | 'completed' | 'blocked';
    notes: string;
    recordedBy: string;
    recordedAt: string;
  }>;
}) {
  return {
    id: overrides.id,
    tenantId: 'prime-you',
    label: overrides.label,
    status: overrides.status,
    goLiveDecision: overrides.goLiveDecision,
    decisionAt: overrides.goLiveDecision ? '2026-05-15T10:30:00.000Z' : null,
    decidedBy: overrides.goLiveDecision ? 'Paulo Braga' : null,
    futureAgendaDaysMigrated: overrides.futureAgendaDaysMigrated,
    finalFreezeApplied: overrides.finalFreezeApplied,
    invalidCriticalAttachmentIds: overrides.invalidCriticalAttachmentIds,
    lastEvaluationApproved: overrides.lastEvaluationApproved,
    lastEvaluationBlockers: overrides.lastEvaluationBlockers,
    approvals: overrides.approvals,
    entityCounts: overrides.entityCounts,
    evidences: overrides.evidences,
    checkpoints: overrides.checkpoints,
    createdBy: 'Paulo Braga',
    createdAt: '2026-05-15T09:00:00.000Z',
    updatedAt: '2026-05-15T09:30:00.000Z'
  };
}
