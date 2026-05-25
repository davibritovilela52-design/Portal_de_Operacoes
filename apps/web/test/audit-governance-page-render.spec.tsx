import React, { type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

globalThis.React = React;

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
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
  fetchPortalAuditSnapshot: vi.fn(async () => ({
    auditRecords: [
      {
        id: 'audit-001',
        type: 'decision_memo',
        title: 'Aprovar desvio de agenda',
        summary: 'Operacao de governanca confirmada.',
        assetName: 'Mondebleu',
        actor: 'Portal Admin',
        at: '2026-05-18T08:49:25.591Z',
        aggregateType: 'agenda_event',
        aggregateId: 'event-123',
        status: 'confirmed'
      },
      {
        id: 'audit-002',
        type: 'rectification',
        title: 'Retificar snapshot financeiro',
        summary: 'Correcao versionada aplicada.',
        assetName: 'Sapphire',
        actor: 'Central Operations',
        at: '2026-05-18T09:10:25.591Z',
        recordId: 'maintenance-1',
        sourceVersion: 1,
        targetVersion: 2
      }
    ],
    fleetAssets: [
      { id: 'yacht-001', name: 'Mondebleu' },
      { id: 'yacht-002', name: 'Sapphire' }
    ],
    source: 'api'
  }))
}));

vi.mock('../app/(portal)/operations-actions', () => ({
  createDecisionMemoAction: vi.fn(),
  createRectificationAction: vi.fn()
}));

describe('audit governance page render', () => {
  it('renders the governance forms with full-width primary fields', async () => {
    const { default: AuditGovernancePage } = await import('../app/(portal)/audit-governance/page');
    const markup = renderToStaticMarkup(
      await AuditGovernancePage({
        searchParams: Promise.resolve({})
      })
    );

    expect(markup).toContain('Auditoria e governança');
    expect(markup).toContain('<label class="form-field form-field--full"><span>Ativo</span>');
    expect(markup).toContain('<label class="form-field form-field--full"><span>Papel operacional</span>');
    expect(markup).toContain('<label class="form-field form-field--full"><span>Operador</span>');
    expect(markup).toContain('<label class="form-field form-field--full"><span>Acao critica</span>');
    expect(markup).toContain('<label class="form-field form-field--full"><span>Tipo do agregado</span>');
    expect(markup).toContain('<label class="form-field form-field--full"><span>ID do agregado</span>');
    expect(markup).toContain('<label class="form-field form-field--full"><span>Contexto</span>');
    expect(markup).toContain('<label class="form-field form-field--full"><span>Decisão registrada</span>');
    expect(markup).toContain('<label class="form-field form-field--full"><span>Alternativas consideradas</span>');
    expect(markup).toContain('<label class="form-field form-field--full"><span>Impacto esperado</span>');
    expect(markup).toContain('<label class="form-field form-field--full"><span>ID do registro</span>');
    expect(markup).toContain('<label class="form-field form-field--full"><span>Status do registro</span>');
    expect(markup).toContain('<label class="form-field form-field--full"><span>Versão atual</span>');
    expect(markup).toContain('<label class="form-field form-field--full"><span>Motivo da retificação</span>');
    expect(markup).toContain('<label class="form-field form-field--full"><span>Snapshot posterior (JSON)</span>');
    expect(markup).toContain('<table');
    expect(markup).toContain('Aprovar desvio de agenda');
    expect(markup).toContain('Retificar snapshot financeiro');
  });
});
