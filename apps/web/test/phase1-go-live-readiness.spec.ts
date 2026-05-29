import { describe, expect, it } from 'vitest';

describe('phase 1 go-live readiness assets', () => {
  it('defines the baseline thresholds and required roles for yachts phase 1', async () => {
    const readinessModulePath = new URL(
      '../../../scripts/phase1-go-live-readiness.mjs',
      import.meta.url
    );
    const readinessModule = await import(readinessModulePath.href);

    expect(readinessModule.phase1BaselineMinimums).toEqual({
      yachtsAssets: 7,
      maintenanceTickets: 657,
      agendaEvents: 270
    });
    expect(readinessModule.phase1RequiredActiveRoles).toEqual([
      'portal_admin',
      'central_operations',
      'yachts_operations',
      'asset_field_team'
    ]);
  });

  it('documents a dedicated package script for phase 1 readiness execution', async () => {
    const packageModule = await import('../../../package.json', {
      with: { type: 'json' }
    });

    expect(packageModule.default.scripts['readiness:phase1']).toBe(
      'node ./scripts/phase1-go-live-readiness.mjs'
    );
  });
});
