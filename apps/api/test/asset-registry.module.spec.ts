import 'reflect-metadata';

import { describe, expect, it } from 'vitest';

import { AssetRegistryModule } from '../src/modules/asset-registry/asset-registry.module.js';

describe('AssetRegistryModule', () => {
  it('registers the asset registry application service for structural admin flows', () => {
    const providers = Reflect.getMetadata('providers', AssetRegistryModule) ?? [];
    const controllers = Reflect.getMetadata('controllers', AssetRegistryModule) ?? [];

    const providerNames = providers.map((provider: { name?: string }) => provider?.name);
    const controllerNames = controllers.map((controller: { name?: string }) => controller?.name);

    expect(providerNames).toContain('AssetRegistryApplicationService');
    expect(controllerNames).toContain('AssetRegistryController');
  });
});
