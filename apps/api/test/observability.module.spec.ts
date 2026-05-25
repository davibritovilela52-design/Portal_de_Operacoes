import 'reflect-metadata';

import { describe, expect, it } from 'vitest';

import { ObservabilityModule } from '../src/modules/observability/observability.module.js';

describe('ObservabilityModule', () => {
  it('registers and exports the observability services for downstream modules', () => {
    const providers = Reflect.getMetadata('providers', ObservabilityModule) ?? [];
    const exportsList = Reflect.getMetadata('exports', ObservabilityModule) ?? [];

    const providerNames = providers.map((provider: { name?: string }) => provider?.name);
    const exportNames = exportsList.map((provider: { name?: string }) => provider?.name);

    expect(providerNames).toContain('ObservabilityHealthIndicatorService');
    expect(providerNames).toContain('ObservabilityHealthService');
    expect(providerNames).toContain('ObservabilityMetricsService');
    expect(providerNames).toContain('ObservabilityEventLogService');
    expect(providerNames).toContain('ObservabilityApplicationService');
    expect(exportNames).toContain('ObservabilityMetricsService');
    expect(exportNames).toContain('ObservabilityEventLogService');
    expect(exportNames).toContain('ObservabilityApplicationService');
  });
});
