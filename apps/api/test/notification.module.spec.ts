import 'reflect-metadata';

import { describe, expect, it } from 'vitest';

import { NotificationModule } from '../src/modules/notifications/notification.module.js';

describe('NotificationModule', () => {
  it('registers and exports the notification application service for downstream orchestration', () => {
    const providers = Reflect.getMetadata('providers', NotificationModule) ?? [];
    const exportsList = Reflect.getMetadata('exports', NotificationModule) ?? [];

    const providerNames = providers.map((provider: { name?: string }) => provider?.name);
    const exportNames = exportsList.map((provider: { name?: string }) => provider?.name);

    expect(providerNames).toContain('NotificationEscalationService');
    expect(providerNames).toContain('NotificationApplicationService');
    expect(exportNames).toContain('NotificationApplicationService');
  });
});
