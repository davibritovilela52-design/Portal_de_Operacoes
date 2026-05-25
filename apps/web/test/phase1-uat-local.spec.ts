import { describe, expect, it } from 'vitest';

describe('phase 1 local uat assets', () => {
  it('defines the stable local runtime defaults and derived urls', async () => {
    const uatModulePath = new URL(
      '../../../scripts/phase1-uat-local.mjs',
      import.meta.url
    );
    const uatModule = await import(uatModulePath.href);

    expect(uatModule.phase1UatLocalDefaults).toEqual({
      host: '127.0.0.1',
      apiPort: 3001,
      webPort: 3000,
      startupTimeoutMs: 120000
    });

    expect(
      uatModule.createPhase1UatRuntimeEnv(
        {
          OPS_PORTAL_BRIDGE_PASSWORD: 'ops-portal-bridge-secret'
        },
        {
          host: '127.0.0.1',
          apiPort: 3101,
          webPort: 3100
        }
      )
    ).toMatchObject({
      OPS_PORTAL_API_BASE_URL: 'http://127.0.0.1:3101/v1',
      OPS_PORTAL_WEB_URL: 'http://127.0.0.1:3100',
      PORT: '3100',
      HOSTNAME: '127.0.0.1'
    });

    expect(uatModule.createNpmProcessSpec(['run', 'build']).command).toBe('cmd.exe');
    expect(uatModule.createNpmProcessSpec(['run', 'build']).args).toEqual([
      '/d',
      '/s',
      '/c',
      'npm run build'
    ]);
    expect(uatModule.createTreeKillProcessSpec(4321)).toEqual({
      command: 'taskkill.exe',
      args: ['/PID', '4321', '/T', '/F']
    });
  });

  it('documents the stable local UAT scripts for root, api and web', async () => {
    const rootPackageModule = await import('../../../package.json', {
      with: { type: 'json' }
    });
    const webPackageModule = await import('../package.json', {
      with: { type: 'json' }
    });
    const apiPackageModule = await import('../../api/package.json', {
      with: { type: 'json' }
    });

    expect(rootPackageModule.default.scripts['uat:phase1:local']).toBe(
      'node ./scripts/phase1-uat-local.mjs'
    );
    expect(rootPackageModule.default.scripts['uat:phase1:check']).toBe(
      'node ./scripts/phase1-uat-local.mjs --verify-only'
    );
    expect(webPackageModule.default.scripts.start).toBe('next start');
    expect(apiPackageModule.default.scripts.start).toBe('node dist/src/main.js');
  });
});
