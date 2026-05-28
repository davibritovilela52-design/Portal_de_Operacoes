import { describe, expect, it } from 'vitest';
import { AviationController } from '../src/modules/aviation/aviation.controller.js';
import type { AviationApplicationService } from '../src/modules/aviation/aviation-application.service.js';
import { AviationWorkflowService } from '../src/modules/aviation/aviation-workflow.service.js';

describe('AviationController', () => {
  it('getCatalog returns aviation statuses and priorities', () => {
    const workflowService = new AviationWorkflowService();
    const controller = new AviationController(
      { getCatalog: () => workflowService.getCatalog() } as unknown as AviationApplicationService,
      {} as never
    );

    const catalog = controller.getCatalog();

    expect(catalog.statuses).toContain('pending');
    expect(catalog.statuses).toContain('grounded');
    expect(catalog.statuses).toContain('returned');
    expect(catalog.priorities).toEqual(['P1', 'P2', 'P3', 'P4']);
  });
});
