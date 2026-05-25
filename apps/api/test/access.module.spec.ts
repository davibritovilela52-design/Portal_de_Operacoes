import 'reflect-metadata';

import { describe, expect, it } from 'vitest';

import { AccessModule } from '../src/modules/access/access.module.js';

describe('AccessModule', () => {
  it('registers access policy and admin application services', () => {
    const providers = Reflect.getMetadata('providers', AccessModule) ?? [];
    const exportsList = Reflect.getMetadata('exports', AccessModule) ?? [];
    const controllers = Reflect.getMetadata('controllers', AccessModule) ?? [];

    const providerNames = providers.map((provider: { name?: string }) => provider?.name);
    const exportNames = exportsList.map((provider: { name?: string }) => provider?.name);
    const controllerNames = controllers.map((controller: { name?: string }) => controller?.name);

    expect(providerNames).toContain('AccessPolicyService');
    expect(providerNames).toContain('AccessApplicationService');
    expect(exportNames).toContain('AccessPolicyService');
    expect(controllerNames).toContain('AccessController');
  });
});
