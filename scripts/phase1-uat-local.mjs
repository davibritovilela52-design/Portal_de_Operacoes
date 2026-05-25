import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { dirname, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

import {
  formatPhase1Readiness,
  runPhase1Readiness
} from './phase1-go-live-readiness.mjs';

const currentFilePath = fileURLToPath(import.meta.url);
const repoRoot = resolve(dirname(currentFilePath), '..');

export const phase1UatLocalDefaults = {
  host: '127.0.0.1',
  apiPort: 3001,
  webPort: 3000,
  startupTimeoutMs: 120000
};

export function createPhase1UatRuntimeEnv(
  baseEnv = process.env,
  overrides = {}
) {
  const host = overrides.host ?? baseEnv.OPS_PORTAL_HOST ?? phase1UatLocalDefaults.host;
  const apiPort = String(
    overrides.apiPort ?? baseEnv.OPS_PORTAL_API_PORT ?? phase1UatLocalDefaults.apiPort
  );
  const webPort = String(
    overrides.webPort ?? baseEnv.OPS_PORTAL_WEB_PORT ?? phase1UatLocalDefaults.webPort
  );
  const apiBaseUrl =
    overrides.apiBaseUrl ?? baseEnv.OPS_PORTAL_API_BASE_URL ?? `http://${host}:${apiPort}/v1`;
  const webBaseUrl =
    overrides.webBaseUrl ?? baseEnv.OPS_PORTAL_WEB_URL ?? `http://${host}:${webPort}`;

  return {
    ...baseEnv,
    HOSTNAME: host,
    PORT: webPort,
    OPS_PORTAL_API_BASE_URL: apiBaseUrl,
    OPS_PORTAL_WEB_URL: webBaseUrl
  };
}

export function createNpmProcessSpec(args) {
  if (process.platform === 'win32') {
    return {
      command: 'cmd.exe',
      args: ['/d', '/s', '/c', ['npm', ...args].join(' ')]
    };
  }

  return {
    command: 'npm',
    args
  };
}

export function createTreeKillProcessSpec(pid) {
  if (process.platform === 'win32') {
    return {
      command: 'taskkill.exe',
      args: ['/PID', String(pid), '/T', '/F']
    };
  }

  return {
    command: 'kill',
    args: ['-TERM', String(pid)]
  };
}

export async function runPhase1UatLocal({
  baseEnv = process.env,
  startupTimeoutMs = phase1UatLocalDefaults.startupTimeoutMs,
  verifyOnly = false,
  fetchImpl = fetch
} = {}) {
  const runtimeEnv = createPhase1UatRuntimeEnv(baseEnv);
  const apiPort = new URL(runtimeEnv.OPS_PORTAL_API_BASE_URL).port || String(phase1UatLocalDefaults.apiPort);
  const webBaseUrl = runtimeEnv.OPS_PORTAL_WEB_URL;
  const apiBaseUrl = runtimeEnv.OPS_PORTAL_API_BASE_URL;
  const stopActions = [];

  try {
    await runNpmCommand(
      ['run', 'build', '--workspace', '@ops-portal/api'],
      { cwd: repoRoot, env: runtimeEnv, label: 'api:build' }
    );
    await runNpmCommand(
      ['run', 'build', '--workspace', '@ops-portal/web'],
      { cwd: repoRoot, env: runtimeEnv, label: 'web:build' }
    );

    const apiHealthy = await isUrlHealthy(`${apiBaseUrl}/observability/health`, fetchImpl);

    if (!apiHealthy) {
      const apiChild = spawnNpmCommand(
        ['run', 'start', '--workspace', '@ops-portal/api'],
        {
          cwd: repoRoot,
          env: {
            ...runtimeEnv,
            PORT: apiPort
          },
          label: 'api'
        }
      );

      stopActions.push(() => stopChildProcess(apiChild));
      await waitForUrl(`${apiBaseUrl}/observability/health`, {
        timeoutMs: startupTimeoutMs,
        fetchImpl
      });
    }

    const webHealthy = await isUrlHealthy(`${webBaseUrl}/login`, fetchImpl);

    if (!webHealthy) {
      const webChild = spawnNpmCommand(
        [
          'run',
          'start',
          '--workspace',
          '@ops-portal/web',
          '--',
          '--hostname',
          phase1UatLocalDefaults.host,
          '--port',
          String(new URL(webBaseUrl).port || phase1UatLocalDefaults.webPort)
        ],
        {
          cwd: repoRoot,
          env: runtimeEnv,
          label: 'web'
        }
      );

      stopActions.push(() => stopChildProcess(webChild));
      await waitForUrl(`${webBaseUrl}/login`, {
        timeoutMs: startupTimeoutMs,
        fetchImpl
      });
    }

    const readiness = await runPhase1Readiness({
      apiBaseUrl,
      webBaseUrl,
      tenantId: runtimeEnv.OPS_PORTAL_TENANT_ID ?? 'prime-you',
      fetchImpl
    });

    console.log(formatPhase1Readiness(readiness));

    if (verifyOnly) {
      await stopManagedProcesses(stopActions);
      return readiness;
    }

    console.log('');
    console.log(`Phase 1 UAT stack ready at ${webBaseUrl}`);
    console.log(`API base URL: ${apiBaseUrl}`);
    console.log('Press Ctrl+C to stop the local stack after the UAT session.');

    await waitForSignal();
    await stopManagedProcesses(stopActions);
    return readiness;
  } catch (error) {
    await stopManagedProcesses(stopActions);
    throw error;
  }
}

async function runNpmCommand(args, { cwd, env, label }) {
  const processSpec = createNpmProcessSpec(args);
  const child = spawn(processSpec.command, processSpec.args, {
    cwd,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });

  attachOutput(child, label);
  const [exitCode] = await once(child, 'exit');

  if (exitCode !== 0) {
    throw new Error(`${label} exited with code ${exitCode}.`);
  }
}

function spawnNpmCommand(args, { cwd, env, label }) {
  const processSpec = createNpmProcessSpec(args);
  const child = spawn(processSpec.command, processSpec.args, {
    cwd,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });

  attachOutput(child, label);
  return child;
}

function attachOutput(child, label) {
  child.stdout?.setEncoding('utf8');
  child.stderr?.setEncoding('utf8');
  child.stdout?.on('data', (chunk) => writePrefixed(process.stdout, label, chunk));
  child.stderr?.on('data', (chunk) => writePrefixed(process.stderr, label, chunk));
}

function writePrefixed(target, label, chunk) {
  const prefixed = chunk
    .toString()
    .split(/\r?\n/)
    .filter((line, index, lines) => !(line === '' && index === lines.length - 1))
    .map((line) => `[${label}] ${line}`)
    .join('\n');

  if (prefixed) {
    target.write(`${prefixed}\n`);
  }
}

async function waitForUrl(url, { timeoutMs, fetchImpl }) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      const response = await fetchImpl(url, {
        headers: {
          accept: 'text/html,application/json'
        }
      });

      if (response.ok || response.status === 307 || response.status === 308) {
        return;
      }

      lastError = new Error(`status ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await delay(1000);
  }

  throw new Error(`Timed out waiting for ${url}: ${lastError?.message ?? 'unknown error'}`);
}

async function isUrlHealthy(url, fetchImpl) {
  try {
    const response = await fetchImpl(url, {
      headers: {
        accept: 'application/json'
      }
    });

    return response.ok;
  } catch {
    return false;
  }
}

async function stopManagedProcesses(stopActions) {
  for (const stop of [...stopActions].reverse()) {
    await stop();
  }
}

async function stopChildProcess(child) {
  if (!child || child.exitCode !== null || child.killed) {
    return;
  }

  const processSpec = createTreeKillProcessSpec(child.pid);
  const killer = spawn(processSpec.command, processSpec.args, {
    cwd: repoRoot,
    windowsHide: true,
    stdio: 'ignore'
  });
  const exitPromise = once(child, 'exit');
  const timeoutPromise = delay(5000).then(() => {
    if (child.exitCode === null && !child.killed) {
      child.kill('SIGKILL');
    }
  });
  await once(killer, 'exit');

  await Promise.race([exitPromise, timeoutPromise]);
}

function waitForSignal() {
  return new Promise((resolve) => {
    const finish = () => {
      process.off('SIGINT', finish);
      process.off('SIGTERM', finish);
      resolve();
    };

    process.on('SIGINT', finish);
    process.on('SIGTERM', finish);
  });
}

function parseArgs(argv = process.argv.slice(2)) {
  return {
    verifyOnly: argv.includes('--verify-only')
  };
}

export async function main() {
  const options = parseArgs();
  await runPhase1UatLocal(options);
}

if (process.argv[1] && resolve(process.argv[1]) === currentFilePath) {
  await main();
}
