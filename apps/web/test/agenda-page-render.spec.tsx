import React, { type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { agendaEvents, fleetAssets } from '../lib/portal-data';
import { fetchPortalOperationsSnapshot } from '../lib/portal-api';
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
  Badge: ({ label }: { label: string }) => <span>{label}</span>,
  PageHeader: ({
    eyebrow,
    title,
    description,
    actions
  }: {
    eyebrow?: string;
    title: string;
    description?: string;
    actions?: ReactNode;
  }) => (
    <header>
      {eyebrow ? <p>{eyebrow}</p> : null}
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
  fetchPortalOperationsSnapshot: vi.fn(async () => ({
    agendaEvents,
    fleetAssets
  }))
}));

vi.mock('../app/(portal)/operations-actions', () => ({
  scheduleAgendaEventAction: vi.fn(),
  rescheduleAgendaEventAction: vi.fn(),
  deleteAgendaEventAction: vi.fn()
}));

describe('agenda page render', () => {
  it('renders different vessel palettes in the calendar markup', async () => {
    const { default: AgendaPage } = await import('../app/(portal)/agenda/page');
    const markup = renderToStaticMarkup(
      await AgendaPage({
        searchParams: Promise.resolve({})
      })
    );
    expect(markup).toContain('aria-label="Navegacao entre meses"');
    expect(markup).not.toContain('CalendÃ¡rio operacional');
    expect(markup).toContain('maio de 2026');
    expect(markup).toContain('name="assetId"');
  });

  it('renders multi-day events as spanning segments in the calendar', async () => {
    vi.mocked(fetchPortalOperationsSnapshot).mockResolvedValueOnce({
      agendaEvents: [
        {
          id: 'multi-day-event',
          assetId: 'yacht-001',
          assetName: 'Yacht Aurora',
          type: 'planned_maintenance',
          title: 'Manutenção de casco',
          owner: 'Coordenação técnica',
          startsAt: '2026-05-05T09:00:00.000Z',
          endsAt: '2026-05-08T12:00:00.000Z'
        },
        {
          id: 'single-day-event',
          assetId: 'yacht-002',
          assetName: 'Yacht Boreal',
          type: 'utilization',
          title: 'Uso executivo',
          owner: 'Operação - Real Estate & Yachts',
          startsAt: '2026-05-06T10:00:00.000Z',
          endsAt: '2026-05-06T14:00:00.000Z'
        }
      ],
      fleetAssets
    });

    const { default: AgendaPage } = await import('../app/(portal)/agenda/page');
    const markup = renderToStaticMarkup(
      await AgendaPage({
        searchParams: Promise.resolve({})
      })
    );

    expect((markup.match(/Manutenção de casco/g) ?? []).length).toBe(1);
    expect(markup).toContain('grid-column:2 / 6');
    expect(markup).toContain('calendar-week-event-lane');
    expect(markup).toContain('calendar-event-chip--multi-day');
    expect(markup).toContain('single-day-event');
  });

  it('filters the calendar by the selected asset and keeps month navigation scoped to it', async () => {
    const { default: AgendaPage } = await import('../app/(portal)/agenda/page');
    const markup = renderToStaticMarkup(
      await AgendaPage({
        searchParams: Promise.resolve({ assetId: 'yacht-002' })
      })
    );

    expect(markup).toContain('href="/agenda?month=2026-05&amp;mode=create&amp;assetId=yacht-002"');
    expect(markup).toContain('name="assetId"');
    expect(markup).toContain('eventId=ag-003');
    expect(markup).toContain('eventId=ag-004');
    expect(markup).not.toContain('eventId=ag-001');
    expect(markup).not.toContain('eventId=ag-002');
    expect(markup).not.toContain('eventId=ag-005');
  });

  it('shows the logged-in asset in create mode for asset field team users', async () => {
    vi.mocked(requirePortalSession).mockResolvedValueOnce({
      token: 'test-session-token',
      claims: {
        version: 1,
        userId: 'field-asset-1',
        tenantId: 'prime-you',
        role: 'asset_field_team',
        assetIds: ['yacht-001'],
        displayName: 'Equipe de Embarcação',
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
      operatorLabel: 'Equipe de Embarcação'
    });

    const { default: AgendaPage } = await import('../app/(portal)/agenda/page');
    const markup = renderToStaticMarkup(
      await AgendaPage({
        searchParams: Promise.resolve({ mode: 'create' })
      })
    );

    expect(markup).not.toContain('<label class="form-field form-field--full"><span>Ativo</span><select name="assetId"');
    expect(markup).toContain('class="agenda-asset-filter"');
    expect(markup).toContain('type="hidden" name="assetId" value="yacht-001"');
    expect(markup).toContain('<div class="form-value">Aurora</div>');
    expect(markup).toContain('<label class="form-field form-field--full"><span>Nome do evento</span>');
    expect(markup).toContain('form-grid form-grid--date-range form-field--full');
    expect(markup).not.toContain('>Fechar<');
    expect(markup).toContain('>Cancelar<');
    expect(markup).toContain('>Salvar<');
    expect(markup).not.toContain('>Salvar evento<');
  });

  it('renders the create modal with a full-width asset selector for portal admins', async () => {
    const { default: AgendaPage } = await import('../app/(portal)/agenda/page');
    const markup = renderToStaticMarkup(
      await AgendaPage({
        searchParams: Promise.resolve({ mode: 'create' })
      })
    );

    expect(markup).toContain('<label class="form-field form-field--full"><span>Ativo</span>');
    expect(markup).toContain('name="assetId"');
  });

  it('opens a scheduled event in read-only mode and exposes edit/delete actions', async () => {
    const { default: AgendaPage } = await import('../app/(portal)/agenda/page');
    const markup = renderToStaticMarkup(
      await AgendaPage({
        searchParams: Promise.resolve({ mode: 'edit', eventId: agendaEvents[0]?.id ?? '' })
      })
    );

    expect(markup).toContain('Evento agendado');
    expect(markup).toContain('>Editar<');
    expect(markup).toContain('>Excluir<');
    expect(markup).not.toContain('name="rescheduleStartsAt"');
    expect(markup).toContain('form-value');
    expect(markup).not.toContain('Sim, excluir');
  });

  it('enables editing only after the edit action is selected', async () => {
    const { default: AgendaPage } = await import('../app/(portal)/agenda/page');
    const markup = renderToStaticMarkup(
      await AgendaPage({
        searchParams: Promise.resolve({
          mode: 'edit',
          eventId: agendaEvents[0]?.id ?? '',
          intent: 'edit'
        })
      })
    );

    expect(markup).toContain('Editar evento');
    expect(markup).toContain('<label class="form-field form-field--full"><span>Nome do evento</span>');
    expect(markup).toContain('<label class="form-field form-field--full"><span>Ativo</span>');
    expect(markup).toContain('name="rescheduleStartsAt"');
    expect(markup).toContain('name="rescheduleEndsAt"');
    expect(markup).toContain('>Salvar<');
  });

  it('requires an explicit confirmation step before deleting an event', async () => {
    const { default: AgendaPage } = await import('../app/(portal)/agenda/page');
    const markup = renderToStaticMarkup(
      await AgendaPage({
        searchParams: Promise.resolve({
          mode: 'edit',
          eventId: agendaEvents[0]?.id ?? '',
          confirmDelete: 'true'
        })
      })
    );

    expect(markup).toContain('Deseja mesmo excluir este evento?');
    expect(markup).toContain('>Sim, excluir<');
    expect(markup).toContain('>Cancelar<');
  });
});



