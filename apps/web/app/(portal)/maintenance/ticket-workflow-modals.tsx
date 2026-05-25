import Link from 'next/link';

import { createServiceOrderAction, createSupplierAction } from '../operations-actions';
import {
  getDefaultSupplierCatalog,
  mergeSupplierCatalog,
  serializeSupplierCatalog,
  type SupplierRecord
} from './supplier-catalog';
import { TicketProgressModal } from './ticket-progress-modal';

export type TicketWorkflowModalState = 'progress' | 'service-order' | 'supplier' | null;

type TicketWorkflowBasePath = '/maintenance' | '/improvements';

type TicketWorkflowTicket = {
  ticketId: string;
  assetId: string;
  ticketNumber?: string;
  title: string;
  assetName: string;
  status: import('../../../lib/portal-model').MaintenanceStatus;
  kanbanSubstatus?: import('../../../lib/portal-model').MaintenanceKanbanSubstatus;
};

type TicketWorkflowActionButtonsProps = {
  basePath: TicketWorkflowBasePath;
  ticketId: string;
  returnTo?: string;
};

type TicketWorkflowActionModalsProps = {
  basePath: TicketWorkflowBasePath;
  modal: TicketWorkflowModalState;
  suppliers: SupplierRecord[];
  supplierDraft?: SupplierRecord | null;
  supplierCreated?: boolean;
  ticket: TicketWorkflowTicket;
  returnTo: string;
};

export function TicketWorkflowActionButtons({
  basePath,
  ticketId,
  returnTo
}: TicketWorkflowActionButtonsProps) {
  return (
    <div className="dual-action-row ticket-workflow-action-row">
      <Link
        className="action-button action-button--ghost"
        href={buildTicketWorkflowPath(basePath, ticketId, 'progress', returnTo)}
      >
        Atualizar andamento da Solicitação
      </Link>
      <Link
        className="action-button action-button--ghost"
        href={buildTicketWorkflowPath(basePath, ticketId, 'service-order', returnTo)}
      >
        Criar Ordem de Serviço
      </Link>
    </div>
  );
}

