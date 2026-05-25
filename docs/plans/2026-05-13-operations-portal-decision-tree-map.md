# Enterprise Operational Portal - Decision Tree Map

Date: 2026-05-13
Mode: Operational + Specification
Inputs:
- [2026-05-13-operations-portal-design.md](</C:/Users/Davi Vilela/OneDrive - PRIME YOU/Área de Trabalho/Dev/Portal_de_Operacoes/docs/plans/2026-05-13-operations-portal-design.md>)
- [2026-05-13-operations-portal-prd.md](</C:/Users/Davi Vilela/OneDrive - PRIME YOU/Área de Trabalho/Dev/Portal_de_Operacoes/docs/plans/2026-05-13-operations-portal-prd.md>)

```yaml
decision_tree:
  root_decision: "How to establish a centralized operational source of truth with strong governance, starting by Yachts, without breaking real operations."

  branches:
    - id: B1
      decision: "Rollout strategy"
      options:
        - "Big bang across all modals"
        - "Progressive by modal"
      selected: "Progressive by modal (Yachts -> Aviation -> Real Estate/Cars)"
      reason: "Reduces systemic risk and allows governance hardening before expansion."

    - id: B2
      decision: "Phase 1 scope"
      options:
        - "Maintenance + Agenda + Budget"
        - "Maintenance + Agenda only"
      selected: "Maintenance + Agenda only"
      reason: "Focuses on highest pain (fragmented visibility and operational control)."

    - id: B3
      decision: "Cutover model for Yachts"
      options:
        - "Parallel write in old + new portals"
        - "Exclusive new portal after full migration validation"
      selected: "Exclusive new portal after full migration validation"
      reason: "Eliminates split-brain risk and ambiguity in source of truth."

    - id: B4
      decision: "Source of truth in Phase 1"
      options:
        - "Old portal during adaptation"
        - "New portal from go-live"
      selected: "New portal from go-live"
      reason: "Supports auditability and deterministic governance."

    - id: B5
      decision: "Ownership and governance model"
      options:
        - "Modal autonomy with weak central governance"
        - "Central governance with asset-level execution"
      selected: "Central governance with asset-level execution"
      reason: "Matches current business model (active central orchestration)."

    - id: B6
      decision: "Yachts maintenance authority split"
      options:
        - "Only central operations decides everything"
        - "Technical coordination owns technical decisions; central operations owns corporate decisions"
      selected: "Split authority by domain"
      reason: "Preserves technical quality while maintaining enterprise control."

    - id: B7
      decision: "Scheduling conflict rule"
      options:
        - "Allow overlap with soft warning"
        - "Hard no-overlap per asset"
      selected: "Hard no-overlap per asset"
      reason: "Avoids unsafe or conflicting utilization states."

    - id: B8
      decision: "Emergency block policy"
      options:
        - "Block only after central validation"
        - "Immediate provisional technical block + central validation SLA"
      selected: "Immediate provisional block + 24h validation"
      reason: "Balances safety with governance."

    - id: B9
      decision: "Third-party supplier control"
      options:
        - "Always pre-approved by central operations"
        - "Technical activation first, central validation by closure"
      selected: "Activation first, validation by closure (temporary policy)"
      reason: "Maintains operational agility while preserving accountability."

    - id: B10
      decision: "Incident model"
      options:
        - "Incident embedded in maintenance"
        - "Incident as separate entity linked to maintenance"
      selected: "Separate incident entity"
      reason: "Improves root-cause analytics and operational traceability."

    - id: B11
      decision: "Historical data mutability"
      options:
        - "Allow direct edits after closure"
        - "Immutable closure with versioned rectification"
      selected: "Immutable closure with versioned rectification"
      reason: "Required for enterprise audit integrity."

    - id: B12
      decision: "Aviation adoption model"
      options:
        - "Reuse Yachts flow with minimal change"
        - "Own Aviation flow on top of shared governance core"
      selected: "Own Aviation flow + shared governance core"
      reason: "Aviation has stronger operational criticality and specific constraints."

  dependencies:
    - "B1 -> B2 -> B3 -> B4: rollout and cutover sequence defines all downstream governance."
    - "B4 depends on migration acceptance gates (100% records + 100% critical attachments + role validation)."
    - "B5 drives permission design, incident command, and KPI ownership."
    - "B6 + B8 define maintenance safety path and agenda impact path."
    - "B7 depends on canonical asset identity and conflict detection rules."
    - "B9 depends on maker-checker and budget-variation control (>10%)."
    - "B10 depends on severity taxonomy (P1-P4) shared across modals."
    - "B11 depends on strong audit event model and retention policy."
    - "B12 depends on Yachts stabilization and lessons-learned gate."

  tradeoffs:
    - option: "Exclusive cutover to new portal (chosen)"
      benefit: "Single truth, lower governance ambiguity"
      risk: "Higher pressure on migration quality and go-live readiness"
    - option: "No-overlap schedule (chosen)"
      benefit: "Operational safety and deterministic allocation"
      risk: "More conflict tickets and central decision load"
    - option: "Immediate provisional technical block (chosen)"
      benefit: "Safety first response"
      risk: "Requires strict SLA discipline to prevent long unresolved blocks"
    - option: "Third-party activation before pre-approval (temporary)"
      benefit: "Faster response under real operations"
      risk: "Financial exposure if validation controls are weak"
    - option: "Incident separated from maintenance (chosen)"
      benefit: "Better root-cause and cross-domain analytics"
      risk: "More process rigor required from teams"

  risk_zones:
    - id: R1
      risk: "Cutover with incomplete migration validation"
      impact: "Operational blindness, trust breakdown"
      mitigation: "Hard go-live gates and joint sign-off"
    - id: R2
      risk: "SLA gaming via excessive freezes"
      impact: "False performance signal"
      mitigation: "Freeze reason required, max 2 freezes, automatic escalation"
    - id: R3
      risk: "Segregation-of-duties bypass in third-party spend"
      impact: "Financial and audit risk"
      mitigation: "Maker-checker mandatory + dual validation when >10%"
    - id: R4
      risk: "Authority confusion during P1 incident"
      impact: "Delayed resolution and conflicting instructions"
      mitigation: "Central operations remains the escalation owner"
    - id: R5
      risk: "Client data exposure across shared assets/modals"
      impact: "Confidentiality breach"
      mitigation: "Tenant-aware logical segmentation + least privilege"

  blocked_paths:
    - "Parallel write operation as long-term model (rejected)."
    - "Old portal as source of truth after cutover (rejected)."
    - "Editable historical closure records (rejected)."
    - "Weak authentication for critical profiles (rejected; bridge session auth tracks MFA state and critical-role assignments require mfaEnabled)."
    - "Unbounded freeze behavior without escalation (rejected)."

  recommended_path:
    - "Step 1: Freeze final rules and acceptance gates for Yachts cutover."
    - "Step 2: Validate full migration quality (records, attachments, permissions, agenda behavior)."
    - "Step 3: Execute exclusive go-live on new portal with old portal read-only."
    - "Step 4: Operate with SLA governance (24h/72h), incident command, and maker-checker controls."
    - "Step 5: Track 60-day success metrics and close Yachts stabilization."
    - "Step 6: Start Aviation with modal-specific workflow over shared governance core."

  unresolved_questions:
    - "Permanent third-party approval threshold/alçada model."
    - "Variable utilization cost ownership and ingestion strategy."
    - "Numerical capacity limits per asset/team for concurrent in-progress work."
    - "Final per-modal substep dictionaries beyond Yachts and Aviation."
    - "Executive dashboard publication cadence and exact audience segmentation."
```

