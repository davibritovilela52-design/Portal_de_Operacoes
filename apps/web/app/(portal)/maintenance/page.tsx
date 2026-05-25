import Link from 'next/link';

import { PageHeader, Panel } from '../../../components/portal-ui';
import {
  fetchMaintenanceDetailSnapshot,
  fetchPortalOperationsSnapshot
} from '../../../lib/portal-api';
import {
  buildMaintenanceKanbanColumns,
  formatDateLabel,
  maintenanceCategoryLabels,
  maintenanceKanbanSubstatusDefinitions,
  resolveMaintenanceKanbanSubstatus,
  maintenanceSystemLabels,
  maintenanceUrgencyLabels,
  type MaintenanceSystem,
  type MaintenanceUrgency
} from '../../../lib/portal-model';
import { requirePortalSession } from '../../../lib/portal-session';
import { createMaintenanceTicketAction } from '../operations-actions';
import { getDefaultSupplierCatalog, parseSupplierCatalog } from './supplier-catalog';
import { MaintenanceKanbanBoard } from './maintenance-kanban-board';
import { MaintenanceEvidenceUpload } from './maintenance-evidence-upload';
import { MaintenanceTicketComments } from './maintenance-ticket-comments';
import {
  buildMaintenanceTicketPath,
  filterMaintenanceTicketsByQuery,
  MaintenanceTicketFilterForm,
  readMaintenanceTicketFilterQuery
} from './maintenance-ticket-filter';
import {
  readTicketWorkflowModal,
  TicketWorkflowActionButtons,
  TicketWorkflowActionModals
} from './ticket-workflow-modals';

type MaintenancePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MaintenancePage({ searchParams }: MaintenancePageProps) {
  const session = await requirePortalSession();
  const openedAtValue = new Date().toISOString();
  const [{ maintenanceTickets, fleetAssets }, resolvedSearchParams] = await Promise.all([
    fetchPortalOperationsSnapshot({
      tenantId: session.actor.tenantId,
      actor: session.actor,
      sessionToken: session.token
    }),
    searchParams ?? Promise.resolve({})
  ]);

  const notice = readSearchMessage(resolvedSearchParams, 'notice');
  const error = readSearchMessage(resolvedSearchParams, 'error');
  const mode = readMaintenanceMode(resolvedSearchParams);
  const filterQuery = readMaintenanceTicketFilterQuery(resolvedSearchParams);
  const selectedTicketId = readSelectedMaintenanceTicketId(resolvedSearchParams);
  const supplierDraft = readSupplierDraft(resolvedSearchParams);
  const suppliers = readSupplierCatalog(resolvedSearchParams);
  const supplierCreated = readSupplierCreated(resolvedSearchParams);
  const ticketWorkflowModal = readTicketWorkflowModal(resolvedSearchParams);
  const filteredMaintenanceTickets = filterMaintenanceTicketsByQuery(
    maintenanceTickets.filter((ticket) => ticket.category !== 'improvement'),
    filterQuery
  );
  const maintenanceListPath = buildMaintenanceTicketPath('/maintenance', filterQuery);
  const maintenanceCreatePath = buildMaintenanceTicketPath('/maintenance', filterQuery, {
    mode: 'create'
  });
  const selectedTicketSummary =
    selectedTicketId
      ? filteredMaintenanceTickets.find((ticket) => ticket.id === selectedTicketId) ?? null
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
  const kanbanColumns = buildMaintenanceKanbanColumns(filteredMaintenanceTickets);
  const defaultCreateAssetId =
    fleetAssets.length === 1
      ? fleetAssets[0]?.id
      : session.actor.role === 'asset_field_team'
        ? session.actor.assetIds[0] ?? fleetAssets[0]?.id
        : undefined;
  const canChooseCreateAsset = !defaultCreateAssetId && fleetAssets.length > 0;
  const maintenanceDetailPath = selectedTicketSummary
    ? buildMaintenanceTicketPath('/maintenance', filterQuery, {
        ticketId: selectedTicketSummary.id
      })
    : maintenanceListPath;

  return (
    <div className="page">
      <PageHeader
        title="Manutenção"
        description="Acompanhe chamados, bloqueios e execução operacional."
        actions={
          <Link className="action-button" href={maintenanceCreatePath}>
            Abrir novo chamado
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
        <MaintenanceTicketFilterForm action="/maintenance" query={filterQuery} />
      </Panel>

      <Panel>
        <MaintenanceKanbanBoard columns={kanbanColumns} returnTo={maintenanceListPath} />
      </Panel>

      {selectedTicketSummary && mode !== 'create' ? (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="panel-title">
              <span>Chamado</span>
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
                  label="Ativo"
                  value={formatMaintenanceAssetName(selectedTicketSummary.assetName)}
                />
                <ModalInfoItem
                  label="SubStatus"
                  value={resolveMaintenanceSubstatusLabel(
                    resolveMaintenanceKanbanSubstatus(selectedTicketSummary)
                  )}
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
                <ModalInfoItem
                  label="Usuário"
                  value={resolveMaintenanceUserLabel(selectedTicketSummary, selectedTicketDetail)}
                />
              </div>

              <TicketWorkflowActionButtons
                basePath="/maintenance"
                returnTo={maintenanceDetailPath}
                ticketId={selectedTicketSummary.id}
              />

              <MaintenanceEvidenceUpload
                assetId={selectedTicketSummary.assetId}
                returnTo={maintenanceDetailPath}
                ticketId={selectedTicketSummary.id}
              />

              <MaintenanceTicketComments
                assetId={selectedTicketSummary.assetId}
                comments={selectedTicketDetail?.comments}
                notes={selectedTicketDetail?.notes}
                returnTo={maintenanceDetailPath}
                ticketId={selectedTicketSummary.id}
              />

              <div className="form-actions form-actions--end">
                <Link className="action-button action-button--ghost" href={maintenanceListPath}>
                  Fechar
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {selectedTicketSummary && ticketWorkflowModal ? (
        <TicketWorkflowActionModals
          basePath="/maintenance"
          modal={ticketWorkflowModal}
          suppliers={suppliers}
          supplierDraft={supplierDraft}
          supplierCreated={supplierCreated}
          returnTo={maintenanceDetailPath}
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
              <span>Abrir novo chamado</span>
              <Link className="action-button action-button--ghost" href={maintenanceListPath}>
                Fechar
              </Link>
            </div>

            <form action={createMaintenanceTicketAction} className="action-form">
              <input name="actorRole" type="hidden" value={session.actor.role} />
              <input name="operator" type="hidden" value={session.operatorLabel} />
              <input name="returnTo" type="hidden" value={maintenanceListPath} />
              <input name="openedAt" type="hidden" value={openedAtValue} />
              {defaultCreateAssetId ? (
                <input name="assetId" type="hidden" value={defaultCreateAssetId} />
              ) : null}

              <div className="form-grid">
                {canChooseCreateAsset ? (
                  <label className="form-field form-field--full">
                    <span>Embarcação</span>
                    <select name="assetId" defaultValue={fleetAssets[0]?.id} required>
                      {fleetAssets.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                <label className="form-field form-field--full">
                  <span>Categoria</span>
                  <select name="category" defaultValue="corrective">
                    <option value="preventive">Preventiva</option>
                    <option value="corrective">Corretiva</option>
                    <option value="warranty">Garantia</option>
                  </select>
                </label>

                <label className="form-field form-field--full">
                  <span>Sistema de manutenção</span>
                  <select name="maintenanceSystem" defaultValue="mechanical">
                    {maintenanceSystemOptions.map((option) => (
                      <option key={option} value={option}>
                        {maintenanceSystemLabels[option]}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="form-grid form-grid--title-urgency form-field--full">
                  <label className="form-field">
                    <span>Título</span>
                    <input
                      name="title"
                      type="text"
                      placeholder="Resumo objetivo do chamado"
                      required
                    />
                  </label>

                  <label className="form-field">
                    <span>Urgência</span>
                    <select name="urgency" defaultValue="medium">
                      {maintenanceUrgencyOptions.map((option) => (
                        <option key={option} value={option}>
                          {maintenanceUrgencyLabels[option]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="form-field form-field--full">
                  <span>Descrição</span>
                  <textarea
                    name="description"
                    rows={4}
                    placeholder="Descreva o problema, o contexto operacional e o impacto percebido."
                    required
                  />
                </label>
              </div>

              <div className="form-actions form-actions--end">
                <button className="action-button" type="submit">
                  Criar chamado
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
  searchParams: Record<string, string | string[] | undefined>,
  key: 'notice' | 'error'
) {
  const value = searchParams[key];
  return typeof value === 'string' ? value : undefined;
}

function readMaintenanceMode(searchParams: Record<string, string | string[] | undefined>) {
  return searchParams.mode === 'create' ? 'create' : null;
}

function readSelectedMaintenanceTicketId(
  searchParams: Record<string, string | string[] | undefined>
) {
  const value = searchParams.ticketId;
  return typeof value === 'string' && value.trim() ? value : null;
}

function readSupplierDraft(searchParams: Record<string, string | string[] | undefined>) {
  const supplierId = searchParams.supplierId;
  const supplierName = searchParams.supplierName;
  const supplierCnpj = searchParams.supplierCnpj;
  const supplierAddress = searchParams.supplierAddress;

  if (
    typeof supplierId !== 'string' ||
    typeof supplierName !== 'string' ||
    typeof supplierCnpj !== 'string' ||
    typeof supplierAddress !== 'string'
  ) {
    return null;
  }

  if (!supplierId.trim() || !supplierName.trim() || !supplierCnpj.trim() || !supplierAddress.trim()) {
    return null;
  }

  return {
    supplierId,
    supplierName,
    supplierCnpj,
    supplierAddress
  };
}

function readSupplierCatalog(searchParams: Record<string, string | string[] | undefined>) {
  const value = searchParams.suppliersJson;

  if (typeof value !== 'string') {
    return getDefaultSupplierCatalog();
  }

  return parseSupplierCatalog(value);
}

function readSupplierCreated(searchParams: Record<string, string | string[] | undefined>) {
  return searchParams.supplierCreated === '1';
}

function formatMaintenanceAssetName(value: string) {
  return value.replace(/^yacht(?:\s*-\s*|\s+)/i, '').trim();
}

function resolveMaintenanceSubstatusLabel(substatus: string | undefined) {
  if (!substatus) {
    return 'Não informado';
  }

  return (
    maintenanceKanbanSubstatusDefinitions.find((item) => item.key === substatus)?.label ??
    'Não informado'
  );
}

function resolveMaintenanceUserLabel(
  ticketSummary: { openedBy?: string },
  ticketDetail: { openedBy?: string } | null
) {
  return ticketSummary.openedBy?.trim() || ticketDetail?.openedBy?.trim() || 'Não informado';
}

const maintenanceSystemOptions: MaintenanceSystem[] = [
  'electrical',
  'hydraulic',
  'mechanical',
  'metalwork',
  'upholstery',
  'painting',
  'equipment',
  'electronics',
  'automation',
  'image_sound',
  'other'
];

const maintenanceUrgencyOptions: MaintenanceUrgency[] = ['low', 'medium', 'high', 'critical'];
