# Enterprise Operational Portal PRD

Date: 2026-05-13
Version: 1.0
Status: Discovery validated (`grill-me` completed)
Document type: High-level PRD (non-technical implementation)

## 1) Product Vision

Build a centralized operational portal that becomes the enterprise orchestration and intelligence layer across:
- Aviation
- Yachts
- Real Estate
- Cars

The portal must standardize governance and visibility while preserving modal and asset operational specifics.

## 2) Business Objectives

- Remove fragmented operational control.
- Establish a single operational source of truth per in-scope domain.
- Improve speed and quality of operational decision-making.
- Guarantee enterprise auditability and accountability.
- Enable scalable modal expansion with shared governance patterns.

## 3) Scope Strategy

Phase prioritization:
1. Phase 1: Yachts (`Maintenance + Agenda` only)
2. Phase 2: Aviation
3. Phase 3: Real Estate and Cars

Out of scope for Phase 1:
- Variable cost operating model and integrations
- Final permanent third-party approval thresholds
- Full budget module rollout

## 4) Enterprise Operational Architecture

Approved approach: `Central Hub + Modal Modules`.

Core architecture principles:
- Shared governance and audit layer at enterprise level.
- Dedicated modal modules for operational specifics.
- Asset-centric execution model.
- Central operations as cross-asset orchestrator.

## 5) Operating Model and Roles

### 5.1 Role Layers

- `Portal Admin (Development Team)`
  - Owns structural registrations and master configuration.
- `Central Operations`
  - Owns enterprise orchestration, cross-asset agenda decisions, client-facing operational decisions, and crisis command.
- `Yachts Operations`
  - Owns day-to-day Yachts agenda management and maintenance ticket lifecycle across all Yachts assets.
  - Cross-asset scope within Yachts modal only.
  - Cannot apply provisional technical block (restricted to Yachts Technical Coordination).
- `Yachts Technical Coordination`
  - Owns technical maintenance lifecycle, technical triage, third-party activation, and technical release.
  - Sole role authorized to apply provisional technical block.
- `Field Team by Asset`
  - Executes day-to-day operations on assigned assets only.

### 5.2 Asset Access Model

- Field team permissions are restricted by asset.
- Central operations has cross-asset and cross-modal action scope.
- Multi-modal access is allowed only by explicit permission binding and least-privilege rules.

## 6) Governance Model

### 6.1 Data Ownership

- Structural data: Portal Admin.
- Operational data: Central Operations + asset field teams (within access scope).

### 6.2 Source of Truth

- Phase 1 Yachts:
  - New portal is authoritative for maintenance and agenda at go-live.
  - Old portal is fully migrated and becomes read-only after cutover.
  - No operational write rollback to old portal after cutover.

### 6.3 Decision Rights

- Safety and operational compliance always prevail over utilization.
- Central operations has final corporate decision authority for conflicts and overrides.
- Yachts technical coordination can apply immediate provisional technical block; central validation is required within 24h.

## 7) Domain Structure

Primary domains:
- Asset Registry
- Agenda and Allocation
- Maintenance
- Operational Exception Tracking
- Supplier and Payment Governance
- Audit and Decision Traceability
- Operational KPI and Governance Reporting

## 8) Workflow Structure

### 8.1 Maintenance Workflow (Yachts Phase 1)

Macro status model:
- `Pendente`
- `Em andamento`
- `Congelado`
- `Pagamento`
- `Concluido`
- `Cancelado`
- `Reaberto`

`Em andamento` includes controlled substeps:
- Qualificacao do chamado
- Diagnostico presencial
- Orcamento preliminar
- Definicao de estrategia de absorcao
- Programacao de datas
- Aprovacao tecnica
- Alocacao de budget
- Preparacao para atendimento
- Realizacao do servico/reparo
- Orcamento complementar
- Controle de qualidade

Governance rules:
- Closure is blocked without required evidence, technical owner, and applicable validation.
- Maximum 2 freezes without escalation; above that, automatic escalation to central operations.

