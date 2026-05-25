import { describe, expect, it } from 'vitest';

import {
  buildAgendaAssetColorThemeMap,
  resolveAgendaEventColorTheme,
  resolveAgendaEventEmphasis
} from '../lib/agenda-event-theme';

describe('agenda event theme', () => {
  it('assigns a stable palette per vessel', () => {
    const auroraTheme = resolveAgendaEventColorTheme('yacht-001');

    expect(resolveAgendaEventColorTheme('yacht-001')).toEqual(auroraTheme);
    expect(resolveAgendaEventColorTheme('yacht-002')).not.toEqual(auroraTheme);
  });

  it('assigns distinct colors across the current fleet order', () => {
    const assetIds = [
      'yacht-001',
      'yacht-002',
      'yacht-003',
      'yacht-004',
      'yacht-005',
      'yacht-006',
      'yacht-007'
    ];
    const themeMap = buildAgendaAssetColorThemeMap(assetIds);
    const uniqueThemes = new Set(assetIds.map((assetId) => themeMap.get(assetId)));

    expect(themeMap.size).toBe(assetIds.length);
    expect(uniqueThemes.size).toBe(assetIds.length);
    expect(buildAgendaAssetColorThemeMap(assetIds)).toEqual(themeMap);
  });

  it('keeps operational emphasis independent from vessel color', () => {
    expect(
      resolveAgendaEventEmphasis({ type: 'emergency_maintenance', provisional: false })
    ).toBe('critical');
    expect(
      resolveAgendaEventEmphasis({ type: 'operational_block', provisional: true })
    ).toBe('critical');
    expect(resolveAgendaEventEmphasis({ type: 'crew_rest' })).toBe('warning');
    expect(
      resolveAgendaEventEmphasis({ type: 'planned_maintenance', provisional: false })
    ).toBe('default');
  });
});
