# Google Stitch Prompts - Operations Portal Phase 1 (Yachts)

Date: 2026-05-14
Scope: UI prototyping only
Status: Ready to use in Google Stitch
Sources:
- [2026-05-13-operations-portal-phase1-yachts-spec.md](</C:/Users/Davi Vilela/OneDrive - PRIME YOU/Área de Trabalho/Dev/Portal_de_Operacoes/docs/plans/2026-05-13-operations-portal-phase1-yachts-spec.md>)
- [2026-05-13-operations-portal-mvp-scope.md](</C:/Users/Davi Vilela/OneDrive - PRIME YOU/Área de Trabalho/Dev/Portal_de_Operacoes/docs/plans/2026-05-13-operations-portal-mvp-scope.md>)

## Recommended Usage

- Use `one prompt at a time` in Google Stitch.
- Start with `Prompt 01` to establish visual language and navigation.
- Then create screens in this order:
  1. Dashboard
  2. Agenda
  3. Maintenance list
  4. Maintenance detail
  5. Operational exception
  6. Admin/access
  7. Cutover/go-live
- Keep scope strictly in `Phase 1 Yachts`.
- Do not ask Stitch to invent modules outside:
- maintenance
- agenda
- operational exceptions
- audit/governance
  - access
  - cutover

## Visual Direction

Use this visual direction consistently across the prompts:

- Premium enterprise operations portal
- Desktop-first, but responsive enough for tablet and mobile review
- Clean, high-trust, executive-operational aesthetic
- Avoid generic startup UI
- Avoid purple-heavy palettes
- Recommended palette:
  - deep navy
  - off-white / warm stone
  - muted sea-glass green
  - amber for warnings
  - red only for critical risk
- Use a command-center feel, but elegant and restrained
- Strong information hierarchy
- Dense enough for operations, but not visually chaotic
- Emphasize status, ownership, SLA, exceptions, and auditability

## Prompt 01 - Design System and App Shell

```text
Create the visual foundation and app shell for an enterprise operational portal called "Operations Portal".

Context:
- This is Phase 1 of a multi-modal asset operations platform.
- For now, the scope is only Yachts.
- The product manages maintenance, agenda, operational exceptions, governance, auditability, and operational visibility.
- Users include central operations, technical coordination, field teams per asset, and portal admins.

Design goals:
- Premium enterprise command-center aesthetic
- High trust, high clarity, operational seriousness
- Not a consumer app
- Not a generic SaaS dashboard
- Desktop-first with tablet/mobile adaptations

Create:
- global visual language
- color system
- typography system
- spacing system
- status chips
- severity badges
- SLA indicators
- app shell with sidebar + top bar
- empty states
- table patterns
- detail panel pattern
- modal pattern
- timeline/audit pattern

Navigation structure should include:
- Dashboard
- Agenda
- Maintenance
- Operational exceptions
- Audit & Governance
- Access & Admin
- Cutover

Important UI semantics:
- Safety/compliance must visually override commercial utilization
- Agenda conflicts and SLA breaches must be highly visible
- Critical actions should feel controlled and auditable
- Roles and permissions should feel explicit

Deliver:
- the app shell
- a mini design system preview
- a sample navigation state
- a sample data table
- a sample detail page composition
```

## Prompt 02 - Operational Dashboard

```text
Design the main operational dashboard for the Operations Portal, focused on Phase 1 Yachts.

Context:
- This dashboard is used primarily by central operations.
- It must consolidate visibility across yacht assets.
- The portal is the source of truth for maintenance and agenda.

The dashboard must show:
- overall asset availability
- maintenance backlog by status
- conflicts in agenda
- SLA performance
- emergency technical blocks awaiting validation
- exceptions by severity
- recent critical decisions / audit events

Priority business signals:
- 24h validation SLA for emergency technical blocks
- 72h resolution SLA for common agenda conflicts
- P1 exceptions
- tickets blocked in "Congelado"
- assets currently unavailable

Required sections:
- top-level KPI strip
- critical alerts area
- agenda conflict queue
- maintenance status summary
- asset availability panel
- recent audit / decision memo feed
- operational activity timeline

Interaction expectations:
- central operations should be able to identify what needs action in under 10 seconds
- red and amber states should stand out immediately
- dashboard should support filtering by asset, severity, status, and SLA risk

Visual direction:
- dense but elegant operations dashboard
- command-center feel
- strong visual emphasis on urgent exceptions
- avoid clutter and generic cards everywhere

Deliver a full dashboard screen with realistic enterprise data.
```

