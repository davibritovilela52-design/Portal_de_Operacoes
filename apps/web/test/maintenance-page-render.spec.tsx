import React, { type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { getMaintenanceProgressSubstatusOptions } from '../app/(portal)/maintenance/ticket-progress-modal';
import { fleetAssets, maintenanceDetails, maintenanceTickets } from '../lib/portal-data';
import { requirePortalSession } from '../lib/portal-session';

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
  requirePortalSession: vi.fn(async () => ({
    token: 'test-session-token',
    claims: {
      version: 1,
      userId: 'field-asset-1',
      tenantId: 'prime-you',
      role: 'asset_field_team',
      assetIds: ['yacht-001'],
      displayName: 'Equipe de EmbarcaÃ§Ã£o',
      email: 'field@primeyou.com',
      mfaVerified: true,
      expiresAt: '2026-05-18T08:49:25.591Z'
    },
    actor: {
      userId: 'field-asset-1',
      tenantId: 'prime-you',
      role: 'asset_field_team',
      assetIds: ['yacht-001']
    },
    operatorLabel: 'Equipe de EmbarcaÃ§Ã£o'
  }))
}));

vi.mock('../lib/portal-api', () => ({
  fetchPortalOperationsSnapshot: vi.fn(async () => ({
    maintenanceTickets,
    fleetAssets
  })),
  fetchMaintenanceDetailSnapshot: vi.fn(async () => ({
    source: 'mock',
    ticket: maintenanceDetails[0]
  }))
}));

vi.mock('../app/(portal)/operations-actions', () => ({
  createMaintenanceTicketAction: vi.fn(),
  createServiceOrderAction: vi.fn(),
  createSupplierAction: vi.fn(),
  registerMaintenanceCommentAction: vi.fn(),
  registerMaintenanceEvidenceAction: vi.fn(),
  updateMaintenanceTicketProgressAction: vi.fn()
}));

vi.mock('../app/(portal)/maintenance/maintenance-kanban-board', () => ({
  MaintenanceKanbanBoard: ({
    columns
  }: {
    columns: Array<{ tickets: Array<{ id: string; ticketNumber: string; title: string }> }>;
  }) => (
    <div>
      {columns.flatMap((column) =>
        column.tickets.map((ticket) => (
          <span key={ticket.id}>{`${ticket.ticketNumber}:${ticket.title}`}</span>
        ))
      )}
    </div>
  )
}));

