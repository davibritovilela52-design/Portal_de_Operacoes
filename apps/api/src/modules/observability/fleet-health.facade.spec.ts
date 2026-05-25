import { describe, expect, it, vi } from 'vitest';

import { FleetHealthFacade } from './fleet-health.facade.js';
import {
  ObservabilityHealthReport,
  ObservabilityHealthService
} from './observability-health.service.js';

describe('FleetHealthFacade', () => {
  it('getFleetHealth delegates to ObservabilityHealthService', async () => {
    const mockReport: ObservabilityHealthReport = {
      overallStatus: 'up',
      components: {} as ObservabilityHealthReport['components']
    };
    const evaluateHealth = vi.fn().mockResolvedValue(mockReport);
    const mockService = {
      evaluateHealth
    } as unknown as ObservabilityHealthService;

    const facade = new FleetHealthFacade(mockService);
    const result = await facade.getFleetHealth();

    expect(result.fleetHealth).toBe(mockReport);
    expect(evaluateHealth).toHaveBeenCalledTimes(1);
  });
});
