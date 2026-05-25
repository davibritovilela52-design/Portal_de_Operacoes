import { runPhase1Smoke } from './phase1-go-live-smoke.mjs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const defaultApiBaseUrl = process.env.OPS_PORTAL_API_BASE_URL ?? 'http://127.0.0.1:3001/v1';
const defaultWebBaseUrl = process.env.OPS_PORTAL_WEB_URL ?? 'http://127.0.0.1:3000';
const defaultTenantId = process.env.OPS_PORTAL_TENANT_ID ?? 'prime-you';

export const phase1BaselineMinimums = {
  yachtsAssets: 7,
  maintenanceTickets: 657,
  agendaEvents: 270
};

export const phase1RequiredActiveRoles = [
  'portal_admin',
  'central_operations',
  'yachts_operations',
  'yachts_technical_coordination',
  'asset_field_team'
];

export async function runPhase1Readiness({
  apiBaseUrl = defaultApiBaseUrl,
  webBaseUrl = defaultWebBaseUrl,
  tenantId = defaultTenantId,
  fetchImpl = fetch,
  smokeRunner = runPhase1Smoke
} = {}) {
  const session = await authenticatePortalSession({
    apiBaseUrl,
    tenantId,
    fetchImpl
  });

  const [health, assetsPayload, maintenancePayload, agendaPayload, accessPayload, cutoverPayload, writePolicy, smoke] =
    await Promise.all([
      getJson(`${apiBaseUrl}/observability/health`, { fetchImpl }),
      postJson(
        `${apiBaseUrl}/asset-registry/assets/search`,
        {
          tenantId,
          filters: {
            modality: 'yachts',
            active: true
          }
        },
        session.token,
        fetchImpl
      ),
      postJson(
        `${apiBaseUrl}/maintenance/tickets/search`,
        {
          tenantId
        },
        session.token,
        fetchImpl
      ),
      postJson(
        `${apiBaseUrl}/agenda/events/search`,
        {
          tenantId
        },
        session.token,
        fetchImpl
      ),
      postJson(
        `${apiBaseUrl}/access/assignments/search`,
        {
          tenantId,
          now: new Date().toISOString()
        },
        session.token,
        fetchImpl
      ),
      postJson(
        `${apiBaseUrl}/cutover/runs/search`,
        {
          tenantId
        },
        session.token,
        fetchImpl
      ),
      getJson(
        `${apiBaseUrl}/cutover/legacy-portal/write-policy?tenantId=${encodeURIComponent(tenantId)}`,
        {
          fetchImpl,
          sessionToken: session.token
        }
      ),
      smokeRunner({
        baseUrl: webBaseUrl,
        fetchImpl
      })
    ]);

  const assets = ensureArray(assetsPayload.assets);
  const maintenanceTickets = ensureArray(maintenancePayload.tickets);
  const agendaEvents = ensureArray(agendaPayload.events);
  const assignments = ensureArray(accessPayload.assignments);
  const cutoverRuns = ensureArray(cutoverPayload.runs);
  const activeAssignments = assignments.filter((assignment) => !assignment.revokedAt);
  const activeRoleCounts = countAssignmentsByRole(activeAssignments);
  const revokedRoleCounts = countAssignmentsByRole(
    assignments.filter((assignment) => assignment.revokedAt)
  );
  const latestCutoverRun = cutoverRuns[0] ?? null;
  const latestCompletedGoRun =
    cutoverRuns.find(
      (run) => run.status === 'completed' && run.goLiveDecision === 'go'
    ) ?? null;

  const uatChecks = [
    createCheck({
      code: 'api.health',
      stage: 'uat',
      ok: health.overallStatus === 'up',
      expected: 'overallStatus=up',
      actual: `overallStatus=${health.overallStatus ?? 'unknown'}`
    }),
    createCheck({
      code: 'smoke.phase1',
      stage: 'uat',
      ok: smoke.ok,
      expected: 'all operational routes passing',
      actual: formatSmokeResult(smoke)
    }),
    createCheck({
      code: 'baseline.assets.yachts',
      stage: 'uat',
      ok: assets.length >= phase1BaselineMinimums.yachtsAssets,
      expected: `>= ${phase1BaselineMinimums.yachtsAssets}`,
      actual: String(assets.length)
    }),
    createCheck({
      code: 'baseline.maintenance.tickets',
      stage: 'uat',
      ok: maintenanceTickets.length >= phase1BaselineMinimums.maintenanceTickets,
      expected: `>= ${phase1BaselineMinimums.maintenanceTickets}`,
      actual: String(maintenanceTickets.length)
    }),
    createCheck({
      code: 'baseline.agenda.events',
      stage: 'uat',
      ok: agendaEvents.length >= phase1BaselineMinimums.agendaEvents,
      expected: `>= ${phase1BaselineMinimums.agendaEvents}`,
      actual: String(agendaEvents.length)
    }),
    ...phase1RequiredActiveRoles.map((role) =>
      createCheck({
        code: `access.active.${role}`,
        stage: 'uat',
        ok: (activeRoleCounts[role] ?? 0) >= 1,
        expected: '>= 1 active assignment',
        actual: `${activeRoleCounts[role] ?? 0} active / ${revokedRoleCounts[role] ?? 0} revoked`
      })
    )
  ];

  const goLiveChecks = [
    ...uatChecks,
    createCheck({
      code: 'cutover.run.exists',
      stage: 'go_live',
      ok: cutoverRuns.length >= 1,
      expected: '>= 1 recorded run',
      actual: String(cutoverRuns.length)
    }),
    createCheck({
      code: 'cutover.decision.go',
      stage: 'go_live',
      ok: latestCompletedGoRun !== null,
      expected: 'one completed run with goLiveDecision=go',
      actual: latestCompletedGoRun
        ? `${latestCompletedGoRun.id} (${latestCompletedGoRun.label})`
        : latestCutoverRun
          ? `${latestCutoverRun.id} (${latestCutoverRun.status}/${latestCutoverRun.goLiveDecision ?? 'pending'})`
          : 'none'
    }),
    createCheck({
      code: 'legacy.portal.read_only',
      stage: 'go_live',
      ok: writePolicy.allowed === false && writePolicy.reason === 'LEGACY_PORTAL_READ_ONLY',
      expected: 'legacy portal blocked for write',
      actual: writePolicy.allowed === false ? writePolicy.reason : 'ALLOWED'
    })
  ];

  return {
    tenantId,
    apiBaseUrl,
    webBaseUrl,
    baselines: phase1BaselineMinimums,
    authenticatedAs: {
      email: session.session.email,
      role: session.session.role
    },
    health,
    counts: {
      yachtsAssets: assets.length,
      maintenanceTickets: maintenanceTickets.length,
      agendaEvents: agendaEvents.length,
      assignmentsTotal: assignments.length,
      assignmentsActive: activeAssignments.length
    },
    accessCoverage: {
      activeByRole: activeRoleCounts,
      revokedByRole: revokedRoleCounts
    },
    cutover: {
      runCount: cutoverRuns.length,
      latestRun: latestCutoverRun
        ? summarizeCutoverRun(latestCutoverRun)
        : null,
      latestCompletedGoRun: latestCompletedGoRun
        ? summarizeCutoverRun(latestCompletedGoRun)
        : null,
      legacyPortalWritePolicy: writePolicy
    },
    smoke,
    uat: {
      ready: uatChecks.every((check) => check.ok),
      checks: uatChecks
    },
    goLive: {
      ready: goLiveChecks.every((check) => check.ok),
      checks: goLiveChecks
    }
  };
}

