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
    accessUsers: [],
    fleetAssets: []
  }))
}));

vi.mock('../app/(portal)/operations-actions', () => ({
  upsertAccessAssignmentAction: vi.fn()
}));

describe('access page render', () => {
  it('renders the access modal with full-width select fields', async () => {
    const { default: AccessPage } = await import('../app/(portal)/access/page');
    const markup = renderToStaticMarkup(
      await AccessPage({
        searchParams: Promise.resolve({ mode: 'create' })
      })
    );

    expect(markup).toContain('<label class="form-field form-field--full"><span>Papel</span>');
    expect(markup).toContain('value="portal_admin"');
    expect(markup).toContain('<label class="form-field form-field--full"><span>MFA</span>');
    expect(markup).toContain('<label class="form-field form-field--full"><span>Última revisão</span>');
    expect(markup).toContain('<label class="form-field form-field--full"><span>Escopo</span>');
  });
});
