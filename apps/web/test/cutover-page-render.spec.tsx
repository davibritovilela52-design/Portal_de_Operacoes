import React, { type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

globalThis.React = React;

vi.mock('next/navigation', () => ({
  redirect: vi.fn((href: string) => {
    throw new Error(`Redirected to ${href}`);
  })
}));

vi.mock('../components/portal-ui', () => ({
  ActionButton: ({
    label,
    children
  }: {
    label?: string;
    children?: ReactNode;
  }) => <button>{label ?? children}</button>,
  Badge: ({ label }: { label: string }) => <span>{label}</span>,
  PageHeader: ({
    title,
    description,
    actions
  }: {
    title: string;
    description?: string;
    actions?: ReactNode;
  }) => (
    <header>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
      {actions ? <div>{actions}</div> : null}
    </header>
  ),
  Panel: ({
    children,
    className
  }: {
    children: ReactNode;
    className?: string;
  }) => <section className={className}>{children}</section>
}));

vi.mock('../lib/portal-session', () => ({
  requirePortalSession: vi.fn(async () => ({
    token: 'test-session-token',
    claims: {
      version: 1,
      userId: 'portal-admin-1',
      tenantId: 'prime-you',
      role: 'portal_admin',
      assetIds: [],
      displayName: 'Portal Admin',
      email: 'portal.admin@primeyou.com',
      mfaVerified: true,
      expiresAt: '2026-05-18T08:49:25.591Z'
    },
    actor: {
      userId: 'portal-admin-1',
      tenantId: 'prime-you',
      role: 'portal_admin',
      assetIds: []
    },
    operatorLabel: 'Portal Admin'
  }))
}));

vi.mock('../lib/portal-api', () => ({
  fetchPortalCutoverSnapshot: vi.fn(async () => ({
    latestRun: {
      id: 'cutover-1',
      label: 'Go-live Yachts phase 1',
      status: 'draft',
      futureAgendaDaysMigrated: 90,
      finalFreezeApplied: true,
      invalidCriticalAttachmentIds: ['att-001'],
      entityCounts: [
        { entity: 'maintenance_tickets', sourceCount: 10, migratedCount: 10 },
        { entity: 'agenda_events', sourceCount: 12, migratedCount: 12 },
        { entity: 'critical_attachments', sourceCount: 3, migratedCount: 3 }
      ],
      approvals: {
        centralOperations: { approved: false, approvedBy: '', approvedAt: null },
        technicalCoordination: { approved: false, approvedBy: '', approvedAt: null },
        portalAdmin: { approved: false, approvedBy: '', approvedAt: null }
      },
      gate: {
        blockers: []
      },
      checkpoints: [
        {
          id: 'cp-1',
          checkpoint: 'T+1',
          status: 'completed',
          notes: 'Estabilidade confirmada.',
          recordedBy: 'Portal Admin',
          recordedAt: '2026-05-18T08:49:25.591Z'
        }
      ],
      evidences: [
        {
          id: 'ev-1',
          title: 'Dry-run report',
          detail: 'Relatorio de migracao validado.',
          type: 'migration_report',
          valid: true,
          reference: '.tmp/legacy-yachts-import-report.json',
          createdAt: '2026-05-18T08:49:25.591Z'
        }
      ],
      goLiveDecision: null,
      updatedAt: '2026-05-18T08:49:25.591Z'
    },
    runs: [
      {
        id: 'cutover-1',
        label: 'Go-live Yachts phase 1',
        status: 'approved',
        goLiveDecision: null,
        futureAgendaDaysMigrated: 90,
        updatedAt: '2026-05-18T08:49:25.591Z'
      }
    ],
    source: 'api',
    writePolicy: { allowed: true }
  }))
}));

vi.mock('../app/(portal)/operations-actions', () => ({
  evaluateCutoverRunAction: vi.fn(),
  recordCutoverCheckpointAction: vi.fn(),
  recordCutoverDecisionAction: vi.fn(),
  upsertCutoverRunAction: vi.fn()
}));

describe('cutover page render', () => {
  it('renders the cutover forms with full-width primary fields', async () => {
    const { default: CutoverPage } = await import('../app/(portal)/cutover/page');
    const markup = renderToStaticMarkup(
      await CutoverPage({
        searchParams: Promise.resolve({})
      })
    );

    expect(markup).toContain('Controle de cutover');
    expect(markup).toContain('value="Go-live Yachts phase 1"');
    expect(markup).toContain('<label class="form-field form-field--full"><span>Label da rodada</span>');
    expect(markup).toContain('<label class="form-field form-field--full"><span>Agenda migrada (dias)</span>');
    expect(markup).toContain('<label class="form-field checkbox-field form-field--full">');
    expect(markup).toContain('class="cutover-approval-grid"');
    expect(markup).toContain('<label class="form-field form-field--full"><span>Tipo</span>');
    expect(markup).toContain('<label class="form-field form-field--full"><span>Titulo</span>');
    expect(markup).toContain('<label class="form-field form-field--full"><span>Referencia</span>');
    expect(markup).toContain('<label class="form-field checkbox-field form-field--full">');
    expect(markup).toContain('<label class="form-field form-field--full"><span>Operador</span>');
    expect(markup).toContain('<label class="form-field form-field--full"><span>Checkpoint</span>');
    expect(markup).toContain('<label class="form-field form-field--full"><span>Status</span>');
    expect(markup).toContain('class="table cutover-history-table"');
    expect(markup).toContain('class="cutover-history-table__run"');
    expect(markup).toContain('class="cutover-insight-panel"');
    expect(markup).toContain('class="cutover-evidence-panel"');
    expect(markup).toContain('class="timeline-list cutover-evidence-list"');
    expect(markup).toContain('class="timeline-item cutover-evidence-card"');
  });
});
