import { PageHeader, Panel } from '../../../components/portal-ui';
import { fetchPortalOperationsSnapshot } from '../../../lib/portal-api';
import {
  buildBacklogAging,
  buildDashboardAssetRows,
  buildDashboardOverview,
  buildDashboardVisibleAssets,
  hasGlobalDashboardScope
} from '../../../lib/portal-model';
import { requirePortalSession } from '../../../lib/portal-session';

export default async function DashboardPage() {
  const session = await requirePortalSession();
  const { fleetAssets, maintenanceTickets, agendaEvents } =
    await fetchPortalOperationsSnapshot({
      tenantId: session.actor.tenantId,
      actor: session.actor,
      sessionToken: session.token
    });
  const hasGlobalDashboard = hasGlobalDashboardScope(session.actor.role);
  const isPortalAdmin = session.actor.role === 'portal_admin';
  const visibleFleetAssets = buildDashboardVisibleAssets({
    role: session.actor.role,
    fleetAssets,
    assetIds: session.actor.assetIds
  });
  const overview = buildDashboardOverview({
    role: session.actor.role,
    fleetAssets: visibleFleetAssets,
    maintenanceTickets,
    agendaEvents
  });
  const assetRows = buildDashboardAssetRows({
    fleetAssets: visibleFleetAssets,
    maintenanceTickets,
    agendaEvents
  });
  const backlogAging = buildBacklogAging(maintenanceTickets).filter(
    (bucket) => bucket.key !== 'lt7'
  );

  return (
    <div className="page">
      <PageHeader
        title="Painel Operacional"
      />

      <Panel>
        <div className="panel-title">
          <span>Indicadores Operacionais</span>
        </div>

        <div className="dashboard-indicator-grid">
          {overview.metricItems.map((item) => (
            <article key={item.label} className="dashboard-indicator-card">
              <span className="dashboard-indicator-card__label">{item.label}</span>
              <div className="dashboard-indicator-card__value">
                <strong>{item.value}</strong>
              </div>
            </article>
          ))}

          {backlogAging.map((bucket) => (
            <article key={`backlog-${bucket.key}`} className="dashboard-indicator-card">
              <span className="dashboard-indicator-card__label">{bucket.label}</span>
              <div className="dashboard-indicator-card__value">
                <strong>{bucket.count}</strong>
              </div>
            </article>
          ))}
        </div>
      </Panel>

      <Panel>
        <div className="panel-title">
          <span>{hasGlobalDashboard ? 'Ativos monitorados' : 'Ativos no seu escopo'}</span>
        </div>

        {assetRows.length === 0 ? (
          <div className="signal-list">
            <article className="signal-item">
              <h3 className="signal-item__title">Nenhum ativo disponivel</h3>
              <p>Não há ativos visíveis para o papel autenticado nesta leitura.</p>
            </article>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  {isPortalAdmin ? <th>Modal</th> : null}
                  <th>Ativo</th>
                  <th>Eventos</th>
                  <th>Chamados abertos</th>
                </tr>
              </thead>
              <tbody>
                {assetRows.map((row) => (
                  <tr key={row.assetId}>
                    {isPortalAdmin ? <td>{row.modalityLabel}</td> : null}
                    <td>{row.assetName}</td>
                    <td>{row.eventCount}</td>
                    <td>{row.openTicketCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