export function formatPhase1Readiness(report) {
  const lines = [];

  lines.push(`Phase 1 readiness for tenant ${report.tenantId}`);
  lines.push(`API: ${report.apiBaseUrl}`);
  lines.push(`Web: ${report.webBaseUrl}`);
  lines.push(
    `Authenticated as ${report.authenticatedAs.email} (${report.authenticatedAs.role})`
  );
  lines.push('');
  lines.push(`UAT readiness: ${report.uat.ready ? 'READY' : 'NOT READY'}`);
  lines.push(`Go-live readiness: ${report.goLive.ready ? 'READY' : 'NOT READY'}`);
  lines.push('');
  lines.push('Counts');
  lines.push(
    `- Active yachts assets: ${report.counts.yachtsAssets} (baseline >= ${report.baselines.yachtsAssets})`
  );
  lines.push(
    `- Maintenance tickets: ${report.counts.maintenanceTickets} (baseline >= ${report.baselines.maintenanceTickets})`
  );
  lines.push(
    `- Agenda events: ${report.counts.agendaEvents} (baseline >= ${report.baselines.agendaEvents})`
  );
  lines.push(
    `- Access assignments: ${report.counts.assignmentsActive} active / ${report.counts.assignmentsTotal} total`
  );
  lines.push('');
  lines.push('Role coverage');
  for (const role of phase1RequiredActiveRoles) {
    lines.push(
      `- ${role}: ${report.accessCoverage.activeByRole[role] ?? 0} active / ${
        report.accessCoverage.revokedByRole[role] ?? 0
      } revoked`
    );
  }
  lines.push('');
  lines.push('UAT checks');
  for (const check of report.uat.checks) {
    lines.push(formatCheckLine(check));
  }
  lines.push('');
  lines.push('Go-live checks');
  for (const check of report.goLive.checks.slice(report.uat.checks.length)) {
    lines.push(formatCheckLine(check));
  }
  lines.push('');
  lines.push('Cutover summary');
  lines.push(
    `- Recorded runs: ${report.cutover.runCount}`
  );
  lines.push(
    `- Latest run: ${report.cutover.latestRun ? formatRunSummary(report.cutover.latestRun) : 'none'}`
  );
  lines.push(
    `- Latest completed GO run: ${
      report.cutover.latestCompletedGoRun
        ? formatRunSummary(report.cutover.latestCompletedGoRun)
        : 'none'
    }`
  );
  lines.push(
    `- Legacy portal write policy: ${
      report.cutover.legacyPortalWritePolicy.allowed
        ? 'ALLOWED'
        : report.cutover.legacyPortalWritePolicy.reason
    }`
  );

  return lines.join('\n');
}

