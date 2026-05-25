import { describe, expect, it, vi } from 'vitest';

import { configureApp, resolveAppPort } from '../src/main.js';

describe('configureApp', () => {
  it('applies the v1 API prefix for contract versioning', () => {
    const app = {
      setGlobalPrefix: vi.fn()
    };

    configureApp(app as unknown as { setGlobalPrefix(prefix: string): void });

    expect(app.setGlobalPrefix).toHaveBeenCalledWith('v1');
  });

  it('defaults the application port to 3001', () => {
    expect(resolveAppPort({})).toBe(3001);
  });

  it('respects a numeric PORT override from the environment', () => {
    expect(resolveAppPort({ PORT: '3101' })).toBe(3101);
  });
});
