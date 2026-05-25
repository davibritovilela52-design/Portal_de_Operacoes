import { describe, expect, it } from 'vitest';

import { CutoverRunbookService } from '../src/modules/cutover/cutover-runbook.service.js';

describe('CutoverRunbookService', () => {
  it('builds the approved cutover runbook with freeze and required checkpoints', () => {
    const service = new CutoverRunbookService();

    expect(
      service.buildRunbook({
        freezeHours: 12,
        checkpointHours: [1, 4, 24],
        futureAgendaDaysMigrated: 90
      })
    ).toEqual({
      freezeHours: 12,
      checkpoints: ['T+1h', 'T+4h', 'T+24h'],
      futureAgendaDaysMigrated: 90,
      ready: true
    });
  });
});
