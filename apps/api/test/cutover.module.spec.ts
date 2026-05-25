import 'reflect-metadata';

import { describe, expect, it } from 'vitest';

import { CutoverModule } from '../src/modules/cutover/cutover.module.js';

describe('CutoverModule', () => {
  it('registers and exports the cutover application service for go-live orchestration', () => {
    const providers = Reflect.getMetadata('providers', CutoverModule) ?? [];
    const exportsList = Reflect.getMetadata('exports', CutoverModule) ?? [];

    const providerNames = providers.map((provider: { name?: string }) => provider?.name);
    const exportNames = exportsList.map((provider: { name?: string }) => provider?.name);

    expect(providerNames).toContain('CutoverGateService');
    expect(providerNames).toContain('CutoverApplicationService');
    expect(exportNames).toContain('CutoverApplicationService');
  });
});
