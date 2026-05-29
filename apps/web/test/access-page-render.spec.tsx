import React, { type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

globalThis.React = React;

const accessUsersFixture = [
  {
    id: 'asg-central-ops',
    userId: 'central-ops-01',
    displayName: 'Operacoes Centrais',
    email: 'central.ops@primeyou.com',
    role: 'central_operations',
    assetScopes: ['yacht-001'],
    mfaEnabled: true,
    status: 'active',
    lastReviewedAt: '2026-05-17T12:00:00.000Z'
  }
] as const;

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
  Badge: ({ label }: { label: string }) => <span>{label}</span>,
  PageHeader: ({
    title,
    actions
  }: {
    title: string;
    actions?: ReactNode;
  }) => (
    <header>
      <h1>{title}</h1>
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
  requirePortalRoles: vi.fn(async () => ({
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
  })),
  requirePortalRole: vi.fn(async () => ({
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
  fetchPortalSnapshot: vi.fn(async () => ({
    accessUsers: accessUsersFixture,
    fleetAssets: []
  }))
}));

vi.mock('../app/(portal)/operations-actions', () => ({
  registerAccessUserAction: vi.fn(),
  revokeAccessAssignmentAction: vi.fn(),
  upsertAccessAssignmentAction: vi.fn()
}));

describe('access page render', () => {
  it('renders the access modal without scope and MFA fields', async () => {
    const { default: AccessPage } = await import('../app/(portal)/access/page');
    const markup = renderToStaticMarkup(
      await AccessPage({
        searchParams: Promise.resolve({ mode: 'create' })
      })
    );

    expect(markup).toContain('<label class="form-field form-field--full"><span>Papel</span>');
    expect(markup).toContain('value="portal_admin"');
    expect(markup).toContain('Operação - Real Estate &amp; Yachts');
    expect(markup).toContain('Pilotos - Aviaion');
    expect(markup).toContain('Operações - Avition');
    expect(markup).toContain('Tripulantes - Aviation');
    expect(markup).toContain('CTM - Aviation');
    expect(markup).toContain('Gestão - Aviation');
    expect(markup).toContain('Gestão - Yachts');
    expect(markup).toContain('Operações - Real Estate');
    expect(markup).toContain('Projetos - Real Estate');
    expect(markup).toContain('Casas - Real Estate');
    expect(markup).toContain('GTA - Real Estate');
    expect(markup).toContain('Gestão - Real Estate');
    expect(markup).toContain('Operações - Cars');
    expect(markup).toContain('Mototista - Cars');
    expect(markup).toContain('Gestão - Cars');
    expect(markup).toContain('Embarcações');
    expect(markup).not.toContain('Coordenação técnica - Embarcações');
    expect(markup).not.toContain('<label class="form-field form-field--full"><span>MFA</span>');
    expect(markup).not.toContain('<label class="form-field form-field--full"><span>Última revisão</span>');
    expect(markup).toContain('type="hidden" readOnly="" name="lastReviewedAt"');
    expect(markup).not.toContain('<label class="form-field form-field--full"><span>Escopo</span>');
    expect(markup).not.toContain('Para acesso global de admin, deixe o escopo vazio.');
    expect(markup).toContain('Cadastrar usuário');
  });

  it('renders edit and delete buttons in the access actions column', async () => {
    const { default: AccessPage } = await import('../app/(portal)/access/page');
    const markup = renderToStaticMarkup(
      await AccessPage({
        searchParams: Promise.resolve({})
      })
    );

    expect(markup).toContain('href="/access?mode=edit&amp;assignmentId=asg-central-ops"');
    expect(markup).toContain('aria-label="Editar acesso de central.ops@primeyou.com"');
    expect(markup).toContain('Editar</a>');
    expect(markup).toContain('name="assignmentId" value="asg-central-ops"');
    expect(markup).toContain('name="requestedAt"');
    expect(markup).toContain('aria-label="Excluir acesso de central.ops@primeyou.com"');
    expect(markup).toContain('Excluir</button>');
  });

  it('requires portal admin before rendering access records', async () => {
    const { requirePortalRole } = await import('../lib/portal-session');

    const { default: AccessPage } = await import('../app/(portal)/access/page');
    const markup = renderToStaticMarkup(
      await AccessPage({
        searchParams: Promise.resolve({})
      })
    );

    expect(requirePortalRole).toHaveBeenCalledWith('portal_admin');
    expect(markup).toContain('Acessos atuais');
    expect(markup).toContain('central.ops@primeyou.com');
    expect(markup).toContain('href="/access?mode=create"');
    expect(markup).toContain('<th>Ações</th>');
    expect(markup).toContain('Editar</a>');
    expect(markup).toContain('Excluir</button>');
  });
});
