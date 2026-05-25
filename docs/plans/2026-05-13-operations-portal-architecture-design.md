# Architecture Design - Enterprise Operational Portal

Date: 2026-05-13
Version: 1.1
Scope: Phase 1 MVP (Yachts - Maintenance + Agenda)
Inputs:
- [2026-05-13-operations-portal-prd.md](</C:/Users/Davi Vilela/OneDrive - PRIME YOU/Área de Trabalho/Dev/Portal_de_Operacoes/docs/plans/2026-05-13-operations-portal-prd.md>)
- [2026-05-13-operations-portal-mvp-scope.md](</C:/Users/Davi Vilela/OneDrive - PRIME YOU/Área de Trabalho/Dev/Portal_de_Operacoes/docs/plans/2026-05-13-operations-portal-mvp-scope.md>)
- [2026-05-13-operations-portal-decision-tree-map.md](</C:/Users/Davi Vilela/OneDrive - PRIME YOU/Área de Trabalho/Dev/Portal_de_Operacoes/docs/plans/2026-05-13-operations-portal-decision-tree-map.md>)

## Architecture Summary

The recommended target is an `API-first modular monolith` with event-driven internals.  
It preserves MVP delivery speed while supporting enterprise controls:
- strict auditability
- role and scope-based permissions
- deterministic agenda conflict handling
- SLA timers and escalations
- future modal expansion without full rewrite

## Certainties, Hypotheses, Decisions

### Certainties

- MVP domain is Yachts with maintenance + agenda only.
- Cutover is exclusive to new portal after 100% validated migration.
- No parallel write to old portal after cutover.
- Strong governance and audit requirements are mandatory.

### Hypotheses

- Team can deliver faster with TypeScript end-to-end.
- Internal event-driven patterns are enough for phase 1 without external broker complexity.
- Standalone go-live is acceptable without mandatory real-time integrations.

### Decisions

- Use modular monolith backend + clear domain boundaries.
- Keep one transactional database for core consistency.
- Keep attachment evidence behind upload-policy checks, integrity controls, and backend-issued short-lived access grants.

## Recommended Architecture Style

`Hybrid: SSR Web App + API-first Modular Monolith + Event-driven Workers`

Why this style:
- lower operational complexity than microservices for MVP
- strong consistency for agenda and maintenance transactions
- clear path to extract services later if needed (Aviation and cross-modal scale)

## Recommended Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | `Next.js` (App Router) + `TypeScript` | Fast enterprise UI delivery with SSR support for role-based dashboards |
| UI State/Data | Server actions/forms | Predictable data fetching and mutation flows |
| Backend API | `NestJS` (modular monolith) + `TypeScript` | Strong domain modularity, guards/interceptors for RBAC/audit |
| Database | `PostgreSQL` | Transactional consistency for agenda and maintenance lifecycle |
| ORM | `Prisma` | Fast schema evolution and type-safe data access |
| AuthN/AuthZ | Portal bridge session + internal RBAC scope checks | Session claims track `mfaVerified`; critical-role administration enforces MFA-enabled assignments; logical tenant isolation via `tenant_id` on all queries |
| File Storage | Attachment upload policy + backend access grants | Evidence attachments are validated by hash/mime/size/antivirus rules and exposed through short-lived grants, not signed URLs yet |
| Observability | Structured event log + domain metrics + health checks | Governance and SLA diagnosis |
| Deployment | Dockerized services in managed container platform | Controlled rollout, repeatability, and environment parity |
| Testing | Unit + integration + migration validation suite | Protects cutover gates and operational flows |

## Main Components

1. `Web Portal`
- Role-based views for central operations, technical coordination, and field teams.
- Agenda board and maintenance lifecycle UI.

2. `Identity and Access Service`
- Bridge login with email/password and session claims.
- RBAC + scoped access by asset/modal.
- MFA state is tracked in the session and access-assignment layer, but there is no dedicated MFA challenge flow in phase 1.

3. `Asset Registry Module`
- Canonical `asset_id` and legacy id mapping.
- Structural data controlled by portal admin.

4. `Agenda Module`
- Non-overlap engine per asset.
- Conflict detection and escalation orchestration.

5. `Maintenance Module`
- Macro-status lifecycle with mandatory data and evidence gates.
- Third-party supplier activation and financial governance hooks.

6. `Operational Exception Tracking`
- No dedicated incident entity is implemented in the current code base.
- Operational exceptions are represented through maintenance tickets, audit records, and notifications.

7. `Audit and Decision Ledger`
- Immutable critical actions with justification payload and actor metadata.
- Versioned rectification for closed records.

8. `SLA and Notification Engine`
- 75/90/100% threshold alerts.
- Automatic escalation for SLA breaches.

9. `Migration and Cutover Module`
- Full legacy import pipeline.
- Attachment integrity checks.
- Go-live gate report and sign-off checklist.

10. `Reporting/KPI Module`
- Baseline operational KPIs and governance panels.

## Data Flow

1. User authenticates via portal bridge session and receives scoped permissions.
2. User creates maintenance ticket (required fields enforced).
3. Ticket transitions occur through rules (status, justification, evidence).
4. Emergency scenario may create provisional technical block in agenda.
5. Agenda engine validates non-overlap and records outcome.
6. SLA engine schedules timers and triggers alerts/escalations.
7. Technical release updates asset operational status.
8. Central operations validates required governance checkpoints.
9. Ticket closes only after mandatory closure gates pass.
10. Domain events are recorded in application-level observability/audit records; phase 1 does not rely on a durable queue/worker pipeline.

## Integrations

### Phase 1 Required