function formatCheckLine(check) {
  return `- ${check.ok ? 'PASS' : 'FAIL'} ${check.code} (expected ${check.expected}; actual ${check.actual})`;
}

function formatRunSummary(run) {
  return `${run.id} | ${run.label} | ${run.status} | decision=${run.goLiveDecision ?? 'pending'}`;
}

function formatSmokeResult(smoke) {
  const failed = smoke.results.filter((result) => !result.ok);

  if (failed.length === 0) {
    return 'all routes passing';
  }

  return failed.map((result) => `${result.path}:${result.status}`).join(', ');
}

function summarizeCutoverRun(run) {
  return {
    id: run.id,
    label: run.label,
    status: run.status,
    goLiveDecision: run.goLiveDecision ?? null,
    updatedAt: run.updatedAt
  };
}

function countAssignmentsByRole(assignments) {
  return assignments.reduce((counts, assignment) => {
    const role = assignment.role;
    counts[role] = (counts[role] ?? 0) + 1;
    return counts;
  }, {});
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function createCheck({ code, stage, ok, expected, actual }) {
  return {
    code,
    stage,
    ok,
    expected,
    actual
  };
}

async function authenticatePortalSession({ apiBaseUrl, tenantId, fetchImpl }) {
  const email = process.env.OPS_PORTAL_SMOKE_EMAIL;
  const password = process.env.OPS_PORTAL_BRIDGE_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Phase 1 readiness requires OPS_PORTAL_SMOKE_EMAIL and OPS_PORTAL_BRIDGE_PASSWORD.'
    );
  }

  return await postJson(
    `${apiBaseUrl.replace(/\/$/, '')}/auth/session/login`,
    {
      tenantId,
      email,
      password
    },
    undefined,
    fetchImpl
  );
}

async function getJson(url, { fetchImpl, sessionToken } = {}) {
  const response = await fetchImpl(url, {
    headers: {
      accept: 'application/json',
      ...(sessionToken ? { 'x-ops-portal-session': sessionToken } : {})
    }
  });

  return await readJsonResponse(response, `GET ${url}`);
}

async function postJson(url, payload, sessionToken, fetchImpl) {
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...(sessionToken ? { 'x-ops-portal-session': sessionToken } : {})
    },
    body: JSON.stringify(payload)
  });

  return await readJsonResponse(response, `POST ${url}`);
}

async function readJsonResponse(response, label) {
  const body = await response.text();
  const parsed = body ? JSON.parse(body) : null;

  if (!response.ok) {
    throw new Error(`${label} failed with status ${response.status}: ${body}`);
  }

  return parsed;
}

export async function main() {
  const report = await runPhase1Readiness();
  console.log(formatPhase1Readiness(report));

if (!report.goLive.ready) {
    process.exitCode = 1;
  }
}

const currentFilePath = fileURLToPath(import.meta.url);

if (process.argv[1] && resolve(process.argv[1]) === currentFilePath) {
  await main();
}
