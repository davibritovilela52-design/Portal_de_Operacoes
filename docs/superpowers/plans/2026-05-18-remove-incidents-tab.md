# Remove Incidents Tab With Minimum Project Risk

## Goal

Retire the `Incidentes` tab from the portal with the lowest practical regression risk, while preserving system stability, release confidence, and rollback simplicity.

This plan assumes that "zero risk" in practice means:

1. no same-change deletion of UI, API, and schema together;
2. no database migration in the first rollout;
3. no hidden breakage in smoke tests, route protection, maintenance flows, or seeded portal data contracts;
4. every phase remains independently releasable and reversible.

## Reality Check

There is no literal zero-risk hard deletion of the full incident feature in a live codebase, because `incidents` is not only a tab. It is currently present in:

- the portal route and shell navigation;
- the web API client and server actions;
- the backend Nest module and controller/service/repository workflow;
- the Prisma schema and maintenance relations;
- smoke tests, render tests, copy tests, and UAT/runbook material;
- product and planning documentation that still treats incidents as a supported domain.

Because of that, the lowest-risk path is a staged retirement, not a one-shot removal.

## Recommended Scope

Recommended interpretation of the request:

1. remove the `Incidentes` tab from user navigation;
2. disable direct route usage for `/incidents`;
3. keep backend/domain/schema intact for one stabilization cycle;
4. only after validation, remove API/domain/schema artifacts in a second change;
5. only after proving no operational dependency, drop database models in a final change.

If the goal is only “delete the tab complete from the portal experience”, stop after Phase 1. That is the safest endpoint.

## Current Blast Radius

### Web UI and navigation

- `apps/web/app/(portal)/incidents/page.tsx`
- `apps/web/components/portal-shell.tsx`
- `apps/web/components/icons.tsx`

### Web data contracts and actions

- `apps/web/lib/portal-api.ts`
- `apps/web/app/(portal)/operations-actions.ts`

### Backend incident domain

- `apps/api/src/modules/incident/incident.module.ts`
- `apps/api/src/modules/incident/incident.controller.ts`
- `apps/api/src/modules/incident/incident-application.service.ts`
- `apps/api/src/modules/incident/incident-workflow.service.ts`
- `apps/api/src/modules/incident/incident.repository.ts`
- `apps/api/src/app.module.ts`

### Schema and relational coupling

- `apps/api/prisma/schema.prisma`

Relevant coupling already exists between maintenance and incident records through Prisma relations, so schema removal is not isolated.

### Tests and operational scripts

- `apps/web/test/incidents-page-render.spec.tsx`
- `apps/web/test/portal-api.spec.ts`
- `apps/web/test/portal-shell.spec.ts`
- `apps/web/test/portal-minimal-ui.spec.ts`
- `apps/web/test/portal-copy-ptbr.spec.ts`
- `apps/web/test/phase1-go-live-smoke.spec.ts`
- `apps/api/test/incident.repository.spec.ts`
- `apps/api/test/incident.module.spec.ts`
- `apps/api/test/incident.controller.spec.ts`
- `apps/api/test/incident-workflow.service.spec.ts`
- `apps/api/test/incident-application.service.spec.ts`
- `scripts/phase1-go-live-smoke.mjs`
- `docs/runbooks/2026-05-15-yachts-phase1-uat.md`

## Plan

### Phase 0: Decision Gate

Objective: freeze the exact retirement scope before touching code.

Decision to record:

1. `UI retirement only`
2. `UI + web contract retirement`
3. `Full domain retirement including API`
4. `Full retirement including Prisma schema and data model`

Recommended decision: `UI retirement only` in the first release.

Why:

- it removes the tab from real users immediately;
- it avoids API and schema regressions;
- rollback is trivial;
- it keeps maintenance/legacy/reporting relations untouched while usage is monitored.

### Phase 1: Safe UI Retirement

Objective: make `Incidentes` disappear from the product experience without removing the underlying domain yet.

Changes:

1. remove the sidebar/menu item from `apps/web/components/portal-shell.tsx`;
2. remove any active-path handling dedicated to `/incidents` in the same shell file;
3. replace the page implementation in `apps/web/app/(portal)/incidents/page.tsx` with a server redirect to a stable destination such as `/maintenance` or `/dashboard`;
4. keep `portal-api.ts`, server actions, API module, and Prisma schema untouched in this phase;
5. remove or adapt the now-invalid icon entry in `apps/web/components/icons.tsx` only if it becomes unused.

Why this is the minimum-risk step:

- no API contract changes;
- no backend service deletion;
- no migration;
- direct old bookmarks do not 404, they resolve safely;
- smoke coverage can be updated without opening a new domain risk.

Rollback:

- restore the shell item and page implementation;
- no data recovery or migration rollback needed.

### Phase 1 Verification Gate

Must pass before any further deletion:

1. portal navigation still loads correctly;
2. `/incidents` no longer behaves as a live feature entry point;
3. redirected route lands in an approved destination;
4. `maintenance`, `dashboard`, `agenda`, `accesses`, and shell rendering still work;
5. web build and test suite pass after expectation updates.

Files to update in this phase:

- `apps/web/test/portal-shell.spec.ts`
- `apps/web/test/portal-minimal-ui.spec.ts`
- `apps/web/test/portal-copy-ptbr.spec.ts`
- `apps/web/test/phase1-go-live-smoke.spec.ts`
- `scripts/phase1-go-live-smoke.mjs`
- `apps/web/test/incidents-page-render.spec.tsx` should be deleted or replaced depending on redirect strategy

