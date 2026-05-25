import { Injectable } from '@nestjs/common';

export type CutoverEntity =
  | 'maintenance_tickets'
  | 'agenda_events'
  | 'critical_attachments'
  | (string & {});

export type CutoverEntityCount = {
  entity: CutoverEntity;
  sourceCount: number;
  migratedCount: number;
};

export type CutoverGateInput = {
  entityCounts: CutoverEntityCount[];
  invalidCriticalAttachmentIds: string[];
  futureAgendaDaysMigrated: number;
  finalFreezeApplied: boolean;
  approvals: {
    centralOperations: boolean;
    technicalCoordination: boolean;
    portalAdmin: boolean;
  };
};

export type CutoverGateBlocker =
  | {
      code: 'ENTITY_COUNT_MISMATCH';
      entity: CutoverEntity;
      sourceCount: number;
      migratedCount: number;
    }
  | {
      code: 'INVALID_CRITICAL_ATTACHMENTS';
      attachmentIds: string[];
    }
  | {
      code: 'FUTURE_AGENDA_WINDOW_INCOMPLETE';
      requiredDays: 90;
      migratedDays: number;
    }
  | {
      code: 'FINAL_FREEZE_NOT_APPLIED';
    }
  | {
      code: 'MISSING_APPROVALS';
      missingApprovals: Array<'centralOperations' | 'technicalCoordination' | 'portalAdmin'>;
    };

export type CutoverGateDecision = {
  approved: boolean;
  blockers: CutoverGateBlocker[];
};

@Injectable()
export class CutoverGateService {
  evaluateGate(input: CutoverGateInput): CutoverGateDecision {
    const blockers: CutoverGateBlocker[] = [];

    for (const entityCount of input.entityCounts) {
      if (entityCount.sourceCount !== entityCount.migratedCount) {
        blockers.push({
          code: 'ENTITY_COUNT_MISMATCH',
          entity: entityCount.entity,
          sourceCount: entityCount.sourceCount,
          migratedCount: entityCount.migratedCount
        });
      }
    }

    if (input.invalidCriticalAttachmentIds.length > 0) {
      blockers.push({
        code: 'INVALID_CRITICAL_ATTACHMENTS',
        attachmentIds: [...input.invalidCriticalAttachmentIds]
      });
    }

    if (input.futureAgendaDaysMigrated < 90) {
      blockers.push({
        code: 'FUTURE_AGENDA_WINDOW_INCOMPLETE',
        requiredDays: 90,
        migratedDays: input.futureAgendaDaysMigrated
      });
    }

    if (!input.finalFreezeApplied) {
      blockers.push({
        code: 'FINAL_FREEZE_NOT_APPLIED'
      });
    }

    const missingApprovals = (Object.entries(input.approvals) as Array<
      ['centralOperations' | 'technicalCoordination' | 'portalAdmin', boolean]
    >)
      .filter(([, approved]) => !approved)
      .map(([approval]) => approval);

    if (missingApprovals.length > 0) {
      blockers.push({
        code: 'MISSING_APPROVALS',
        missingApprovals
      });
    }

    return {
      approved: blockers.length === 0,
      blockers
    };
  }
}
