import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const defaultWebBaseUrl = 'http://127.0.0.1:3000';
const portalSessionCookieName = 'ops_portal_session';

export const phase1SmokeTargets = [
  {
    path: '/dashboard',
    mustContain: [
      'Painel operacional',
      'Modais monitorados',
      'Ativos totais',
      'Eventos totais',
      'Chamados abertos',
      'Mondebleu'
    ],
    mustNotContain: ['Snapshot mock ativo', 'Yacht Aurora', 'Yacht Boreal']
  },
  {
    path: '/maintenance',
    mustContain: [
      'Abrir novo chamado',
      'Arraste os cards entre substatus ou use a rolagem lateral do quadro',
      'Sapphire'
    ],
    mustNotContain: [
      'field-yacht-001',
      'Yacht Aurora',
      'Resumo dos macrostatus',
      'Regras operacionais de escrita'
    ]
  },
  {
    path: '/agenda',
    mustContain: ['Mondebleu'],
    mustNotContain: ['yacht-unknown', '1970']
  },
  {
    path: '/access',
    mustContain: [
      'Acessos e administração',
      'Cadastrar acesso',
      'Acessos atuais',
      'D. Vecchi'
    ],
    mustNotContain: [
      'Snapshot mock ativo',
      'Diretório de acessos',
      'Provisionar ou atualizar acesso',
      'Revogação operacional'
    ]
  },
  {
    path: '/audit-governance',
    mustContain: ['Registrar mini-ata', 'Abrir retificação'],
    mustNotContain: ['Yacht Aurora']
  },
  {
    path: '/cutover',
    mustContain: ['Controle de cutover', 'Registrar checkpoint', 'Checkpoints e decisão'],
    mustNotContain: ['Cockpit em modo mock']
  }
];

export async function runPhase1Smoke({
  baseUrl = process.env.OPS_PORTAL_WEB_URL ?? defaultWebBaseUrl,
  fetchImpl = fetch
} = {}) {
  const sessionCookie = await createSessionCookie({
    fetchImpl
  });
  const results = [];

  for (const target of phase1SmokeTargets) {
    const response = await fetchImpl(new URL(target.path, baseUrl), {
      headers: {
        accept: 'text/html',
        cookie: sessionCookie
      }
    });

    const body = await response.text();
    const missing = target.mustContain.filter((value) => !body.includes(value));
    const forbidden = target.mustNotContain.filter((value) => body.includes(value));
    results.push({
      path: target.path,
      status: response.status,
      missing,
      forbidden,
      ok: response.ok && missing.length === 0 && forbidden.length === 0
    });
  }

  return {
    baseUrl,
    results,
    ok: results.every((result) => result.ok)
  };
}

function formatFailures(result) {
  const issues = [];

  if (result.missing.length > 0) {
    issues.push(`missing: ${result.missing.join(', ')}`);
  }

  if (result.forbidden.length > 0) {
    issues.push(`forbidden: ${result.forbidden.join(', ')}`);
  }

  return issues.join(' | ');
}

async function createSessionCookie({ fetchImpl }) {
  const apiBaseUrl = process.env.OPS_PORTAL_API_BASE_URL;
  const email = process.env.OPS_PORTAL_SMOKE_EMAIL;
  const password = process.env.OPS_PORTAL_BRIDGE_PASSWORD;

  if (!apiBaseUrl || !email || !password) {
    throw new Error(
      'Smoke auth requires OPS_PORTAL_API_BASE_URL, OPS_PORTAL_SMOKE_EMAIL and OPS_PORTAL_BRIDGE_PASSWORD.'
    );
  }

  const response = await fetchImpl(`${apiBaseUrl.replace(/\/$/, '')}/auth/session/login`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      tenantId: process.env.OPS_PORTAL_TENANT_ID ?? 'prime-you',
      email,
      password
    })
  });

  if (!response.ok) {
    throw new Error(`Smoke auth failed with status ${response.status}.`);
  }

  const payload = await response.json();

  if (!payload.authenticated || typeof payload.token !== 'string') {
    throw new Error(`Smoke auth rejected: ${payload.reason ?? 'UNKNOWN'}.`);
  }

  return `${portalSessionCookieName}=${payload.token}`;
}

export async function main() {
  const smoke = await runPhase1Smoke();

  for (const result of smoke.results) {
    if (result.ok) {
      console.log(`PASS ${result.path} (${result.status})`);
      continue;
    }

    console.error(`FAIL ${result.path} (${result.status}) ${formatFailures(result)}`);
  }

  if (smoke.ok) {
    console.log(`Smoke OK against ${smoke.baseUrl}`);
    return;
  }

  process.exitCode = 1;
}

const currentFilePath = fileURLToPath(import.meta.url);

if (process.argv[1] && resolve(process.argv[1]) === currentFilePath) {
  await main();
}