## Decision Notes

- This map reflects the final discovery state after the grill cycle and supersedes earlier assumptions about long parallel operation.
- Any PRD or architecture refinement should resolve `unresolved_questions` before changing core governance branches.

## Architecture Addendum Map (v1)

```yaml
decision_tree_addendum:
  root_decision: "How to harden architecture governance for an enterprise-safe MVP cutover."

  branches:
    - id: A1
      decision: "Multi-tenant isolation model"
      selected: "Logical isolation with tenant_id + RLS + backend scope checks"
    - id: A2
      decision: "AuthN vs AuthZ ownership"
      selected: "Bridge session login, portal owns fine-grained authorization scope"
    - id: A3
      decision: "Critical access revocation SLA"
      selected: "Up to 15 minutes"
    - id: A4
      decision: "Agenda consistency under concurrency"
      selected: "Strong transactional locking by asset_id + time window"
    - id: A5
      decision: "Queue/Redis degradation behavior"
      selected: "Core transactions continue; phase 1 does not depend on a durable queue/worker pipeline"
    - id: A6
      decision: "Post-retention data policy"
      selected: "Anonymize personal data; keep minimum non-personal operational trace"
    - id: A7
      decision: "Permission resolution uncertainty"
      selected: "Deny-by-default"
    - id: A8
      decision: "Override decision recording model"
      selected: "Structured mini-minutes with mandatory fields"
    - id: A9
      decision: "Rule change activation timing"
      selected: "Scheduled effective date by default; immediate only for safety/compliance exceptions"
    - id: A10
      decision: "Attachment migration integrity"
      selected: "Hash validation for 100% critical attachments + sample on non-critical"
    - id: A11
      decision: "Observability baseline in MVP"
      selected: "Structured logs, domain metrics, health checks, tracing, actionable alerts"
    - id: A12
      decision: "API evolution governance"
      selected: "Versioned contracts from start (v1) + deprecation policy"
    - id: A13
      decision: "Cutover rehearsal policy"
      selected: "At least one full dry run before production cutover"
    - id: A14
      decision: "Database migration strategy"
      selected: "Expand/contract mandatory for critical tables"
    - id: A15
      decision: "Attachment access security"
      selected: "Backend-mediated access with scope validation and short-lived access grant"
    - id: A16
      decision: "SLA timezone consistency"
      selected: "Timezone snapshot at open time; changes only affect new records"
    - id: A17
      decision: "Capacity control policy"
      selected: "Block at limit; central-operations override with justification only"
    - id: A18
      decision: "Mini-minutes mutability"
      selected: "Immutable; corrections via versioned addendum"
    - id: A19
      decision: "High-impact rollout mechanism"
      selected: "Feature flags with owner, criteria, kill switch, and audit"
    - id: A20
      decision: "Addendum governance"
      selected: "Addendum approved and incorporated into architecture baseline"

  dependencies:
    - "A1 + A2 + A7 + A15 form the minimum security perimeter."
    - "A4 depends on canonical asset identity and transactional database guarantees."
    - "A5 depends on synchronous transaction paths and lightweight observability/event records."
    - "A8 + A18 depend on immutable audit model and versioned correction workflow."
    - "A9 + A12 + A14 + A19 define safe change-management across code, contracts, and rules."
    - "A10 + A13 are prerequisites for cutover confidence."
    - "A11 is required to enforce A3, A4, A5, A17 and SLA breach governance."
    - "A16 depends on explicit timezone metadata in operational entities."

  tradeoffs:
    - option: "Strong transactional lock in agenda"
      benefit: "Deterministic no-overlap guarantee"
      risk: "Higher latency and contention under peak writes"
    - option: "Backend-mediated file access"
      benefit: "Better confidentiality and authorization enforcement"
      risk: "More API load and complexity"
    - option: "Expand/contract migrations"
      benefit: "Lower production break risk"
      risk: "Longer schema evolution cycles"
    - option: "Deny-by-default permissions"
      benefit: "Safer security posture"
      risk: "More false denials if scope mapping is incomplete"

  risk_zones:
    - id: AR1
      risk: "Access scope misconfiguration causing unauthorized data exposure"
      mitigation: "RLS, backend scope checks, periodic permission review"
    - id: AR2
      risk: "Cutover false-positive due to weak migration validation"
      mitigation: "Hash checks + dry run + formal sign-off gates"
    - id: AR3
      risk: "Silent SLA governance failure if async processing degrades"
      mitigation: "Outbox durability + observability alerts + backlog replay"
    - id: AR4
      risk: "Operational instability from uncontrolled rule rollout"
      mitigation: "Scheduled rule effective date + feature flags + kill switch"

  blocked_paths:
    - "Public direct attachment links without permission mediation."
    - "Immediate unrestricted rule changes in production."
    - "Non-versioned API breaking changes."
    - "Direct mutation of immutable decision records."

  recommended_path:
    - "Step A1: Implement security perimeter first (A1/A2/A7/A15)."
    - "Step A2: Implement consistency and reliability core (A4/A5/A10/A14)."
    - "Step A3: Enable governance controls (A8/A9/A11/A12/A18/A19)."
    - "Step A4: Execute dry run and validate cutover gates (A13 + migration checks)."
    - "Step A5: Go-live with operational monitoring and capacity controls (A3/A16/A17)."

  unresolved_questions:
    - "Final permanent third-party approval threshold/alçada model."
    - "Variable utilization cost ownership and ingestion strategy."
    - "Exact capacity thresholds per asset/team for each modal profile."
    - "Aviation-specific state machine and OCC/dispatch rule formalization."
```

