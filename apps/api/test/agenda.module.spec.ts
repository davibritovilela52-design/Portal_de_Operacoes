import 'reflect-metadata';

import { describe, expect, it } from 'vitest';

import { AgendaModule } from '../src/modules/agenda/agenda.module.js';

describe('AgendaModule', () => {
  it('registers and exports the agenda scheduling service for downstream domain modules', () => {
    const providers = Reflect.getMetadata('providers', AgendaModule) ?? [];
    const exportsList = Reflect.getMetadata('exports', AgendaModule) ?? [];

    const providerNames = providers.map((provider: { name?: string }) => provider?.name);
    const exportNames = exportsList.map((provider: { name?: string }) => provider?.name);

    expect(providerNames).toContain('AgendaSchedulingService');
    expect(exportNames).toContain('AgendaSchedulingService');
  });
});
