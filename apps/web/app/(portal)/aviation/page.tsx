import Link from 'next/link';

import { PageHeader, Panel } from '../../../components/portal-ui';
import { fetchAviationSnapshot, fetchAviationStats } from '../../../lib/portal-api';
import { aviationStatusLabels } from '../../../lib/portal-model';
import { requirePortalSession } from '../../../lib/portal-session';

const assetStatusLabels: Record<string, string> = {
  available: 'Disponível',
  restricted: 'Restrito',
  unavailable: 'Indisponível'
};

export default async function AviationDashboardPage() {
  const session = await requirePortalSession();

  const [{ aviationReports, fleetAssets }, statsResult] = await Promise.all([
    fetchAviationSnapshot({
      tenantId: session.actor.tenantId,
      actor: session.actor,
      sessionToken: session.token
    }),
    fetchAviationStats({
      actor: session.actor,
      tenantId: session.actor.tenantId,
      sessionToken: session.token
    })
  ]);

  const stats = statsResult.found ? statsResult.stats : null;
  const recentReports = [...aviationReports]
    .sort((a, b) => Date.parse(b.openedAt) - Date.parse(a.openedAt))
    .slice(0, 5);

  return (
    <div className="page">
      <PageHeader
        title="Painel Aviation"
        description="Visão geral da frota de aeronaves, eventos AOG e reportes técnicos."
      />

      {stats ? (
        <div className="kpi-strip">
          <div className="kpi-card">
            <span className="kpi-card__label">Reportes</span>
            <strong className="kpi-card__value">{stats.totalReports}</strong>
          </div>
          <div className="kpi-card kpi-card--critical">
            <span className="kpi-card__label">AOG ativo</span>
            <strong className="kpi-card__value">{stats.activeAogCount}</strong>
          </div>
          <div className="kpi-card">
            <span className="kpi-card__label">Eventos AOG total</span>
            <strong className="kpi-card__value">{stats.totalAogEvents}</strong>
          </div>
          <div className="kpi-card">
            <span className="kpi-card__label">Em andamento</span>
            <strong className="kpi-card__value">{stats.byStatus.in_progress ?? 0}</strong>
          </div>
          <div className="kpi-card">
            <span className="kpi-card__label">Retornadas</span>
            <strong className="kpi-card__value">{stats.byStatus.returned ?? 0}</strong>
          </div>
        </div>
      ) : null}

      <Panel>
        <div className="panel-title">
          <span>Frota de aeronaves</span>
        </div>

        {fleetAssets.length === 0 ? (
          <div className="signal-list">
            <article className="signal-item">
              <h3 className="signal-item__title">Nenhuma aeronave cadastrada</h3>
              <p>Não há aeronaves visíveis para o papel autenticado nesta leitura.</p>
            </article>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Aeronave</th>
                  <th>Status</th>
                  <th>Localização</th>
                  <th>Próxima janela</th>
                </tr>
              </thead>
              <tbody>
                {fleetAssets.map((asset) => (
                  <tr key={asset.id}>
                    <td>{asset.name}</td>
                    <td>{assetStatusLabels[asset.status] ?? asset.status}</td>
                    <td>{asset.location}</td>
                    <td>{asset.nextWindow}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel>
        <div className="panel-title">
          <span>Reportes recentes</span>
          <Link className="action-button action-button--ghost" href="/aviation/reports">
            Ver todos
          </Link>
        </div>

        {recentReports.length === 0 ? (
          <div className="signal-list">
            <article className="signal-item">
              <h3 className="signal-item__title">Nenhum reporte encontrado</h3>
              <p>Não há reportes técnicos registrados para esta frota.</p>
            </article>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Aeronave</th>
                  <th>Título</th>
                  <th>Status</th>
                  <th>Abertura</th>
                </tr>
              </thead>
              <tbody>
                {recentReports.map((report) => (
                  <tr key={report.id}>
                    <td>{report.reportNumber}</td>
                    <td>{report.assetName}</td>
                    <td>{report.title}</td>
                    <td>{aviationStatusLabels[report.status]}</td>
                    <td>{new Date(report.openedAt).toLocaleDateString('pt-BR')}</td>
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
