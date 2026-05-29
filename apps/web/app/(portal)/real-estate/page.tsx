import Link from 'next/link';

import { PageHeader, Panel } from '../../../components/portal-ui';
import { fetchRealEstateSnapshot, fetchRealEstateStats } from '../../../lib/portal-api';
import { realEstateStatusLabels } from '../../../lib/portal-model';
import { requirePortalSession } from '../../../lib/portal-session';

const assetStatusLabels: Record<string, string> = {
  available: 'Disponível',
  restricted: 'Restrito',
  unavailable: 'Indisponível'
};

export default async function RealEstateDashboardPage() {
  const session = await requirePortalSession();

  const [{ realEstateReports, fleetAssets }, statsResult] = await Promise.all([
    fetchRealEstateSnapshot({
      tenantId: session.actor.tenantId,
      actor: session.actor,
      sessionToken: session.token
    }),
    fetchRealEstateStats({
      actor: session.actor,
      tenantId: session.actor.tenantId,
      sessionToken: session.token
    })
  ]);

  const stats = statsResult.found ? statsResult.stats : null;
  const recentReports = [...realEstateReports]
    .sort((a, b) => Date.parse(b.openedAt) - Date.parse(a.openedAt))
    .slice(0, 5);

  return (
    <div className="page">
      <PageHeader
        title="Painel Real Estate"
        description="Visão geral do portfólio de imóveis, ocorrências e reportes técnicos."
      />

      {stats ? (
        <div className="kpi-strip">
          <div className="kpi-card">
            <span className="kpi-card__label">Reportes</span>
            <strong className="kpi-card__value">{stats.totalReports}</strong>
          </div>
          <div className="kpi-card kpi-card--critical">
            <span className="kpi-card__label">Bloqueios ativos</span>
            <strong className="kpi-card__value">{stats.activeBlockCount}</strong>
          </div>
          <div className="kpi-card">
            <span className="kpi-card__label">Total de bloqueios</span>
            <strong className="kpi-card__value">{stats.totalBlockEvents}</strong>
          </div>
          <div className="kpi-card">
            <span className="kpi-card__label">Em andamento</span>
            <strong className="kpi-card__value">{stats.byStatus.in_progress ?? 0}</strong>
          </div>
          <div className="kpi-card">
            <span className="kpi-card__label">Resolvidos</span>
            <strong className="kpi-card__value">{stats.byStatus.resolved ?? 0}</strong>
          </div>
        </div>
      ) : null}

      <Panel>
        <div className="panel-title">
          <span>Portfólio de imóveis</span>
        </div>

        {fleetAssets.length === 0 ? (
          <div className="signal-list">
            <article className="signal-item">
              <h3 className="signal-item__title">Nenhum imóvel cadastrado</h3>
              <p>Não há imóveis visíveis para o papel autenticado nesta leitura.</p>
            </article>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Imóvel</th>
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
          <Link className="action-button action-button--ghost" href="/real-estate/reports">
            Ver todos
          </Link>
        </div>

        {recentReports.length === 0 ? (
          <div className="signal-list">
            <article className="signal-item">
              <h3 className="signal-item__title">Nenhum reporte encontrado</h3>
              <p>Não há reportes técnicos registrados para este portfólio.</p>
            </article>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Imóvel</th>
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
                    <td>{realEstateStatusLabels[report.status]}</td>
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
