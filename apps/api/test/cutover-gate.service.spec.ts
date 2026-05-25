import { describe, expect, it } from 'vitest';

import { CutoverGateService } from '../src/modules/cutover/cutover-gate.service.js';

describe('CutoverGateService', () => {
  it('blocks go-live when entity counts diverge or critical attachments are invalid', () => {
    const service = new CutoverGateService();

    expect(
      service.evaluateGate({
        entityCounts: [
          {
            entity: 'maintenance_tickets',
            sourceCount: 42,
            migratedCount: 41
          }
        ],
        invalidCriticalAttachmentIds: ['attachment-7'],
        futureAgendaDaysMigrated: 90,
        finalFreezeApplied: true,
        approvals: {
          centralOperations: true,
          technicalCoordination: true,
          portalAdmin: true
        }
      })
    ).toEqual({
      approved: false,
      blockers: [
        {
          code: 'ENTITY_COUNT_MISMATCH',
          entity: 'maintenance_tickets',
          sourceCount: 42,
          migratedCount: 41
        },
        {
          code: 'INVALID_CRITICAL_ATTACHMENTS',
          attachmentIds: ['attachment-7']
        }
      ]
    });
  });

  it('approves go-live only when counts, critical attachments, freeze, future agenda and approvals are valid', () => {
    const service = new CutoverGateService();

    expect(
      service.evaluateGate({
        entityCounts: [
          {
            entity: 'maintenance_tickets',
            sourceCount: 42,
            migratedCount: 42
          },
          {
            entity: 'agenda_events',
            sourceCount: 12,
            migratedCount: 12
          }
        ],
        invalidCriticalAttachmentIds: [],
        futureAgendaDaysMigrated: 90,
        finalFreezeApplied: true,
        approvals: {
          centralOperations: true,
          technicalCoordination: true,
          portalAdmin: true
        }
      })
    ).toEqual({
      approved: true,
      blockers: []
    });
  });
});