describe('maintenance page render', () => {
  it('uses the scoped asset automatically and renders the create modal fields', async () => {
    vi.mocked(requirePortalSession).mockResolvedValueOnce({
      token: 'test-session-token',
      claims: {
        version: 1,
        userId: 'field-asset-1',
        tenantId: 'prime-you',
        role: 'asset_field_team',
        assetIds: ['yacht-001'],
        displayName: 'Equipe de EmbarcaÃ§Ã£o',
        email: 'field@primeyou.com',
        mfaVerified: true,
        expiresAt: '2026-05-18T08:49:25.591Z'
      },
      actor: {
        userId: 'field-asset-1',
        tenantId: 'prime-you',
        role: 'asset_field_team',
        assetIds: ['yacht-001']
      },
      operatorLabel: 'Equipe de EmbarcaÃ§Ã£o'
    });

    const { default: MaintenancePage } = await import('../app/(portal)/maintenance/page');
    const markup = renderToStaticMarkup(
      await MaintenancePage({
        searchParams: Promise.resolve({ mode: 'create' })
      })
    );

    expect(markup).not.toContain('<select name="assetId"');
    expect(markup).toContain('type="hidden" name="assetId" value="yacht-001"');
    expect(markup).toContain('name="maintenanceSystem"');
    expect(markup).toContain('name="title"');
    expect(markup).toContain('name="description"');
    expect(markup).toContain('name="urgency"');
    expect(markup).not.toContain('type="datetime-local"');
  });

  it('renders the create modal with a full-width asset selector for portal admins', async () => {
    vi.mocked(requirePortalSession).mockResolvedValueOnce({
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
    });

    const { default: MaintenancePage } = await import('../app/(portal)/maintenance/page');
    const markup = renderToStaticMarkup(
      await MaintenancePage({
        searchParams: Promise.resolve({ mode: 'create' })
      })
    );

    expect(markup).toContain('name="assetId"');
    expect(markup).toContain('name="maintenanceSystem"');
    expect(markup).toContain('name="title"');
  });

  it('filters maintenance tickets by numeric ID and preserves the query field', async () => {
    const { default: MaintenancePage } = await import('../app/(portal)/maintenance/page');
    const markup = renderToStaticMarkup(
      await MaintenancePage({
        searchParams: Promise.resolve({ query: '8829' })
      })
    );

    expect(markup).toContain('name="query"');
    expect(markup).toContain('value="8829"');
    expect(markup).toContain('mtn-8829:Troca de filtros de óleo - motor bombordo');
    expect(markup).not.toContain('mtn-8705:Troca de selos hidráulicos');
  });

  it('renders the maintenance card popup with the required detail fields', async () => {
    const { default: MaintenancePage } = await import('../app/(portal)/maintenance/page');
    const markup = renderToStaticMarkup(
      await MaintenancePage({
        searchParams: Promise.resolve({ ticketId: maintenanceTickets[0]?.id })
      })
    );

    expect(markup).toContain('Chamado');
    expect(markup).toContain('ID');
    expect(markup).toContain('Categoria');
    expect(markup).toContain('Ativo');
    expect(markup).toContain('SubStatus');
    expect(markup).toContain('Abertura');
    expect(markup).toContain('Sistema');
    expect(markup).toContain('Anexar arquivo');
    expect(markup).toContain('Comentarios');
    expect(markup).toContain('name="comment"');
    expect(markup).toContain('Aurora');
    expect(markup).toContain('carlos.medina@primeyou.com');
    expect(markup.match(/>Fechar</g)?.length ?? 0).toBe(1);
    expect(markup).not.toContain('Prioridade');
    expect(markup).not.toContain('EvidÃªncias');
    expect(markup).not.toContain('SLA');
  });

  it('renders the progress update modal with status, substatus and assignee fields', async () => {
    const { default: MaintenancePage } = await import('../app/(portal)/maintenance/page');
    const markup = renderToStaticMarkup(
      await MaintenancePage({
        searchParams: Promise.resolve({ ticketId: maintenanceTickets[0]?.id, modal: 'progress' })
      })
    );

    expect(markup).toContain('name="status"');
    expect(markup).toContain('name="substatus"');
    expect(markup).toContain('name="assignedTo"');
  });

  it('filters the progress substatus options by status', () => {
    expect(getMaintenanceProgressSubstatusOptions('pending').map((option) => option.key)).toEqual([
      'call_opening'
    ]);
    expect(getMaintenanceProgressSubstatusOptions('in_progress').map((option) => option.key)).toContain(
      'service_execution'
    );
    expect(getMaintenanceProgressSubstatusOptions('reopened').map((option) => option.key)).toContain(
      'ticket_qualification'
    );
    expect(getMaintenanceProgressSubstatusOptions('payment').map((option) => option.key)).toEqual([
      'payment_request',
      'payment_scheduling',
      'payment_receipt'
    ]);
  });

  it('renders the service order modal with the supplier onboarding button and fields', async () => {
    const { default: MaintenancePage } = await import('../app/(portal)/maintenance/page');
    const markup = renderToStaticMarkup(
      await MaintenancePage({
        searchParams: Promise.resolve({
          query: '8829',
          ticketId: maintenanceTickets[0]?.id,
          modal: 'service-order',
          supplierId: 'supplier-1',
          supplierName: 'OceanPro Shipyard',
          supplierCnpj: '98.765.432/0001-10',
          supplierAddress: 'Avenida Atlantica, 500',
          supplierCreated: '1'
        })
      })
    );

    expect(markup).toContain('name="title"');
    expect(markup).toContain('name="startsAt"');
    expect(markup).toContain('name="endsAt"');
    expect(markup).toContain('name="description"');
    expect(markup).toContain('name="supplierId"');
    expect(markup).toContain('OceanPro Shipyard');
    expect(markup).toContain('returnTo=%2Fmaintenance%3Fquery%3D8829%26ticketId%3Dmtn-8829');
    expect(markup).not.toContain('Deixar vazio por enquanto');
  });

  it('renders a highlighted confirmation card after creating a new supplier', async () => {
    const { default: MaintenancePage } = await import('../app/(portal)/maintenance/page');
    const markup = renderToStaticMarkup(
      await MaintenancePage({
        searchParams: Promise.resolve({
          ticketId: maintenanceTickets[0]?.id,
          modal: 'service-order',
          supplierId: 'supplier-1',
          supplierName: 'Alfa Marine Services',
          supplierCnpj: '12.345.678/0001-90',
          supplierAddress: 'Rua das Docas, 100',
          supplierCreated: '1'
        })
      })
    );

    expect(markup).toContain('role="status"');
    expect(markup).toContain('Fornecedor cadastrado');
    expect(markup).toContain('O novo fornecedor já está pronto para ser vinculado na ordem de serviço.');
    expect(markup).toContain('Alfa Marine Services');
    expect(markup).toContain('Rua das Docas, 100');
  });
});