export function TicketWorkflowActionModals({
  basePath,
  modal,
  suppliers,
  supplierDraft,
  supplierCreated,
  ticket,
  returnTo
}: TicketWorkflowActionModalsProps) {
  if (modal === 'progress') {
    return <TicketProgressModal returnTo={returnTo} ticket={ticket} />;
  }

  if (modal === 'service-order') {
    const supplierCatalog = mergeSupplierCatalog(
      suppliers.length > 0 ? suppliers : getDefaultSupplierCatalog(),
      supplierDraft
    );
    const supplierReturnTo = buildTicketWorkflowPath(
      basePath,
      ticket.ticketId,
      'service-order',
      returnTo,
      {
        suppliersJson: serializeSupplierCatalog(supplierCatalog)
      }
    );
    const selectedSupplierId = supplierDraft?.supplierId ?? supplierCatalog[0]?.supplierId ?? '';

    return (
      <div className="modal-backdrop">
        <div className="modal-card modal-card--wide">
          <div className="panel-title">
            <span>Criar Ordem de Serviço</span>
            <Link className="action-button action-button--ghost" href={returnTo}>
              Fechar
            </Link>
          </div>

          <form action={createServiceOrderAction} className="action-form">
            <input name="ticketId" type="hidden" value={ticket.ticketId} />
            <input name="assetId" type="hidden" value={ticket.assetId} />
            <input name="returnTo" type="hidden" value={returnTo} />

            <div className="form-grid">
              <label className="form-field form-field--full">
                <span>Título</span>
                <input name="title" type="text" placeholder="Título da ordem de serviço" required />
              </label>

              <div className="form-grid form-grid--date-range form-field--full">
                <label className="form-field">
                  <span>Data Início Serviço</span>
                  <input name="startsAt" type="date" required />
                </label>

                <label className="form-field">
                  <span>Data Fim Serviço</span>
                  <input name="endsAt" type="date" required />
                </label>
              </div>

              <label className="form-field form-field--full">
                <span>Descrição</span>
                <textarea
                  name="description"
                  rows={4}
                  placeholder="Descreva a execução, o escopo e os cuidados operacionais."
                  required
                />
              </label>

              <label className="form-field form-field--full">
                <span>Fornecedor</span>
                <select name="supplierId" defaultValue={selectedSupplierId}>
                  {supplierCatalog.length > 0 ? (
                    supplierCatalog.map((supplier) => (
                      <option key={supplier.supplierId} value={supplier.supplierId}>
                        {supplier.supplierName}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>
                      Nenhum fornecedor cadastrado
                    </option>
                  )}
                </select>
              </label>

              {supplierDraft ? (
                supplierCreated ? (
                  <section
                    className="supplier-success-card form-field--full"
                    role="status"
                    aria-live="polite"
                  >
                    <div className="supplier-success-card__icon" aria-hidden="true">
                      ✓
                    </div>

                    <div className="supplier-success-card__body">
                      <span className="badge badge--success">Fornecedor cadastrado</span>
                      <strong>{supplierDraft.supplierName}</strong>
                      <p>O novo fornecedor já está pronto para ser vinculado na ordem de serviço.</p>

                      <div className="supplier-success-card__details">
                        <div className="supplier-success-card__detail">
                          <span>CNPJ</span>
                          <strong>{supplierDraft.supplierCnpj}</strong>
                        </div>

                        <div className="supplier-success-card__detail">
                          <span>Endereço</span>
                          <strong>{supplierDraft.supplierAddress}</strong>
                        </div>
                      </div>
                    </div>
                  </section>
                ) : (
                  <p className="form-hint form-field--full">
                    Fornecedor selecionado: {supplierDraft.supplierName} -{' '}
                    {supplierDraft.supplierCnpj}
                  </p>
                )
              ) : null}
            </div>

            <div className="dual-action-row ticket-workflow-action-row">
              <Link
                className="action-button action-button--ghost"
                href={buildTicketWorkflowPath(
                  basePath,
                  ticket.ticketId,
                  'supplier',
                  supplierReturnTo,
                  {
                    suppliersJson: serializeSupplierCatalog(supplierCatalog)
                  }
                )}
              >
                Cadastrar novo fornecedor
              </Link>
            </div>

            <div className="form-actions form-actions--end">
              <button className="action-button" type="submit">
                Criar ordem de serviço
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (modal === 'supplier') {
    const serviceOrderReturnTo = buildTicketWorkflowPath(basePath, ticket.ticketId, 'service-order', returnTo);

    return (
      <div className="modal-backdrop">
        <div className="modal-card modal-card--wide">
          <div className="panel-title">
            <span>Cadastrar novo fornecedor</span>
            <Link className="action-button action-button--ghost" href={serviceOrderReturnTo}>
              Voltar
            </Link>
          </div>

          <form action={createSupplierAction} className="action-form">
            <input name="ticketId" type="hidden" value={ticket.ticketId} />
            <input name="assetId" type="hidden" value={ticket.assetId} />
            <input name="returnTo" type="hidden" value={serviceOrderReturnTo} />
            <input name="suppliersJson" type="hidden" value={serializeSupplierCatalog(suppliers)} />

            <div className="form-grid">
              <label className="form-field form-field--full">
                <span>Nome</span>
                <input name="name" type="text" placeholder="Nome do fornecedor" required />
              </label>

              <label className="form-field">
                <span>CNPJ</span>
                <input name="cnpj" type="text" placeholder="00.000.000/0000-00" required />
              </label>

              <label className="form-field">
                <span>Endereço</span>
                <input name="address" type="text" placeholder="Endereço completo" required />
              </label>
            </div>

            <div className="form-actions form-actions--end">
              <button className="action-button" type="submit">
                Cadastrar fornecedor
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return null;
}

export function readTicketWorkflowModal(searchParams: Record<string, string | string[] | undefined>) {
  const value = searchParams.modal;

  if (value === 'progress' || value === 'service-order' || value === 'supplier') {
    return value;
  }

  return null;
}

export function buildTicketWorkflowPath(
  basePath: TicketWorkflowBasePath,
  ticketId: string,
  modal?: Exclude<TicketWorkflowModalState, null>,
  returnTo?: string,
  extraQueryParams?: Record<string, string>
) {
  const query = new URLSearchParams();

  if (ticketId) {
    query.set('ticketId', ticketId);
  }

  if (modal) {
    query.set('modal', modal);
  }

  if (returnTo) {
    query.set('returnTo', returnTo);
  }

  for (const [key, value] of Object.entries(extraQueryParams ?? {})) {
    if (value.trim()) {
      query.set(key, value);
    }
  }

  return `${basePath}?${query.toString()}`;
}