Suggested commands:

```powershell
npm.cmd run test --workspace @ops-portal/web
npm.cmd run build --workspace @ops-portal/web
```

### Phase 2: Web Contract Retirement

Objective: remove web-layer incident code only after Phase 1 is stable.

Precondition:

- at least one validation cycle after Phase 1;
- confirmation that no remaining portal page depends on `portal-api` incident helpers;
- no operational expectation that the route will return.

Changes:

1. remove incident fetch/mapping/default helpers from `apps/web/lib/portal-api.ts`;
2. remove incident server actions from `apps/web/app/(portal)/operations-actions.ts`;
3. remove remaining web tests that only exist for incidents;
4. verify there are no imports left from incident-specific web functions.

Why not in Phase 1:

- Phase 1 already achieves the business-visible goal;
- this phase increases churn without changing user-visible behavior;
- separating it keeps regression attribution clear.

Verification:

```powershell
npm.cmd run test --workspace @ops-portal/web
npm.cmd run build --workspace @ops-portal/web
rg -n "incident|incidents" apps/web
```

### Phase 3: Backend Domain Retirement

Objective: remove the Nest incident module only after the UI and web client are already retired.

Precondition:

- no remaining web or external consumer calls the incident endpoints;
- no admin workflow or integration requires incident creation/listing/deletion;
- explicit confirmation that removing incident APIs is acceptable.

Changes:

1. remove `IncidentModule` from `apps/api/src/app.module.ts`;
2. delete:
   - `apps/api/src/modules/incident/incident.module.ts`
   - `apps/api/src/modules/incident/incident.controller.ts`
   - `apps/api/src/modules/incident/incident-application.service.ts`
   - `apps/api/src/modules/incident/incident-workflow.service.ts`
   - `apps/api/src/modules/incident/incident.repository.ts`
3. delete incident-focused backend tests;
4. re-run API build and tests to catch indirect dependency drift.

Why this must be isolated from schema removal:

- controller/service removal is reversible at code level;
- schema removal is not;
- separating them isolates runtime API risk from data-model risk.

Verification:

```powershell
npm.cmd run test --workspace @ops-portal/api
npm.cmd run build --workspace @ops-portal/api
rg -n "incident|incidents" apps/api
```

### Phase 4: Schema and Data Retirement

Objective: remove `Incident` persistence only after the codebase has already operated safely without the feature.

Precondition:

- explicit user confirmation that incident history is no longer needed in the new portal;
- confirmation that no maintenance relation, report, or migration path still depends on `Incident` or `IncidentMaintenanceTicket`;
- a data retention decision exists.

Changes:

1. inspect and remove `Incident` and `IncidentMaintenanceTicket` from `apps/api/prisma/schema.prisma`;
2. inspect and adjust maintenance relations that point to incidents;
3. generate and review a Prisma migration;
4. validate the migration against local/staging data before any production rollout;
5. regenerate Prisma client and rerun builds/tests.

This is the highest-risk phase and should not be bundled with any earlier phase.

Verification:

```powershell
npx.cmd prisma validate --schema apps/api/prisma/schema.prisma
npx.cmd prisma generate --schema apps/api/prisma/schema.prisma
npm.cmd run test --workspace @ops-portal/api
npm.cmd run build --workspace @ops-portal/api
```

## Risk Register

### Risk 1: Breaking direct bookmarks or saved browser tabs

Mitigation:

- redirect `/incidents` instead of hard-deleting the route in Phase 1.

### Risk 2: Breaking shell navigation tests and smoke scripts

Mitigation:

- update test expectations and smoke route list in the same Phase 1 change.

### Risk 3: Hidden dependency between maintenance and incident persistence

Mitigation:

- defer backend and schema retirement to later phases;
- do not touch Prisma in the first release.

### Risk 4: Documentation drift

Mitigation:

- after Phase 1, update UAT/runbook documents to stop advertising incidents as a navigable tab;
- defer product/architecture pruning until the feature retirement is confirmed final.

### Risk 5: Hard rollback complexity

Mitigation:

- keep each phase reversible;
- avoid mixing route removal, API deletion, and migrations in one PR.

## Recommended Execution Order

1. execute Phase 1 only;
2. release and validate;
3. wait one stabilization cycle;
4. if still desired, execute Phase 2;
5. if still desired, execute Phase 3;
6. only then consider Phase 4.

## Recommended Acceptance Criteria

For Phase 1:

1. `Incidentes` no longer appears in the portal navigation;
2. `/incidents` no longer exposes the old feature and safely redirects;
3. web tests and build pass;
4. smoke script no longer expects incidents as a release-critical page;
5. no API or Prisma change is required in the same release.

For full retirement:

1. no `incident` runtime path remains in `apps/web`;
2. no `IncidentModule` import remains in `apps/api`;
3. no active schema relation depends on incidents;
4. all incident-specific tests are removed or replaced;
5. documentation is aligned with the new supported feature set.

## Final Recommendation

If the requirement is truly “zero risk to the project”, do not hard-delete the incident domain now.

Do this instead:

1. remove the tab from navigation;
2. redirect `/incidents`;
3. update smoke/tests/docs for the UI change;
4. keep backend and schema intact for now.

That delivers the visible product outcome immediately and keeps the change set narrow, reversible, and low-risk.
