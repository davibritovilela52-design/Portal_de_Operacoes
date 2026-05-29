import Link from 'next/link';

import { PageHeader, Panel } from '../../../../components/portal-ui';
import {
  fetchMaintenanceDetailSnapshot,
  fetchPortalOperationsSnapshot
} from '../../../../lib/portal-api';
import {
  buildMaintenanceKanbanColumns,
  formatDateLabel,
  maintenanceCategoryLabels,
  maintenanceKanbanSubstatusDefinitions,
  maintenanceSystemLabels,
  resolveMaintenanceKanbanSubstatus
} from '../../../../lib/portal-model';
import { requirePortalSession } from '../../../../lib/portal-session';
import { createMaintenanceTicketAction } from '../../operations-actions';
import { MaintenanceEvidenceUpload } from '../../maintenance/maintenance-evidence-upload';
import { MaintenanceKanbanBoard } from '../../maintenance/maintenance-kanban-board';
import { MaintenanceTicketComments } from '../../maintenance/maintenance-ticket-comments';
import {
  buildMaintenanceTicketPath,
  filterMaintenanceTicketsByQuery,
  MaintenanceTicketFilterForm,
  readMaintenanceTicketFilterQuery
} from '../../maintenance/maintenance-ticket-filter';
import { getDefaultSupplierCatalog, parseSupplierCatalog } from '../../maintenance/supplier-catalog';
import {
  readTicketWorkflowModal,
  TicketWorkflowActionButtons,
  TicketWorkflowActionModals
} from '../../maintenance/ticket-workflow-modals';

const BASE_PATH = '/real-estate/improvements';

type RealEstateImprovementsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RealEstateImprovementsPage({ searchParams }: RealEstateImprovementsPageProps) {
  const session = await requirePortalSession();
  const openedAtValue = new Date().toISOString();
  const [{ maintenanceTickets }, resolvedSearchParams] = await Promise.all([
    fetchPortalOperationsSnapshot({
      tenantId: session.actor.tenantId,
      actor: session.actor,
      sessionToken: session.token
    }),
    searchParams ?? Promise.resolve({})
  ]);
  const notice = readSearchMessage(resolvedSearchParams, 'notice');
  const error = readSearchMessage(resolvedSearchParams, 'error');
  const mode = resolvedSearchParams.mode === 'create' ? 'create' : null;
  const filterQuery = readMaintenanceTicketFilterQuery(resolvedSearchParams);
  const selectedTicketId = readSelectedTicketId(resolvedSearchParams);
  const ticketWorkflowModal = readTicketWorkflowModal(resolvedSearchParams);
  const suppliers = readSupplierCatalog(resolvedSearchParams);
  const improvementTickets = filterMaintenanceTicketsByQuery(
    maintenanceTickets.filter((ticket) => ticket.category === 'improvement'),
    filterQuery
  );
  const listPath = buildMaintenanceTicketPath(BASE_PATH, filterQuery);
  const createPath = buildMaintenanceTicketPath(BASE_PATH, filterQuery, { mode: 'create' });
  const selectedTicketSummary =
    selectedTicketId
      ? improvementTickets.find((ticket) => ticket.id === selectedTicketId) ?? null
      : null;
  const selectedTicketDetailSnapshot =
    selectedTicketSummary && mode !== 'create'
      ? await fetchMaintenanceDetailSnapshot(selectedTicketSummary.id, {
          tenantId: session.actor.tenantId,
          actor: session.actor,
          sessionToken: session.token
        })
      : null;
  const selectedTicketDetail = selectedTicketDetailSnapshot?.ticket ?? null;
  const kanbanColumns = buildMaintenanceKanbanColumns(improvementTickets);
  const detailPath = selectedTicketSummary
    ? buildMaintenanceTicketPath(BASE_PATH, filterQuery, { ticketId: selectedTicketSummary.id })
    : listPath;

  return (
    <div className="page">
      <PageHeader
        title="Melhorias"
        actions={
          <Link className="action-button" href={createPath}>
            Abrir nova melhoria
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
        <MaintenanceTicketFilterForm action={BASE_PATH} query={filterQuery} />
      </Panel>

      <Panel>
        <MaintenanceKanbanBoard columns={kanbanColumns} returnTo={listPath} />
      </Panel>

      {selectedTicketSummary && mode !== 'create' ? (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="panel-title">
              <span>Melhoria</span>
            </div>

            <div className="maintenance-ticket-modal">
              <div className="maintenance-ticket-modal__grid">
                <ModalInfoItem label="ID" value={selectedTicketSummary.ticketNumber} />
                <ModalInfoItem label="Título" value={selectedTicketSummary.title} />
                <ModalInfoItem
                  label="Categoria"
                  value={maintenanceCategoryLabels[selectedTicketSummary.category]}
                />
                <ModalInfoItem
                  label="Imóvel"
                  value={selectedTicketSummary.assetName}
                />
                <ModalInfoItem
                  label="SubStatus"
                  value={resolveSubstatusLabel(resolveMaintenanceKanbanSubstatus(selectedTicketSummary))}
                />
                <ModalInfoItem
                  label="Abertura"
                  value={formatDateLabel(selectedTicketSummary.openedAt)}
                />
                <ModalInfoItem
                  label="Sistema"
                  value={
                    selectedTicketSummary.maintenanceSystem
                      ? maintenanceSystemLabels[selectedTicketSummary.maintenanceSystem]
                      : selectedTicketDetail?.maintenanceSystem
                        ? maintenanceSystemLabels[selectedTicketDetail.maintenanceSystem]
                        : 'Não informado'
                  }
                />
              </div>

              <TicketWorkflowActionButtons
                basePath={BASE_PATH}
                returnTo={detailPath}
                ticketId={selectedTicketSummary.id}
              />

              <MaintenanceEvidenceUpload
                assetId={selectedTicketSummary.assetId}
                returnTo={detailPath}
                ticketId={selectedTicketSummary.id}
              />

              <MaintenanceTicketComments
                assetId={selectedTicketSummary.assetId}
                comments={selectedTicketDetail?.comments}
                notes={selectedTicketDetail?.notes}
                returnTo={detailPath}
                ticketId={selectedTicketSummary.id}
              />

              <div className="form-actions form-actions--end">
                <Link className="action-button action-button--ghost" href={listPath}>
                  Fechar
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {selectedTicketSummary && ticketWorkflowModal ? (
        <TicketWorkflowActionModals
          basePath={BASE_PATH}
          modal={ticketWorkflowModal}
          suppliers={suppliers}
          returnTo={detailPath}
          ticket={{
            ticketId: selectedTicketSummary.id,
            assetId: selectedTicketSummary.assetId,
            ticketNumber: selectedTicketSummary.ticketNumber,
            title: selectedTicketSummary.title,
            assetName: selectedTicketSummary.assetName,
            status: selectedTicketSummary.status,
            kanbanSubstatus: resolveMaintenanceKanbanSubstatus(selectedTicketSummary)
          }}
        />
      ) : null}

      {mode === 'create' ? (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="panel-title">
              <span>Abrir nova melhoria</span>
            </div>

            <form action={createMaintenanceTicketAction} className="action-form">
              <input name="actorRole" type="hidden" value={session.actor.role} />
              <input name="operator" type="hidden" value={session.operatorLabel} />
              <input name="returnTo" type="hidden" value={listPath} />
              <input name="category" type="hidden" value="improvement" />
              <input name="openedAt" type="hidden" value={openedAtValue} />

              <div className="form-grid">
                <label className="form-field">
                  <span>Solicitante</span>
                  <input name="requester" type="text" placeholder="Nome do solicitante" required />
                </label>

                <label className="form-field">
                  <span>Produto</span>
                  <input name="product" type="text" placeholder="Digite o nome do produto" required />
                </label>

                <label className="form-field">
                  <span>Motivo</span>
                  <input name="reason" type="text" placeholder="Descreva o motivo da melhoria" required />
                </label>

                <label className="form-field">
                  <span>Prioridade</span>
                  <select name="priority" defaultValue="P2">
                    <option value="P1">Crítica</option>
                    <option value="P2">Alta</option>
                    <option value="P3">Média</option>
                    <option value="P4">Baixa</option>
                  </select>
                </label>

                <label className="form-field form-field--full">
                  <span>Observações</span>
                  <textarea name="notes" rows={4} placeholder="Adicione detalhes complementares da melhoria." />
                </label>
              </div>

              <div className="form-actions">
                <Link className="action-button action-button--ghost" href={listPath}>
                  Fechar
                </Link>
                <button className="action-button" type="submit">
                  Criar melhoria
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

function readSearchMessage(params: Record<string, string | string[] | undefined>, key: 'notice' | 'error') {
  const value = params[key];
  return typeof value === 'string' ? value : undefined;
}

function readSelectedTicketId(params: Record<string, string | string[] | undefined>) {
  const value = params.ticketId;
  return typeof value === 'string' && value.trim() ? value : null;
}

function readSupplierCatalog(params: Record<string, string | string[] | undefined>) {
  const value = params.suppliersJson;
  if (typeof value !== 'string') return getDefaultSupplierCatalog();
  return parseSupplierCatalog(value);
}

function resolveSubstatusLabel(substatus: string | undefined) {
  if (!substatus) return 'Não informado';
  return maintenanceKanbanSubstatusDefinitions.find((item) => item.key === substatus)?.label ?? 'Não informado';
}
