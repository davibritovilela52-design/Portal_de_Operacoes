import { Injectable } from '@nestjs/common';

export type HistoricalGapRecord = {
  recordId: string;
  aggregateType: string;
  missingFields: string[];
  impactsActiveOperation: boolean;
  underActiveAudit: boolean;
};

export type HistoricalSanitationItem = {
  recordId: string;
  aggregateType: string;
  missingFields: string[];
  label: 'historical_with_gap';
  priority: 'critical' | 'high' | 'medium';
};

@Injectable()
export class HistoricalSanitizationService {
  classifyRecord(record: HistoricalGapRecord): HistoricalSanitationItem {
    let priority: HistoricalSanitationItem['priority'] = 'medium';

    if (record.impactsActiveOperation || record.underActiveAudit) {
      priority = 'critical';
    } else if (record.missingFields.length >= 2) {
      priority = 'high';
    }

    return {
      recordId: record.recordId,
      aggregateType: record.aggregateType,
      missingFields: [...record.missingFields],
      label: 'historical_with_gap',
      priority
    };
  }

  buildQueue(records: HistoricalGapRecord[]): HistoricalSanitationItem[] {
    const priorityOrder: Record<HistoricalSanitationItem['priority'], number> = {
      critical: 0,
      high: 1,
      medium: 2
    };

    return records
      .map((record) => this.classifyRecord(record))
      .sort((left, right) => priorityOrder[left.priority] - priorityOrder[right.priority]);
  }

  regularizeLateData(input: {
    legacyId: string;
    aggregateType: string;
    approvedByCentralOperations: boolean;
    justification: string;
  }):
    | {
        regularized: true;
        reference: {
          legacyId: string;
          aggregateType: string;
        };
      }
    | {
        regularized: false;
        reason: 'CENTRAL_APPROVAL_REQUIRED' | 'JUSTIFICATION_REQUIRED';
      } {
    if (!input.justification.trim()) {
      return {
        regularized: false,
        reason: 'JUSTIFICATION_REQUIRED'
      };
    }

    if (!input.approvedByCentralOperations) {
      return {
        regularized: false,
        reason: 'CENTRAL_APPROVAL_REQUIRED'
      };
    }

    return {
      regularized: true,
      reference: {
        legacyId: input.legacyId,
        aggregateType: input.aggregateType
      }
    };
  }
}
