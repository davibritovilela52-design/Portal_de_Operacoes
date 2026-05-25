import { describe, expect, it } from 'vitest';

import { HistoricalSanitizationService } from '../src/modules/governance/historical-sanitization.service.js';

describe('HistoricalSanitizationService', () => {
  it('classifies legacy records with operational or audit gaps as critical sanitation items', () => {
    const service = new HistoricalSanitizationService();

    expect(
      service.classifyRecord({
        recordId: 'legacy-1',
        aggregateType: 'maintenance_ticket',
        missingFields: ['costFinal', 'responsibleTechnician'],
        impactsActiveOperation: true,
        underActiveAudit: false
      })
    ).toEqual({
      recordId: 'legacy-1',
      aggregateType: 'maintenance_ticket',
      missingFields: ['costFinal', 'responsibleTechnician'],
      label: 'historical_with_gap',
      priority: 'critical'
    });
  });

  it('builds a sanitation queue ordered by risk and regularizes late legacy data with reference to legacy id', () => {
    const service = new HistoricalSanitizationService();

    expect(
      service.buildQueue([
        {
          recordId: 'legacy-2',
          aggregateType: 'agenda_event',
          missingFields: ['notes'],
          impactsActiveOperation: false,
          underActiveAudit: false
        },
        {
          recordId: 'legacy-1',
          aggregateType: 'maintenance_ticket',
          missingFields: ['costFinal'],
          impactsActiveOperation: true,
          underActiveAudit: false
        }
      ])
    ).toEqual([
      {
        recordId: 'legacy-1',
        aggregateType: 'maintenance_ticket',
        missingFields: ['costFinal'],
        label: 'historical_with_gap',
        priority: 'critical'
      },
      {
        recordId: 'legacy-2',
        aggregateType: 'agenda_event',
        missingFields: ['notes'],
        label: 'historical_with_gap',
        priority: 'medium'
      }
    ]);

    expect(
      service.regularizeLateData({
        legacyId: 'legacy-55',
        aggregateType: 'maintenance_ticket',
        approvedByCentralOperations: true,
        justification: 'Late legacy attachment metadata received after cutover.'
      })
    ).toEqual({
      regularized: true,
      reference: {
        legacyId: 'legacy-55',
        aggregateType: 'maintenance_ticket'
      }
    });
  });
});
