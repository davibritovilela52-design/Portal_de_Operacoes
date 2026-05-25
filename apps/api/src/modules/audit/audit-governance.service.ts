import { Injectable } from '@nestjs/common';

export type CriticalActionJustification = {
  context: string;
  decision: string;
  decidedBy: string;
  alternativesConsidered: string[];
  expectedImpact: string;
};

export type AuditDecisionMemo = CriticalActionJustification & {
  status: 'draft' | 'confirmed';
};

export type ImmutableCompletedRecord = {
  recordId: string;
  status: 'completed' | 'open';
  version: number;
};

export type RectificationInput = {
  changedBy: string;
  reason: string;
  afterSnapshot: Record<string, unknown>;
};

export type Rectification = {
  recordId: string;
  sourceVersion: number;
  targetVersion: number;
  changedBy: string;
  reason: string;
  afterSnapshot: Record<string, unknown>;
};

export type CriticalActionDecision =
  | {
      allowed: true;
      reason: 'ALLOWED';
    }
  | {
      allowed: false;
      reason: 'JUSTIFICATION_REQUIRED';
    };

export type DirectMutationDecision =
  | {
      allowed: true;
      reason: 'ALLOWED';
    }
  | {
      allowed: false;
      reason: 'COMPLETED_RECORD_IMMUTABLE';
      resolution: 'CREATE_VERSIONED_RECTIFICATION';
    };

export type RectificationDecision =
  | {
      created: true;
      reason: 'RECTIFICATION_CREATED';
      rectification: Rectification;
    }
  | {
      created: false;
      reason: 'RECTIFICATION_FIELDS_REQUIRED';
      missingFields: string[];
    };

export type DecisionMemoUpdateDecision =
  | {
      allowed: true;
      reason: 'UPDATED';
      memo: AuditDecisionMemo;
    }
  | {
      allowed: false;
      reason: 'DECISION_MEMO_IMMUTABLE';
    };

const requiredJustificationFields = [
  'context',
  'decision',
  'decidedBy',
  'alternativesConsidered',
  'expectedImpact'
] as const;

@Injectable()
export class AuditGovernanceService {
  getCatalog(): { requiredJustificationFields: string[] } {
    return {
      requiredJustificationFields: [...requiredJustificationFields]
    };
  }

  evaluateCriticalAction(
    _action: string,
    justification?: CriticalActionJustification
  ): CriticalActionDecision {
    if (!this.hasCompleteJustification(justification)) {
      return {
        allowed: false,
        reason: 'JUSTIFICATION_REQUIRED'
      };
    }

    return {
      allowed: true,
      reason: 'ALLOWED'
    };
  }

  guardDirectMutation(record: ImmutableCompletedRecord): DirectMutationDecision {
    if (record.status === 'completed') {
      return {
        allowed: false,
        reason: 'COMPLETED_RECORD_IMMUTABLE',
        resolution: 'CREATE_VERSIONED_RECTIFICATION'
      };
    }

    return {
      allowed: true,
      reason: 'ALLOWED'
    };
  }

  createRectification(
    record: ImmutableCompletedRecord,
    input: RectificationInput
  ): RectificationDecision {
    const missingFields = this.getMissingRectificationFields(input);

    if (missingFields.length > 0) {
      return {
        created: false,
        reason: 'RECTIFICATION_FIELDS_REQUIRED',
        missingFields
      };
    }

    return {
      created: true,
      reason: 'RECTIFICATION_CREATED',
      rectification: {
        recordId: record.recordId,
        sourceVersion: record.version,
        targetVersion: record.version + 1,
        changedBy: input.changedBy,
        reason: input.reason,
        afterSnapshot: input.afterSnapshot
      }
    };
  }

  confirmDecisionMemo(input: CriticalActionJustification): {
    confirmed: true;
    memo: AuditDecisionMemo;
  } {
    return {
      confirmed: true,
      memo: {
        ...input,
        status: 'confirmed'
      }
    };
  }

  updateDecisionMemo(
    memo: AuditDecisionMemo,
    updates: Partial<CriticalActionJustification>
  ): DecisionMemoUpdateDecision {
    if (memo.status === 'confirmed') {
      return {
        allowed: false,
        reason: 'DECISION_MEMO_IMMUTABLE'
      };
    }

    return {
      allowed: true,
      reason: 'UPDATED',
      memo: {
        ...memo,
        ...updates
      }
    };
  }

  private hasCompleteJustification(
    justification?: CriticalActionJustification
  ): justification is CriticalActionJustification {
    if (!justification) {
      return false;
    }

    return (
      justification.context.trim().length > 0 &&
      justification.decision.trim().length > 0 &&
      justification.decidedBy.trim().length > 0 &&
      justification.alternativesConsidered.length > 0 &&
      justification.expectedImpact.trim().length > 0
    );
  }

  private getMissingRectificationFields(input: RectificationInput): string[] {
    const missingFields: string[] = [];

    if (!input.changedBy.trim()) {
      missingFields.push('changedBy');
    }

    if (!input.reason.trim()) {
      missingFields.push('reason');
    }

    if (Object.keys(input.afterSnapshot).length === 0) {
      missingFields.push('afterSnapshot');
    }

    return missingFields;
  }
}