## Execution Addendum Map (v2)

```yaml
decision_tree_execution_addendum:
  root_decision: "How to execute Yachts cutover and first-60-day stabilization without governance drift or operational regression."

  branches:
    - id: E1
      decision: "Final go/no-go authority"
      selected: "Go-live committee (Central Operations + Yachts Technical Coordination + Portal Admin) with unanimity rule"
    - id: E2
      decision: "Cutover window policy"
      selected: "Low-criticality window + 12h freeze + formal communication + T+1h/T+4h/T+24h checkpoints"
    - id: E3
      decision: "Platform incident command in first 72h"
      selected: "Portal Admin as technical escalation owner; central ops and technical coordination as impact owners"
    - id: E4
      decision: "Hotfix policy during stabilization"
      selected: "Controlled pipeline only; direct hotfix only for P1 with mini-minutes and postmortem in 24h"
    - id: E5
      decision: "Bug severity and response SLA"
      selected: "S1/S2/S3/S4 with response SLA 15m/1h/8h useful time/next cycle"
    - id: E6
      decision: "Post-incident data reconciliation SLA"
      selected: "Complete reconciliation in up to 24h with joint validation and closing minutes"
    - id: E7
      decision: "Executive escalation triggers"
      selected: "Immediate escalation on S1, mass critical SLA risk, >30m outage, or permission failure with sensitive exposure risk"
    - id: E8
      decision: "Feature freeze policy after go-live"
      selected: "30-day freeze for new features; only S1/S2 fixes and compliance/security-critical adjustments allowed"
    - id: E9
      decision: "User readiness gate"
      selected: "100% readiness across critical profiles; otherwise automatic no-go"
    - id: E10
      decision: "Single reference governance rule"
      selected: "SPEC v1.1 addendum is execution source; changes require coordinated artifact update"

  dependencies:
    - "E1 depends on E9 readiness evidence and migration/cutover gate status."
    - "E2 is prerequisite for E3 and E4 (without controlled window and checkpoints, incident control degrades)."
    - "E3 + E5 + E7 define stabilization command chain and escalation mechanics."
    - "E4 depends on release governance controls and auditability policies from architecture addendum."
    - "E6 depends on immutable audit trails and reliable incident-to-data impact mapping."
    - "E8 reduces change noise so E5/E6 SLAs remain achievable in first 30 days."
    - "E10 depends on document governance discipline to avoid source-of-truth drift."

  tradeoffs:
    - option: "Unanimity go/no-go"
      benefit: "Reduces chance of unsafe cutover decisions"
      risk: "Higher chance of postponement under disagreement"
    - option: "30-day feature freeze"
      benefit: "Protects stabilization and SLA integrity"
      risk: "Delays non-critical product evolution"
    - option: "Strict readiness gate at 100%"
      benefit: "Lowers operational misuse risk post go-live"
      risk: "Can delay launch if training cadence slips"
    - option: "P1-only direct hotfix exception"
      benefit: "Maintains control while preserving emergency agility"
      risk: "Requires strong discipline to prevent policy abuse"

  risk_zones:
    - id: ER1
      risk: "Committee deadlock close to cutover window"
      mitigation: "Pre-cutover dry decisions and explicit no-go fallback runbook"
    - id: ER2
      risk: "Stabilization overload due to high S2/S3 volume"
      mitigation: "Response SLA triage, freeze scope discipline, and daily command review"
    - id: ER3
      risk: "Hidden data impact after platform incident"
      mitigation: "24h mandatory reconciliation with joint validation and closure minutes"
    - id: ER4
      risk: "Governance drift across artifacts after urgent changes"
      mitigation: "E10 coordinated update rule and change-control checklist"

  blocked_paths:
    - "Go-live with partial committee approval."
    - "Feature velocity-first strategy during first 30 days."
    - "Direct production hotfix as default operational mode."
    - "Launching with incomplete readiness of critical profiles."

  recommended_path:
    - "Step E-A: Close readiness and simulation evidence for all critical roles."
    - "Step E-B: Execute cutover window policy with command checkpoints."
    - "Step E-C: Run stabilization governance with severity SLAs and executive triggers."
    - "Step E-D: Enforce freeze and controlled hotfix policy through day 30."
    - "Step E-E: Keep reconciliation and governance closure discipline through day 60."

  unresolved_questions:
    - "Exact operational owner rota for 24/7 checkpoint and operational escalation coverage."
    - "Numerical quality threshold for declaring stabilization complete beyond SLA metrics."
```