## Prompt 03 - Agenda by Asset

```text
Design the Agenda screen for the Operations Portal, focused on yacht assets.

Core business rule:
- each asset has a single agenda
- no overlapping events are allowed for the same asset

Allowed event types:
- utilization
- planned maintenance
- emergency maintenance
- operational block
- crew rest

Important business logic to reflect visually:
- emergency maintenance has highest priority
- operational blocks can be critical
- crew rest blocks utilization only when minimum safe operation would be broken
- common conflicts go to central operations
- emergency technical block can be applied provisionally and validated within 24h

The screen should include:
- agenda calendar view
- asset selector
- list/timeline view toggle
- legend for event types
- event detail drawer or side panel
- conflict detection UI
- visual treatment for blocked/unavailable windows
- SLA state for provisional technical block validation

Important UX behaviors to represent in the design:
- creating an event
- seeing an overlap/conflict warning
- distinguishing confirmed vs provisional block
- seeing who owns the next action
- seeing audit visibility for overrides

Design for:
- central operations
- field team per asset
- technical coordination

Deliver:
- a full desktop agenda screen
- a side panel or modal for event details
- a visible example of a conflict state
```

## Prompt 04 - Maintenance Ticket List

```text
Design the Maintenance screen for the Operations Portal, showing the maintenance ticket list for Phase 1 Yachts.

Context:
- This screen is used by central operations, technical coordination, and field teams.
- It must support operational throughput and fast triage.

Official macro statuses:
- Pendente
- Em andamento
- Congelado
- Pagamento
- Concluído
- Cancelado
- Reaberto

Required attributes visible in the list:
- asset
- title / short description
- category
- priority P1-P4
- current status
- owner / opened by
- opened date
- frozen count
- third-party involvement
- SLA risk
- evidence completeness indicator

Required controls:
- filter bar
- search
- tabs or segmented controls by status
- quick filters for P1, frozen, overdue, third-party, missing evidence
- saved operational views

Important business semantics:
- "Congelado" must look risky, not neutral
- tickets missing mandatory evidence must stand out
- P1 and emergency work must dominate visual hierarchy
- third-party and financial governance should be easy to identify

Deliver:
- full ticket list screen
- realistic table or hybrid list/table layout
- examples of critical, blocked, and compliant tickets
```

## Prompt 05 - Maintenance Ticket Detail

```text
Design the Maintenance Ticket Detail screen for the Operations Portal.

Context:
- This is the operational control center for one maintenance ticket.
- It must support auditability, evidence tracking, approvals, and clear next actions.

Required information blocks:
- ticket header with status, priority, category, asset, owner
- macro status and substeps of "Em andamento"
- detailed description
- evidence section
- third-party section
- budget / cost summary for the ticket
- freeze history
- audit timeline
- linked exceptions
- technical release / quality section

Important business rules to reflect in the design:
- mandatory evidence by phase:
  - diagnostic evidence for "Em andamento"
  - financial document for "Pagamento"
  - execution evidence + quality release for "Concluído"
- third-party work needs governance and maker-checker logic
- variation above 10% should visually trigger extra approval state
- concluded records are immutable and must use rectification flow

Actions to represent:
- transition status
- freeze / unfreeze with reason
- attach evidence
- request payment
- register third-party details
- close ticket
- create rectification

Deliver:
- full detail screen
- right-side action area or sticky action bar
- visible audit timeline
- visible blocked state when evidence is missing
```

## Prompt 06 - Operational Exception Screen

```text
Design the operational exception screen for the Operations Portal.

Context:
- Operational exceptions are tracked separately from maintenance tickets.
- Operational exceptions can relate to 1..N maintenance tickets.
- Severity levels are P1, P2, P3, P4.
- P1/P2 closure requires central operations validation.

The screen should support:
- exception list view
- exception detail view
- severity-first triage
- linked maintenance tickets
- root cause
- impact summary
- follow-up actions
- central validation state

Important UX/business logic:
- P1 and P2 exceptions should feel operationally severe
- central operations is the escalation owner
- closing without required root cause / impact / actions should appear blocked
- auditability must be obvious

Deliver:
- one list screen and one detail screen composition
- strong visual differentiation by severity
- clear central validation section for P1/P2
```

