# Enterprise Operational Portal Design

Date: 2026-05-13
Scope: Brainstorming output validated with business owner
Status: Approved for planning (superseded for execution by PRD v1.0 and Architecture Design v1.1)

## 1) Operational Vision

Create a centralized operational intelligence ecosystem for multi-modal assets, with:
- strong central orchestration and governance
- execution teams specialized by asset context
- unified visibility across modalities without losing modal-specific workflows

The platform is the primary operational layer for maintenance and scheduling, with governance, traceability, and enterprise-level control.

## 2) Core Operating Model (Validated)

- Modal classification exists (`Aviation`, `Yachts`, `Real Estate`, `Cars`), but operational execution is organized by active asset teams.
- Central Operations exists and has active daily orchestration authority.
- Teams are restricted to their own assets.
- Central Operations has cross-asset visibility and intervention rights.

Specific enrichment for Yachts:
- A dedicated Technical Coordination layer exists in parallel to Central Operations:
  - Maintenance Manager
  - Buyer
  - Nautical Director
  - Analyst
- Technical Coordination leads maintenance technical decisions.
- Central Operations leads corporate orchestration (payments, utilization agenda, client relationship, improvements, cross-operational governance).

## 3) Governance and Role Model

### 3.1 Structural vs Operational Data Ownership

- Structural registrations (master structures, global configuration, structural types): `Portal Admin (Development Team)`
- Operational registrations (day-to-day records): `Central Operations + Field Team by Asset`

### 3.2 Permission Principles

- Field team permission model: `restricted by asset`
- Central Operations: global read/write for orchestration and governance
- Technical Coordination (Yachts): technical authority for maintenance lifecycle and technical release

### 3.3 Source of Truth (Phase 1)

- New portal is the source of truth for Yachts maintenance and scheduling at go-live.
- Legacy system does not own Yachts maintenance/scheduling in this context.
- Current Yachts maintenance portal will be fully migrated before cutover.
- After cutover, old portal remains read-only and no operational write rollback is allowed.

## 4) Domain Scope and Prioritization

## In scope (Phase 1 - Yachts)

- Maintenance
- Agenda (asset usage scheduling and operational blocking)

## Out of scope / backlog (Phase 1)

- Variable utilization costs integration and ownership strategy
- Final parameterization for third-party spending thresholds/alçadas
- Fixed budget module rollout

## 5) Macroprocess Architecture (Phase 1 - Yachts)

### 5.1 Maintenance End-to-End

1. Maintenance ticket is created by field team or Yachts Technical Coordination.
2. Ticket is triaged/classified by Yachts Technical Coordination.
3. Technical Coordination validates preliminary budget and defines absorption strategy (internal execution vs third-party).
4. Execution occurs by internal technical team or third-party supplier.
5. Technical release is issued by Yachts Technical Coordination.
6. Central Operations manages agenda utilization impacts, stakeholder/client communication, and payment governance.
7. Ticket is closed with complete traceability (costs, evidence, timestamps, decision owners).

### 5.2 Scheduling End-to-End

1. Agenda event is created by field team (own asset only) or Central Operations.
2. Scheduling engine enforces single-agenda-per-asset (no overlap).
3. Non-emergency conflicts are escalated to Central Operations.
4. Emergency technical case allows provisional technical block by Yachts Technical Coordination.
5. Central Operations validates emergency block within SLA.
6. Final schedule state is recorded and audited.

## 6) Operational Rules and Exception Governance

## 6.1 Core Rules

- No overlapping events for the same asset.
- Agenda registrations do not require prior approval, but require audit trace.
- Override governance is centralized in Central Operations for final corporate decision.

## 6.2 Emergency Maintenance Conflict Rule

- Yachts Technical Coordination can apply immediate provisional block.
- Central Operations must validate within `24h`.

## 6.3 Third-Party Supplier Rule (Temporary Until Parametrization)

- Technical Coordination can activate third-party supplier before pre-approval.
- Central Operations validation is mandatory by ticket closure.
- Final threshold/criticality parameterization is a later governance configuration item.

## 7) Event Architecture (Phase 1 - Yachts)

Key operational events:
- `MaintenanceRequested`
- `MaintenanceClassified`
- `ThirdPartyActivated`
- `ProvisionalTechnicalBlockApplied`
- `CentralValidationPending`
- `CentralValidationCompleted`
- `MaintenanceWorkCompleted`
- `AssetTechnicallyReleased`
- `ScheduleEventCreated`
- `ScheduleEventUpdated`
- `ScheduleConflictDetected`
- `TicketClosed`

Each event must persist:
- trigger source (who/role/system)
- timestamp
- related asset
- decision owner
- audit metadata

## 8) SLA Architecture

- Emergency provisional technical block validation: `24h`
- Non-emergency scheduling conflict resolution: `72h`
- Third-party post-validation: up to ticket closure

## 9) KPI Baseline (Phase 1)

- Asset availability (%)
- MTTA (time to triage)
- MTTR (time to repair)
- Maintenance backlog (aging buckets)
- Scheduling conflicts per asset/month
- Conflict resolution lead time
- Maintenance cost per asset
- % tickets using third-party suppliers
- Central validation SLA adherence
- Repeat-issue rate

## 10) Migration and Rollout Strategy

## 10.1 Phase Sequence

1. `Phase 0 - Preparation`
   - governance setup
   - role/permission matrix finalization
   - structural data setup
2. `Phase 1 - Yachts`
   - full migration from current Yachts portal (`100% historical base`)
   - go-live for all Yachts simultaneously
   - exclusive operation in new portal after cutover (old portal read-only)
3. `Phase 2 - Aviation`
   - reuse validated architecture
   - adapt workflow to OCC/dispatch/flight operations specifics
4. `Phase 3 - Real Estate and Cars`
   - apply same governance framework
   - modal-specific workflow adaptation

## 10.2 Cutover and Legacy Exit Criteria

- Go-live allowed only after migration acceptance gates are approved.
- Legacy portal becomes read-only immediately after cutover.
- No operational write rollback to old portal is allowed after cutover.
- Manual contingency procedure must be validated before go-live.

## 11) Approved Architectural Approach

Approved approach: `Central Hub + Modal Modules`

Rationale:
- balances enterprise governance with modal-specific execution
- avoids duplicated shared capabilities
- reduces long-term fragmentation risk
- supports sequenced rollout and scaling

## 12) Open Items for Next Planning Stage

- Parameterization model for third-party spend approval alçadas
- Variable cost operating model decision (if/when in scope)
- Detailed field-level data model and state transitions
- Formal permission matrix by action
- Reporting cadences and executive dashboard definitions
- Stability monitoring and divergence detection playbook
