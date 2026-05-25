import React, { type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

globalThis.React = React;

const improvementTicket = {
  id: 'mtn-improvement-1',
  ticketNumber: '8712',
  assetId: 'yacht-002',
  assetName: 'Yacht Boreal',
  title: 'Calibracao de injetores',
  category: 'improvement' as const,
  priority: 'P2' as const,
  maintenanceSystem: 'mechanical' as const,
  status: 'in_progress' as const,
  owner: 'Coordenacao tecnica',
  openedAt: '2026-05-12T10:00:00.000Z',
  frozenCount: 0,
  thirdParty: true,
  kanbanSubstatus: 'service_execution' as const,
  evidenceCompleteness: 0.72,
  slaProgress: 0.45
};

const improvementDetail = {
  ...improvementTicket,
  assetTag: 'YACHT-002',
  description: 'Melhoria para eficiencia do conjunto de injecao.',
  notes: 'Solicitante: Operacoes',
  comments: [],
  substeps: [],
  evidenceChecklist: [],
  budget: {
    preliminary: 'Nao sincronizado',
    current: 'Nao sincronizado',
    deltaLabel: 'Sem integracao financeira',
    ownership: 'Operacoes confirmam pagamento quando aplicavel'
  },
  thirdParty: {
    involved: true,
    supplier: 'Nao sincronizado',
    strategy: 'Execucao com componente financeiro registrado',
    centralValidation: 'A confirmar pela operacao central'
  },
  freezeHistory: [],
  evidences: [],
  auditTrail: []
};

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
      userId: 'central-1',
      tenantId: 'prime-you',
      role: 'central_operations',
      assetIds: [],
      displayName: 'Operacoes',
      email: 'central@primeyou.com',
      mfaVerified: true,
      expiresAt: '2026-05-18T08:49:25.591Z'
    },
    actor: {
      userId: 'central-1',
      tenantId: 'prime-you',
      role: 'central_operations',
      assetIds: []
    },
    operatorLabel: 'Operacoes'
  }))
}));

vi.mock('../lib/portal-api', () => ({
  fetchPortalOperationsSnapshot: vi.fn(async () => ({
    maintenanceTickets: [improvementTicket]
  })),
  fetchMaintenanceDetailSnapshot: vi.fn(async () => ({
    source: 'mock',
    ticket: improvementDetail
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
  MaintenanceKanbanBoard: () => <div>kanban</div>
}));

describe('improvements page render', () => {
  it('renders the improvement card popup with the same key fields used in maintenance', async () => {
    const { default: ImprovementsPage } = await import('../app/(portal)/improvements/page');
    const markup = renderToStaticMarkup(
      await ImprovementsPage({
        searchParams: Promise.resolve({ ticketId: improvementTicket.id })
      })
    );

    expect(markup).toContain('Melhoria');
    expect(markup).toContain('ID');
    expect(markup).toContain('Categoria');
    expect(markup).toContain('Ativo');
    expect(markup).toContain('SubStatus');
    expect(markup).toContain('Abertura');
    expect(markup).toContain('Sistema');
    expect(markup).toContain('Anexar arquivo');
    expect(markup).toContain('Comentarios');
    expect(markup).toContain('name="comment"');
    expect(markup).toContain('name="returnTo"');
    expect(markup).toContain('value="/improvements?ticketId=mtn-improvement-1"');
    expect(markup).toContain('Boreal');
    expect(markup.match(/>Fechar</g)?.length ?? 0).toBe(1);
  });

  it('renders the create improvement modal with close action in the footer and updated priority labels', async () => {
    const { default: ImprovementsPage } = await import('../app/(portal)/improvements/page');
    const markup = renderToStaticMarkup(
      await ImprovementsPage({
        searchParams: Promise.resolve({ mode: 'create' })
      })
    );

    expect(markup).toContain('placeholder="Digite o nome do produto"');
    expect(markup).toContain('name="priority"');
    expect(markup).toContain('name="notes"');
    expect(markup).toContain(
      'class="form-actions"><a href="/improvements" class="action-button action-button--ghost">Fechar</a><button class="action-button" type="submit">Criar melhoria</button>'
    );
  });

  it('renders the improvement card popup actions for workflow follow-up', async () => {
    const { default: ImprovementsPage } = await import('../app/(portal)/improvements/page');
    const markup = renderToStaticMarkup(
      await ImprovementsPage({
        searchParams: Promise.resolve({ ticketId: improvementTicket.id })
      })
    );

    expect(markup).toContain('modal=progress');
    expect(markup).toContain('modal=service-order');
  });
});
