import { PageHeader, Panel } from '../../../components/portal-ui';
import { fetchPortalOperationsSnapshot } from '../../../lib/portal-api';
import {
  buildAssetAvailability,
  buildBacklogAging,
  buildDashboardAssetRows,
  buildMaintenanceCostByAsset,
  buildDashboardOverview,
  buildDashboardVisibleAssets,
  buildMTTA,
  buildMTTR,
  hasGlobalDashboardScope
} from '../../../lib/portal-model';
import { requirePortalSession } from '../../../lib/portal-session';

export default async function DashboardPage() {
  const session = await requirePortalSession();
  const { fleetAssets, maintenanceTickets, maintenanceCosts, agendaEvents } =
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
  const mttr = buildMTTR(maintenanceTickets);
  const mtta = buildMTTA(maintenanceTickets);
  const backlogAging = buildBacklogAging(maintenanceTickets);
  const backlogCount = backlogAging.reduce((sum, bucket) => sum + bucket.count, 0);
  const availabilityRows = buildAssetAvailability(
    visibleFleetAssets,
    agendaEvents,
    maintenanceTickets
  );
  const costRowsByAssetId = new Map(
    buildMaintenanceCostByAsset(visibleFleetAssets, maintenanceCosts).map((row) => [row.assetId, row])
  );
  const operationalAssetRows = availabilityRows
    .map((availabilityRow) => ({
      ...availabilityRow,
      cost: costRowsByAssetId.get(availabilityRow.assetId)
    }))
    .sort((left, right) => {
      if (left.availabilityPercentage !== right.availabilityPercentage) {
        return left.availabilityPercentage - right.availabilityPercentage;
      }

      return left.assetName.localeCompare(right.assetName);
    });

  return (
    <div className="page">
      <PageHeader
        title="Painel operacional"
      />

      <Panel>
        <div className="panel-title">
          <span>Indicadores</span>
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

      <Panel>
        <div className="panel-title">
          <span>Inteligência Operacional</span>
        </div>

        <div className="dashboard-indicator-grid">
          <article className="dashboard-indicator-card">
            <span className="dashboard-indicator-card__label">MTTA</span>
            <div className="dashboard-indicator-card__value">
              <strong>{formatHoursMetric(mtta)}</strong>
            </div>
          </article>
          <article className="dashboard-indicator-card">
            <span className="dashboard-indicator-card__label">MTTR</span>
            <div className="dashboard-indicator-card__value">
              <strong>{formatHoursMetric(mttr)}</strong>
            </div>
          </article>
          <article className="dashboard-indicator-card">
            <span className="dashboard-indicator-card__label">Tickets no backlog</span>
            <div className="dashboard-indicator-card__value">
              <strong>{backlogCount}</strong>
            </div>
          </article>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Bucket</th>
                <th>Tickets</th>
              </tr>
            </thead>
            <tbody>
              {backlogAging.map((bucket) => (
                <tr key={bucket.key}>
                  <td>{bucket.label}</td>
                  <td>{bucket.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {operationalAssetRows.length === 0 ? (
          <div className="signal-list">
            <article className="signal-item">
              <h3 className="signal-item__title">Sem leitura operacional suficiente</h3>
              <p>Não há ativos visíveis para calcular disponibilidade e custo por ativo.</p>
            </article>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  {isPortalAdmin ? <th>Modal</th> : null}
                  <th>Ativo</th>
                  <th>Disponibilidade 30d</th>
                  <th>Dias bloqueados</th>
                  <th>Custo registrado</th>
                </tr>
              </thead>
              <tbody>
                {operationalAssetRows.map((row) => (
                  <tr key={row.assetId}>
                    {isPortalAdmin ? <td>{row.modalityLabel}</td> : null}
                    <td>{row.assetName}</td>
                    <td>{`${row.availabilityPercentage.toFixed(1)}%`}</td>
                    <td>{`${row.blockedDays}/${row.totalDays}`}</td>
                    <td>{formatCurrencyMetric(row.cost?.totalCost ?? 0, row.cost?.currency ?? 'BRL')}</td>
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

function formatHoursMetric(value: number | null): string {
  return value === null ? 'N/D' : `${value.toFixed(1)} h`;
}

function formatCurrencyMetric(value: number, currency: string): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}
