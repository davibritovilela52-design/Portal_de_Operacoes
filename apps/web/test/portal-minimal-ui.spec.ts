import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('portal minimalista operacional', () => {
  it('removes the heavy shell controls from the shared portal layout', () => {
    const shellSource = readFileSync(
      resolve(__dirname, '../components/portal-shell.tsx'),
      'utf8'
    );

    expect(shellSource).not.toContain('topbar__search');
    expect(shellSource).not.toContain('Exportar');
    expect(shellSource).not.toContain('session-chip__mfa');
  });

  it('removes KPI cards from the operational pages so the primary flow stays visible', () => {
    const pageFiles = [
      '../app/(portal)/dashboard/page.tsx',
      '../app/(portal)/agenda/page.tsx',
      '../app/(portal)/access/page.tsx',
      '../app/(portal)/audit-governance/page.tsx',
      '../app/(portal)/cutover/page.tsx',
      '../app/(portal)/improvements/page.tsx',
      '../app/(portal)/maintenance/page.tsx'
    ] as const;

    for (const file of pageFiles) {
      const source = readFileSync(resolve(__dirname, file), 'utf8');

      expect(source, `${file} should not import KpiCard`).not.toContain('KpiCard');
      expect(source, `${file} should not render metric-grid blocks`).not.toContain('metric-grid');
    }
  });

  it('drops the dashboard hero block so the page starts with direct operational content', () => {
    const dashboardSource = readFileSync(
      resolve(__dirname, '../app/(portal)/dashboard/page.tsx'),
      'utf8'
    );

    expect(dashboardSource).not.toContain('hero-callout');
    expect(dashboardSource).not.toContain('inline-stats');
  });

  it('keeps the dashboard focused on scoped summary data', () => {
    const dashboardSource = readFileSync(
      resolve(__dirname, '../app/(portal)/dashboard/page.tsx'),
      'utf8'
    );

    expect(dashboardSource).not.toContain('Backlog de manuten');
    expect(dashboardSource).not.toContain('Chamados cr');
    expect(dashboardSource).not.toContain('Fila principal da opera');
    expect(dashboardSource).not.toContain('Leitura r');
    expect(dashboardSource).not.toContain('Trilha de auditoria');
    expect(dashboardSource).not.toContain('Notas operacionais');
    expect(dashboardSource).not.toContain('portalContext.phase');
    expect(dashboardSource).toContain('Painel Operacional');
    expect(dashboardSource).toContain('Indicadores Operacionais');
    expect(dashboardSource).toContain('buildDashboardOverview');
    expect(dashboardSource).toContain('buildDashboardAssetRows');
    expect(dashboardSource).toContain('buildBacklogAging');
    expect(dashboardSource).toContain("bucket.key !== 'lt7'");
    expect(dashboardSource).not.toContain('buildAssetAvailability');
    expect(dashboardSource).toContain('Chamados abertos');
    expect(dashboardSource).toContain('dashboard-indicator-grid');
    expect(dashboardSource).toContain('<table');
    expect(dashboardSource).not.toContain('availability-');
    expect(dashboardSource).not.toContain('Inteligência Operacional');
    expect(dashboardSource).not.toContain('Disponibilidade 30d');
    expect(dashboardSource).not.toContain('Dias bloqueados');
    expect(dashboardSource).not.toContain('description=');
  });

  it('styles aviation indicators as separated KPI cards', () => {
    const aviationSource = readFileSync(
      resolve(__dirname, '../app/(portal)/aviation/page.tsx'),
      'utf8'
    );
    const stylesSource = readFileSync(resolve(__dirname, '../app/globals.css'), 'utf8');

    expect(stylesSource).toContain('grid-template-columns: repeat(3, minmax(0, 1fr));');
    expect(aviationSource).toContain('className="kpi-strip"');
    expect(aviationSource).toContain('className="kpi-card__label"');
    expect(aviationSource).toContain('className="kpi-card__value"');
    expect(stylesSource).toContain('.kpi-strip');
    expect(stylesSource).toContain('.kpi-card__label');
    expect(stylesSource).toContain('.kpi-card__value');
  });

  it('reduces agenda to a calendar-first screen with only create and edit actions', () => {
    const agendaSource = readFileSync(
      resolve(__dirname, '../app/(portal)/agenda/page.tsx'),
      'utf8'
    );
    const agendaFilterSource = readFileSync(
      resolve(__dirname, '../app/(portal)/agenda/agenda-asset-filter-form.tsx'),
      'utf8'
    );

    expect(agendaSource).not.toContain('Fila de conflito');
    expect(agendaSource).not.toContain('Regras operacionais em tela');
    expect(agendaSource).not.toContain('Eventos mais recentes da agenda');
    expect(agendaSource).not.toContain('Reprogramar evento');
    expect(agendaSource).not.toContain('Agenda via API');
    expect(agendaSource).not.toContain('Agenda em modo misto');
    expect(agendaSource).not.toContain('Agenda em fallback visual');
    expect(agendaSource).not.toContain('eyebrow=');
    expect(agendaSource).not.toContain('description=');
    expect(agendaSource).not.toContain(
      `className="action-button action-button--ghost" href={buildAgendaHref(monthCursor, { mode: 'edit' })}`
    );
    expect(agendaSource).toContain('title="Agenda"');
    expect(agendaSource).toContain('buildCalendarCells');
    expect(agendaSource).toContain('aria-label="Mes anterior"');
    expect(agendaSource).toContain('aria-label="Proximo mes"');
    expect(agendaSource).toContain('agenda-calendar-nav__arrow');
    expect(agendaSource).toContain('AgendaAssetFilterForm');
    expect(agendaSource).toContain('filterAgendaEventsByAsset');
    expect(agendaSource).toContain('filterAssetId');
    expect(agendaSource).toContain('name="calendarMonth"');
    expect(agendaSource).toContain('buildAgendaHref');
    expect(agendaSource).not.toContain('eventos no mes');
    expect(agendaFilterSource).toContain('agenda-asset-filter');
    expect(agendaFilterSource).toContain('name="assetId"');
    expect(agendaFilterSource).toContain('requestSubmit()');
    expect(agendaFilterSource).not.toContain('Filtrar');
  });

  it('keeps maintenance clean and adds interactive horizontal kanban navigation', () => {
    const maintenanceSource = readFileSync(
      resolve(__dirname, '../app/(portal)/maintenance/page.tsx'),
      'utf8'
    );

    expect(maintenanceSource).not.toContain('Resumo dos macrostatus');
    expect(maintenanceSource).not.toContain('Regras operacionais de escrita');
    expect(maintenanceSource).not.toContain('Foco cr');
    expect(maintenanceSource).not.toContain('Fila operacional');
    expect(maintenanceSource).not.toContain('Escrita real na API');
    expect(maintenanceSource).not.toContain('Fluxo de manuten');
    expect(maintenanceSource).not.toContain('Abertura simples de chamados');
    expect(maintenanceSource).not.toContain('Quadro Kanban da manuten');
    expect(maintenanceSource).toContain('MaintenanceKanbanBoard');
    expect(maintenanceSource).toContain('href={maintenanceCreatePath}');
    expect(maintenanceSource).toContain("mode === 'create'");
    expect(maintenanceSource).toContain('buildMaintenanceKanbanColumns');
    expect(maintenanceSource).toContain('MaintenanceTicketFilterForm');
    expect(maintenanceSource).toContain("buildMaintenanceTicketPath('/maintenance', filterQuery");
    expect(maintenanceSource).not.toContain('option value="improvement"');
    expect(maintenanceSource).toContain('option value="warranty"');
    expect(maintenanceSource).not.toContain('option value="emergency"');
    expect(maintenanceSource).not.toContain('option value="inspection"');
    expect(maintenanceSource).toContain('>Sistema de manutenção<');
    expect(maintenanceSource).toContain('>Título<');
    expect(maintenanceSource).toContain('>Descrição<');
    expect(maintenanceSource).toContain('>Urgência<');
    expect(maintenanceSource).not.toContain('type="datetime-local"');
  });

  it('adds a dedicated improvements page backed by maintenance tickets in category improvement', () => {
    const improvementsSource = readFileSync(
      resolve(__dirname, '../app/(portal)/improvements/page.tsx'),
      'utf8'
    );

    expect(improvementsSource).toContain('title="Melhorias"');
    expect(improvementsSource).toContain('href={improvementsCreatePath}');
    expect(improvementsSource).toContain("ticket.category === 'improvement'");
    expect(improvementsSource).toContain('name="category" type="hidden" value="improvement"');
    expect(improvementsSource).toContain('value={improvementsListPath}');
    expect(improvementsSource).toContain('MaintenanceTicketFilterForm');
    expect(improvementsSource).toContain('>Solicitante<');
    expect(improvementsSource).toContain('>Produto<');
    expect(improvementsSource).toContain('>Motivo<');
    expect(improvementsSource).toContain('>Prioridade<');
    expect(improvementsSource).toContain('>Observações<');
    expect(improvementsSource).toContain('name="product"');
    expect(improvementsSource).not.toContain('<select name="assetId"');
    expect(improvementsSource).toContain('placeholder="Digite o nome do produto"');
    expect(improvementsSource).toContain('<option value="P1">Crítica</option>');
    expect(improvementsSource).toContain('<option value="P4">Baixa</option>');
    expect(improvementsSource).not.toContain('Digite o nome do yacht');
    expect(improvementsSource).not.toContain(
      'A melhoria é aberta com a sessão autenticada do operador e já entra no Kanban.'
    );
    expect(improvementsSource).not.toContain('name="description"');
  });

  it('cleans the sidebar and keeps access focused on one main component', () => {
    const shellSource = readFileSync(
      resolve(__dirname, '../components/portal-shell.tsx'),
      'utf8'
    );
    const accessSource = readFileSync(
      resolve(__dirname, '../app/(portal)/access/page.tsx'),
      'utf8'
    );

    expect(shellSource).not.toContain('Orquestra');
    expect(shellSource).not.toContain('portalContext.phase');
    expect(shellSource).not.toContain('portalContext.commandWindow');

    expect(accessSource).not.toContain('Provisionar ou atualizar acesso');
    expect(accessSource).not.toContain('Revogação operacional');
    expect(accessSource).not.toContain('Resumo de conformidade');
    expect(accessSource).not.toContain('Regras de governan');
    expect(accessSource).not.toContain('Diret');
    expect(accessSource).toContain('upsertAccessAssignmentAction');
    expect(accessSource).toContain('fetchPortalSnapshot');
    expect(accessSource).toContain('accessUsers');
    expect(accessSource).toContain("requirePortalRole('portal_admin')");
    expect(accessSource).toContain('canManageAccessModule(session.actor.role)');
    expect(accessSource).toContain('PageHeader');
    expect(accessSource).toContain('Cadastrar usuário');
    expect(accessSource).toContain('href="/access?mode=create"');
    expect(accessSource).toContain('Acessos atuais');
    expect(accessSource).toContain('<table');
    expect(accessSource).toContain('access-user-email');
    expect(accessSource).toContain('Editar');
    expect(accessSource).not.toContain('<th>Escopo</th>');
    expect(accessSource).not.toContain('<th>MFA</th>');
    expect(accessSource).not.toContain('<th>Revisão</th>');
    expect(accessSource).not.toContain('Revogado');
  });
});
