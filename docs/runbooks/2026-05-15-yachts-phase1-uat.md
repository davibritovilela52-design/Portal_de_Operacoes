# UAT Runbook: Yachts Phase 1
**Date:** 2026-05-15 | **Scope:** dashboard + maintenance + agenda + access + audit + cutover

## Objective
- Validate the operational flow with real users before go-live.
- Confirm role-scoped access by asset.
- Capture blockers that must be closed before the final cutover decision.

## Mandatory Preconditions
- For a stable local stack, prefer:
  - `npm run uat:phase1:check` for a pre-UAT technical verification
  - `npm run uat:phase1:local` to keep `api + web` running in production mode during the session
- `npm run readiness:phase1` executed against the target tenant.
- Frontend and API running with authenticated session flow enabled.
- Migration status confirmed with `npx prisma migrate status --schema prisma/schema.prisma`.
- Tenant contains the 7 yachts migrated from the legacy portal.
- Active access assignments exist for:
  - `portal_admin`
  - `central_operations`
  - `yachts_technical_coordination`
  - `asset_field_team`
- If the operational team still needs a fillable roster, use `outputs/2026-05-15-yachts-phase1-access-template/access_assignments_phase1_yachts.csv`.
- Record the session in `outputs/2026-05-15-yachts-phase1-uat-session/phase1_yachts_uat_execution_log.md`.

## Participants
- `portal_admin`
  - Owns structural checks, access provisioning and cutover governance.
- `central_operations`
  - Owns agenda, operational visibility, customer-facing scheduling and payment-oriented follow-up.
- `yachts_technical_coordination`
  - Owns maintenance execution flow, diagnosis, absorption strategy and technical quality.
- `asset_field_team`
  - Owns field-originated maintenance records, evidence capture and asset-scoped validation.

## Test Script
### 1. Portal Admin
- Login through `/login` with MFA challenge.
- Open `/dashboard` and confirm `API snapshot active`.
- Open `/access` and verify active users by role.
- Create or update one assignment scoped to a yacht.
- Revoke one non-critical assignment and confirm the assignment remains visible as revoked.
- Open `/cutover` and create a draft run with migrated entity counts.

### 2. Central Operations
- Login and confirm `/dashboard`, `/agenda`, `/maintenance`, `/audit-governance` and `/cutover` open without redirect loops.
- Create one agenda event for a yacht.
- Reschedule that event and confirm the change persists.
- Open one maintenance ticket and confirm queue visibility.
- Register one decision memo in `/audit-governance`.
- Record one `T+1`, `T+4` or `T+24` checkpoint in `/cutover`.

### 3. Yachts Technical Coordination
- Login and confirm access to all yachts in scope.
- Open one maintenance ticket from the queue.
- Transition the ticket to `in_progress`.
- Attach one diagnostic or execution evidence.
- Confirm the detail page still shows budget ownership and evidence state after refresh.

### 4. Asset Field Team
- Login with an assignment restricted to a single yacht.
- Confirm `/maintenance` only shows tickets for the assigned asset.
- Create one maintenance ticket for the assigned asset.
- Attach one field evidence.
- Open `/agenda` and confirm only the assigned asset appears in the visible scope.
- Attempt to access a different asset through direct navigation and confirm the scope is still restricted.

## Acceptance Criteria
- No `500` responses in the tested routes.
- No unexpected redirects after authenticated login.
- Asset field team never sees out-of-scope assets.
- Maintenance, agenda, access, audit and cutover writes persist after refresh.
- No P1 or P2 defects remain open at the end of UAT.

## Evidence Capture
- Save screenshots for each failed step.
- Record:
  - user role
  - tenant
  - asset
  - route
  - timestamp
  - observed result
  - expected result
- Store the evidence alongside the UAT notes before the go/no-go meeting.

## Exit Criteria
- `npm run smoke:phase1` green.
- `npm run readiness:phase1` has no UAT blockers.
- Real users have signed off on their own role-based flows.
- The remaining blockers, if any, are only formal cutover approvals pending the final go-live window.
