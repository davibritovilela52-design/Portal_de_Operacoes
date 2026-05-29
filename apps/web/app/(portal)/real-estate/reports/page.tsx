import Link from 'next/link';

import { PageHeader, Panel } from '../../../../components/portal-ui';
import { fetchRealEstateSnapshot } from '../../../../lib/portal-api';
import {
  realEstateCategoryLabels,
  realEstateStatusLabels,
  buildRealEstateKanbanColumns,
  type RealEstateCategory
} from '../../../../lib/portal-model';
import { requirePortalSession } from '../../../../lib/portal-session';
import { createRealEstateReportAction } from '../../operations-actions';
import { RealEstateKanbanBoard } from '../real-estate-kanban-board';
import {
  RealEstateTicketFilterForm,
  filterRealEstateReportsByQuery,
  readRealEstateTicketFilterQuery
} from '../real-estate-ticket-filter';

type RealEstateReportsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const realEstateCategoryOptions: RealEstateCategory[] = [
  'preventive',
  'corrective',
  'emergency',
  'inspection',
  'legal',
  'renovation'
];

const urgencyOptions = ['critical', 'high', 'medium', 'low'] as const;

export default async function RealEstateReportsPage({ searchParams }: RealEstateReportsPageProps) {
  const session = await requirePortalSession();
  const openedAtValue = new Date().toISOString();

  const [{ realEstateReports, fleetAssets }, resolvedSearchParams] = await Promise.all([
    fetchRealEstateSnapshot({
      tenantId: session.actor.tenantId,
      actor: session.actor,
      sessionToken: session.token
    }),
    (searchParams ?? Promise.resolve({} as Record<string, string | string[] | undefined>))
  ]);

  const notice = readSearchMessage(resolvedSearchParams, 'notice');
  const error = readSearchMessage(resolvedSearchParams, 'error');
  const mode = resolvedSearchParams.mode === 'create' ? 'create' : null;
  const filterQuery = readRealEstateTicketFilterQuery(resolvedSearchParams);
  const selectedReportId =
    typeof resolvedSearchParams.reportId === 'string' ? resolvedSearchParams.reportId : null;
  const filteredReports = filterRealEstateReportsByQuery(realEstateReports, filterQuery);
  const kanbanColumns = buildRealEstateKanbanColumns(filteredReports);
  const createPath = '/real-estate/reports?mode=create';
  const listPath = '/real-estate/reports';
  const selectedReport = selectedReportId
    ? filteredReports.find((r) => r.id === selectedReportId) ?? null
    : null;

  return (
    <div className="page">
      <PageHeader
        title="Reportes técnicos"
        description="Acompanhe o status dos reportes técnicos e manutenções dos imóveis."
        actions={
          <Link className="action-button" href={createPath}>
            Abrir reporte
          </Link>
        }
      />

      {notice ? (
        <Panel tone="highlight" className="status-banner">
          <strong>Operação concluída</strong>
          <p>{notice}</p>
        </Panel>
      ) : null}

      {error ? (
        <Panel tone="critical" className="status-banner">
          <strong>Operação recusada</strong>
          <p>{error}</p>
        </Panel>
      ) : null}

      <Panel>
        <RealEstateTicketFilterForm action="/real-estate/reports" query={filterQuery} />
      </Panel>

      <Panel>
        <RealEstateKanbanBoard columns={kanbanColumns} returnTo={listPath} />
      </Panel>

      {selectedReport && mode !== 'create' ? (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="panel-title">
              <span>Reporte</span>
              <Link className="action-button action-button--ghost" href={listPath}>
                Fechar
              </Link>
            </div>

            <div className="maintenance-ticket-modal">
              <div className="maintenance-ticket-modal__grid">
                <ModalInfoItem label="ID" value={selectedReport.reportNumber} />
                <ModalInfoItem label="Título" value={selectedReport.title} />
                <ModalInfoItem
                  label="Categoria"
                  value={realEstateCategoryLabels[selectedReport.category]}
                />
                <ModalInfoItem label="Imóvel" value={selectedReport.assetName} />
                <ModalInfoItem
                  label="Status"
                  value={realEstateStatusLabels[selectedReport.status]}
                />
                <ModalInfoItem
                  label="Abertura"
                  value={new Date(selectedReport.openedAt).toLocaleDateString('pt-BR')}
                />
                {selectedReport.blockCount > 0 ? (
                  <ModalInfoItem
                    label="Bloqueios"
                    value={String(selectedReport.blockCount)}
                  />
                ) : null}
                {selectedReport.returnToServiceEta ? (
                  <ModalInfoItem
                    label="Previsão de resolução"
                    value={new Date(selectedReport.returnToServiceEta).toLocaleDateString('pt-BR')}
                  />
                ) : null}
              </div>
              <div className="form-actions form-actions--end">
                <Link className="action-button action-button--ghost" href={listPath}>
                  Fechar
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {mode === 'create' ? (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="panel-title">
              <span>Abrir reporte</span>
              <Link className="action-button action-button--ghost" href={listPath}>
                Fechar
              </Link>
            </div>

            <form action={createRealEstateReportAction} className="action-form">
              <input name="operator" type="hidden" value={session.operatorLabel} />
              <input name="returnTo" type="hidden" value={listPath} />
              <input name="openedAt" type="hidden" value={openedAtValue} />

              <div className="form-grid">
                {fleetAssets.length > 0 ? (
                  <label className="form-field form-field--full">
                    <span>Imóvel</span>
                    <select name="assetId" defaultValue={fleetAssets[0]?.id} required>
                      {fleetAssets.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label className="form-field form-field--full">
                    <span>ID do Imóvel</span>
                    <input name="assetId" type="text" placeholder="re-001" required />
                  </label>
                )}

                <label className="form-field form-field--full">
                  <span>Categoria</span>
                  <select name="category" defaultValue="corrective">
                    {realEstateCategoryOptions.map((cat) => (
                      <option key={cat} value={cat}>
                        {realEstateCategoryLabels[cat]}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-field form-field--full">
                  <span>Título</span>
                  <input
                    name="title"
                    type="text"
                    placeholder="Resumo do reporte técnico"
                    required
                  />
                </label>

                <label className="form-field form-field--full">
                  <span>Urgência</span>
                  <select name="urgency" defaultValue="medium">
                    {urgencyOptions.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-field form-field--full">
                  <span>Descrição</span>
                  <textarea
                    name="description"
                    rows={4}
                    placeholder="Descreva a ocorrência, sistema afetado e impacto operacional."
                    required
                  />
                </label>
              </div>

              <div className="form-actions form-actions--end">
                <button className="action-button" type="submit">
                  Criar reporte
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ModalInfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="maintenance-ticket-modal__item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function readSearchMessage(
  params: Record<string, string | string[] | undefined>,
  key: 'notice' | 'error'
) {
  const val = params[key];
  return typeof val === 'string' ? val : undefined;
}