### 8.2 Agenda Workflow (Yachts Phase 1)

Event types:
- Utilizacao
- Manutencao planejada
- Manutencao emergencial
- Bloqueio operacional
- Folga da tripulacao

Priority order:
1. Manutencao emergencial
2. Bloqueio operacional critico
3. Folga da tripulacao (when below safe minimum crew)
4. Utilizacao confirmada
5. Manutencao planejada

Rules:
- Single agenda per asset with zero overlap.
- Event registration allowed for asset team and central operations.
- Confirmed utilization edits/cancellations are finalized by central operations.

## 9) Functional Requirements

### 9.1 Maintenance Module

- Create and manage maintenance tickets by asset scope.
- Mandatory creation fields:
  - `asset_id`
  - `category` — `Preventiva` | `Corretiva` | `Emergencial` | `Melhoria` | `Inspecao`. Display-only legacy value `Garantia` may appear on migrated tickets from `legacyMetadata.requestedCategory`.
  - `priority` (`P1`, `P2`, `P3`, `P4`)
  - `description` — objective description
  - `origin` — `asset_field_team` | `yachts_technical_coordination` | `central_operations`
  - `openedBy` — initial owner identifier
  - `openedAt` — opening timestamp (UTC)
- Optional enrichment fields:
  - `title` — short label; defaults to description if absent
  - `maintenanceSystem` — operational system classification: `electrical` | `hydraulic` | `mechanical` | `metalwork` | `upholstery` | `painting` | `equipment` | `electronics` | `automation` | `image_sound` | `other`
  - `legacyTicketCode` — reference code from old portal
  - `legacyMetadata` — free-form JSON blob carrying migrated fields not mapped to first-class columns (e.g. `legacyRowId`, `requestedCategory`, `maintenanceSystem` from legacy extract)
- Enforce macro status transitions with audit and justification.
- Enforce required evidence by phase.

#### 9.1.1 Improvements View

Tickets of category `Melhoria` are also accessible via the dedicated `/improvements` portal view. This view filters maintenance tickets by `category = improvement` and provides a Kanban board and creation form scoped to improvements. No separate data model — same maintenance ticket infrastructure.

#### 9.1.2 Legacy Row Tracking

Migrated tickets carry `legacyMetadata.legacyRowId` (source row identifier in old portal) for reconciliation and deduplication. This is a read-only display field with no operational effect.

### 9.2 Agenda Module

- Maintain single non-overlapping agenda per asset.
- Detect and block conflicting concurrent insertions.
- Provide conflict handling and escalation flows.
- Support emergency technical provisional blocks with 24h central validation SLA.

#### 9.2.1 Crew Rest Safe Minimum

Crew rest events carry a `safeMinimumBreached` boolean flag. When `true`, the crew rest event receives operational priority 3 (above confirmed utilization). When `false`, crew rest is treated at lowest priority (same as planned maintenance). The threshold for marking `safeMinimumBreached` is determined operationally by Yachts Technical Coordination at event registration time.

### 9.3 Audit and Traceability

- Mandatory audit events for all critical actions.
- Justification required for:
  - freeze enter/exit
  - cancel/reopen
  - provisional block
  - agenda conflict override
- Immutable historical records after closure; corrections via versioned rectification only.

### 9.6 Notification and Escalation

Notifications are delivered via in-app channel only (phase 1).

- Immediate in-app notifications to central operations for:
  - provisional technical block
  - agenda conflict
  - emergency maintenance
  - SLA breach
- SLA checkpoint alerts at 75%, 90%, and 100% of elapsed time:
  - 75%: owner notified.
  - 90%: owner + central operations notified.
  - 100%: critical alert to both; governance incident opened.

### 9.7 Migration and Cutover

- Migrate 100% of Yachts historical maintenance base.
- Migrate future agenda window (minimum 90 days).
- Enforce final freeze window in old portal before extraction finalization.
- Old portal becomes read-only after cutover.
- Late legacy information is recorded as new regularized entries in new portal with legacy reference.