## Prompt 07 - Access and Admin

```text
Design the Access & Admin screen for the Operations Portal.

Context:
- The system uses permission scope by tenant + asset + role.
- Critical roles require MFA.
- Access review cadence:
  - monthly for critical roles
  - quarterly for non-critical roles
- Critical revocation must happen within 15 minutes.

Roles to represent:
- portal admin
- central operations
- yachts technical coordination
- asset field team

The screen should include:
- user list
- role assignment
- asset scope assignment
- MFA status
- access review due states
- revocation actions
- audit visibility for changes

Important design semantics:
- permission scope must be explicit, not hidden
- revocation and sensitive role changes must feel high-risk
- access review due items must stand out

Deliver:
- access management screen
- user detail panel or page
- clear role/scope mapping UI
```

## Prompt 08 - Audit and Governance

```text
Design the Audit & Governance screen for the Operations Portal.

Context:
- Critical actions require structured justification.
- Decision memos are immutable after confirmation.
- Completed records are immutable and only correctable by versioned rectification.

This screen should expose:
- critical decision memos
- rectifications
- override history
- blocked actions
- authorization failures
- SLA governance events
- exception governance events

Required UI patterns:
- timeline of critical actions
- filter by aggregate type, asset, actor, action, date
- decision memo detail with:
  - context
  - decision
  - decided by
  - alternatives considered
  - expected impact
- rectification compare view (before / after)

Important tone:
- this screen should feel forensic and trustworthy
- more enterprise audit room than operational dashboard

Deliver:
- one audit list view
- one decision memo detail view
- one rectification detail/compare layout
```

## Prompt 09 - Cutover and Go-Live Governance

```text
Design the Cutover screen for the Operations Portal.

Context:
- This screen is for migration readiness and go-live governance.
- Yachts go-live requires:
  - 100% entity counts aligned
  - 100% critical attachments valid
  - minimum 90 days of future agenda migrated
  - final freeze applied
  - unanimous approval from:
    - central operations
    - technical coordination
    - portal admin
- after approved cutover, legacy portal becomes read-only

The screen should show:
- cutover checklist
- gate status
- entity count reconciliation
- critical attachment validation
- future agenda migration status
- freeze status
- go/no-go approvals
- legacy portal mode
- checkpoints:
  - T+1h
  - T+4h
  - T+24h

Important design semantics:
- this is not a devops screen only
- it is operational governance for cutover
- blocked gates must be impossible to ignore
- approvals should feel formal and consequential

Deliver:
- a full cutover/go-live governance screen
- examples of both blocked and ready states
```

## Prompt 10 - End-to-End Prototype Flow

```text
Using the previously designed screens, create a coherent end-to-end prototype flow for the Operations Portal Phase 1 Yachts.

Include these screens in sequence:
- Dashboard
- Agenda
- Maintenance list
- Maintenance ticket detail
- Operational exception detail
- Audit & Governance

The prototype should demonstrate this business journey:
1. a maintenance ticket is opened
2. a technical emergency causes a provisional technical block
3. the asset agenda shows a conflict / blocked window
4. central operations sees the issue on the dashboard
5. a critical decision is registered
6. the ticket gathers evidence and advances
7. the exception and governance trail remain visible

Goal:
- show the product as a connected operational ecosystem, not isolated pages
- maintain one consistent visual system
- emphasize governance, visibility, and safety over purely commercial activity
```

## Recommended Sequence for You

If you want the most practical order in Stitch, use:

1. `Prompt 01`
2. `Prompt 02`
3. `Prompt 03`
4. `Prompt 04`
5. `Prompt 05`
6. `Prompt 06`
7. `Prompt 08`
8. `Prompt 07`
9. `Prompt 09`
10. `Prompt 10`

## Notes

- Keep all screens in `Yachts only`.
- Do not ask Stitch to design Aviation yet.
- Do not include budget module or variable-cost integration as core screens in this phase.
- If Stitch starts inventing screens outside scope, restate:
  - `Phase 1 = maintenance + agenda + operational exceptions + governance + access + cutover`