- Legacy Yachts portal data extraction/import (one-time cutover process).
- Portal bridge session auth for authentication; MFA state is represented in session/access records.
- Object storage for attachments.

### Phase 1 Optional

- External notification channels (email/WhatsApp) — phase 1 delivers in-app notifications only.

### Post-MVP

- Variable cost ingestion from legacy systems.
- Advanced financial systems integration.
- Cross-modal analytics pipelines.

## Architecture Decisions

| Decision | Reason | Trade-off |
|---|---|---|
| Modular monolith over microservices | Faster MVP with lower operational overhead | Less independent scaling per module initially |
| Single Postgres for core domains | Strong consistency for agenda and maintenance | Database becomes central bottleneck if not tuned |
| Immutable closure + rectification | Enterprise-grade audit integrity | More explicit correction workflow for users |
| Hard no-overlap scheduling | Safety and deterministic allocation | Higher conflict volume requiring ops decisions |
| Provisional technical block with 24h validation | Safety-first without losing governance | Requires strict operational SLA discipline |
| Backend-issued access grant for attachments | Prevents direct link leakage of sensitive evidence | Short TTL (≤60s) requires client re-request on each access |

## Risks and Mitigations

- `Risk`: cutover with inconsistent migration output.
  - `Mitigation`: hard go-live gates, full counts by entity, critical attachment integrity checks, formal sign-off.
- `Risk`: central operations overload from conflict handling.
  - `Mitigation`: SLA alerts, queue-based prioritization, capacity thresholds, escalation protocol.
- `Risk`: SLA manipulation via freeze status.
  - `Mitigation`: strict freeze reasons, max freeze count, automatic escalation.
- `Risk`: permission misconfiguration across assets.
  - `Mitigation`: access matrix tests, periodic access review, least-privilege defaults.
- `Risk`: audit gaps in critical decisions.
  - `Mitigation`: mandatory structured justification and mini-minutes on override paths.

## Open Questions

- Final permanent threshold model for third-party approvals/alcadas.
- Variable cost ownership and ingestion model (frequency and data owner).
- Numeric capacity limits per asset/team for simultaneous in-progress work.
- Final Aviation-specific lifecycle states and dispatch/OCC rule pack.
- Publishing model for executive dashboards (audience and cadence).

## Recommended Next Step

Create a `solution blueprint package` with:
- domain-level sequence diagrams
- permission matrix by action
- event contract catalog
- cutover runbook and rollback/contingency protocol

This package should be the direct input to implementation planning and delivery slicing.

## Addendum v1 (Grill Cycle Consolidation)

Addendum date: 2026-05-13  
Source: `grill-me` architecture cycle (20 decisions approved)

| ID | Decision | Impact |
|---|---|---|
| A1 | Multi-tenant model for MVP: logical isolation with mandatory `tenant_id` on all queries + backend scope checks | Enables confidentiality with lower MVP complexity; PostgreSQL RLS not used in phase 1 |
| A2 | Bridge session login; fine-grained scope (`tenant/asset/role`) owned by portal | Separates authentication from operational authorization in the current code base |
| A3 | Critical access revocation SLA: up to 15 minutes | Reduces exposure after role/offboarding/security events |
| A4 | Agenda confirmations use strong consistency with transactional lock per `asset_id + time window` | Guarantees hard no-overlap under concurrency |
| A5 | Core transactions must not depend on async processing; if background jobs are unavailable, operations continue and are observable via event log | Prevents operational blockage from infrastructure degradation |
| A6 | Retention after 5 years: anonymize personal data and keep minimum non-personal operational trace; extend only by legal/contract exception | Aligns retention and privacy obligations |
| A7 | Authorization model is `deny-by-default` when scope resolution is uncertain | Reduces privilege escalation and data leakage risk |
| A8 | Critical override notes must be structured (context, decision, owner, alternatives, impact, review deadline) | Improves auditability and analytics consistency |
| A9 | Rule changes use scheduled effective date by default; immediate only for safety/compliance exceptions | Prevents temporal inconsistency in SLA/KPI interpretation |
| A10 | Migration quality requires hash validation for 100% of critical attachments and statistical sample for non-critical files | Strengthens cutover trust and evidence integrity |
| A11 | Observability baseline is mandatory in MVP: structured logs, domain metrics, health checks, basic tracing, actionable alerts | Ensures production governance from day one |
| A12 | API contracts versioned from start (`v1`) with explicit deprecation policy | Avoids frontend/backend breaking churn during rapid evolution |
| A13 | At least one full cutover dry-run is mandatory before production cutover | De-risks migration and runtime cutover execution |
| A14 | Database change policy for critical tables uses mandatory expand/contract | Minimizes downtime and migration breakage risk |
| A15 | Attachment access is always backend-mediated with per-request scope check and short-lived access grant | Protects sensitive files from link leakage |
| A16 | SLA calculations keep timezone snapshot at open time; timezone changes apply only to new records | Preserves historical comparability and avoids retroactive drift |
| A17 | Capacity limits for in-progress workload enforce block-by-default with central-operations override + justification | Adds operational load governance and accountability |
| A18 | Critical mini-minutes are immutable; corrections only by versioned addendum | Preserves decision integrity for audits |
| A19 | High-impact rule rollouts should be deployed via controlled pipeline with dual approval; feature flag infrastructure is post-MVP | Provides safer operational rollout control without added MVP complexity |
| A20 | Addendum formally approved and incorporated into architecture baseline | Locks discovery outcomes for next planning stage |

### Addendum Notes

- This addendum supersedes any earlier ambiguous interpretation on access, consistency, and cutover governance.
- Open questions in this document remain valid unless explicitly resolved by a future addendum.
