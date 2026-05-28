import Link from 'next/link';

import { PageHeader, Panel } from '../../../../components/portal-ui';
import { fetchAviationSnapshot } from '../../../../lib/portal-api';
import {
  aviationCategoryLabels,
  aviationStatusLabels,
  buildAviationKanbanColumns,
  type AviationCategory
} from '../../../../lib/portal-model';
import { requirePortalSession } from '../../../../lib/portal-session';
import { createAviationReportAction } from '../../operations-actions';
import { AviationKanbanBoard } from '../aviation-kanban-board';
import {
  AviationTicketFilterForm,
  filterAviationReportsByQuery,
  readAviationTicketFilterQuery
} from '../aviation-ticket-filter';

type AviationReportsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const aviationCategoryOptions: AviationCategory[] = [
  'preventive',
  'corrective',
  'emergency',
  'inspection',
  'airworthiness'
];

const aviationUrgencyOptions = ['critical', 'high', 'medium', 'low'] as const;

export default async function AviationReportsPage({ searchParams }: AviationReportsPageProps) {
  const session = await requirePortalSession();
  const openedAtValue = new Date().toISOString();

  const [{ aviationReports, fleetAssets }, resolvedSearchParams] = await Promise.all([
    fetchAviationSnapshot({
      tenantId: session.actor.tenantId,
      actor: session.actor,
      sessionToken: session.token
    }),
    searchParams ?? Promise.resolve({})
  ]);

  const notice = readSearchMessage(resolvedSearchParams, 'notice');
  const error = readSearchMessage(resolvedSearchParams, 'error');
  const mode = resolvedSearchParams.mode === 'create' ? 'create' : null;
  const filterQuery = readAviationTicketFilterQuery(resolvedSearchParams);
  const selectedReportId =
    typeof resolvedSearchParams.reportId === 'string' ? resolvedSearchParams.reportId : null;
  const filteredReports = filterAviationReportsByQuery(aviationReports, filterQuery);
  const kanbanColumns = buildAviationKanbanColumns(filteredReports);
  const createPath = '/aviation/reports?mode=create';
  const listPath = '/aviation/reports';
  const selectedReport = selectedReportId
    ? filteredReports.find((r) => r.id === selectedReportId) ?? null
    : null;

  return (
    <div className="page">
      <PageHeader
        title="Reportes técnicos"
        description="Acompanhe o status dos reportes técnicos e manutenções das aeronaves."
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
        <AviationTicketFilterForm action="/aviation/reports" query={filterQuery} />
      </Panel>

      <Panel>
        <AviationKanbanBoard columns={kanbanColumns} returnTo={listPath} />
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
                  value={aviationCategoryLabels[selectedReport.category]}
                />
                <ModalInfoItem label="Aeronave" value={selectedReport.assetName} />
                <ModalInfoItem
                  label="Status"
                  value={aviationStatusLabels[selectedReport.status]}
                />
                <ModalInfoItem
                  label="Abertura"
                  value={new Date(selectedReport.openedAt).toLocaleDateString('pt-BR')}
                />
                {selectedReport.groundCount > 0 ? (
                  <ModalInfoItem
                    label="Eventos AOG"
                    value={String(selectedReport.groundCount)}
                  />
                ) : null}
                {selectedReport.returnToServiceEta ? (
                  <ModalInfoItem
                    label="Previsão de retorno"
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

            <form action={createAviationReportAction} className="action-form">
              <input name="operator" type="hidden" value={session.operatorLabel} />
              <input name="returnTo" type="hidden" value={listPath} />
              <input name="openedAt" type="hidden" value={openedAtValue} />

              <div className="form-grid">
                {fleetAssets.length > 0 ? (
                  <label className="form-field form-field--full">
                    <span>Aeronave</span>
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
                    <span>ID da Aeronave</span>
                    <input name="assetId" type="text" placeholder="ac-001" required />
                  </label>
                )}

                <label className="form-field form-field--full">
                  <span>Categoria</span>
                  <select name="category" defaultValue="corrective">
                    {aviationCategoryOptions.map((cat) => (
                      <option key={cat} value={cat}>
                        {aviationCategoryLabels[cat]}
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
                    {aviationUrgencyOptions.map((u) => (
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