## 10) Non-Functional Requirements

- Availability SLO (phase 1): 99.5% monthly.
- Disaster readiness:
  - RPO <= 15 minutes for critical operational data
  - RTO <= 2 hours
- Authentication:
  - Bridge session login uses email/password, with `mfaVerified` tracked in session claims and `mfaEnabled` tracked in access records; phase 1 does not include a dedicated MFA challenge flow.
- Audit retention:
  - 5 years for audit trails and operational attachments
- Time model:
  - Persist timestamps in UTC
  - Store event timezone
  - Display in asset operational timezone
- Security:
  - Attachment controls (`PDF`, `JPG`, `PNG`, `MP4`; max 25 MB; no executables; antivirus scanning; integrity hash)

## 11) Operational Event Architecture

Critical actions are recorded as structured observability events with the following metadata:
- actor identifier and role
- timestamp (UTC + timezone context captured at event time)
- related asset
- domain and action type
- outcome
- free-form metadata payload

In phase 1, the observability event log remains lightweight and does not depend on a durable queue/worker pipeline.

Decision memos (structured justifications for overrides and critical actions) are persisted as immutable audit records separately from the event log.

## 12) SLA Framework

SLA computation is on-demand: elapsed time is calculated at evaluation time against the `openedAt` snapshot. Timezone is frozen at the time of ticket creation (ARQ A16) and does not change if asset timezone changes later.

- Emergency provisional block validation: 24h (24x7 clock)
- Non-emergency agenda conflict resolution: 72h (24x7 clock)
- Freeze governance limits and escalation apply (max 2 freezes before automatic escalation)

## 13) KPI Structure

Phase 1 baseline:
- Asset availability (%)
- MTTA
- MTTR
- Maintenance backlog aging
- Agenda conflicts per asset/month
- Conflict resolution lead time
- Central validation SLA adherence (provisional block)
- Repeat issue rate

Go/No-Go success metrics for first 60 days:
- >=95% emergency provisional block validations within 24h
- 100% agenda conflicts resolved within 72h
- 0 overdue P1 tickets
- >=98% concluded tickets with full evidence
- 0 critical action without structured decision memo

## 14) Migration Acceptance and Go-Live Gates

Go-live is allowed only after all gates are green:
- 100% record count migration consistency by entity
- 100% critical attachments accessible and intact
- Agenda no-overlap behavior validated
- Role/permission validation for critical profiles
- Manual contingency procedure validated
- Formal sign-off:
  - Central Operations
  - Yachts Technical Coordination
  - Portal Admin (Development)

## 15) Expansion Gate to Aviation

Aviation phase starts only after:
- Yachts cutover and stability gates are satisfied
- 2 consecutive weekly cycles without critical governance/SLA incidents
- Operational playbook validated and approved
- Formal lessons-learned approval by central operations and Yachts technical coordination

## 16) Integration Strategy

Phase 1 integration posture:
- Standalone go-live (no mandatory real-time external integration dependency)
- Controlled imports only when needed
- Variable cost integration remains backlog decision

## 17) Risks and Mitigations

- Risk: governance bypass in high-pressure operations
  - Mitigation: mandatory justification on critical actions, audit immutability, decision memo enforcement
- Risk: data quality gaps from legacy history
  - Mitigation: migrate all, label legacy gaps, prioritize saneamento by operational risk
- Risk: SLA manipulation
  - Mitigation: freeze reason controls, freeze limits, escalation rules
- Risk: cross-role ambiguity in crises
  - Mitigation: single incident command in central operations

## 18) Backlog Decisions (Explicit)

- Permanent threshold/alcada model for third-party approvals
- Variable utilization costs model, ownership, and ingestion frequency
- Modal-specific advanced analytics after core stabilization

## 19) PRD Approval Summary

This PRD reflects validated discovery decisions and is approved as the baseline for:
- detailed enterprise architecture documentation
- implementation planning by phase
- functional specification breakdown
