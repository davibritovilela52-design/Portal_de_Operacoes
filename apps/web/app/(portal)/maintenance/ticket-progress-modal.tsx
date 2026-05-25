"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { updateMaintenanceTicketProgressAction } from '../operations-actions';
import {
  maintenanceKanbanSubstatusDefinitions,
  maintenanceStatusLabels,
  type MaintenanceKanbanSubstatus,
  type MaintenanceStatus
} from '../../../lib/portal-model';

type TicketWorkflowTicket = {
  ticketId: string;
  assetId: string;
  ticketNumber?: string;
  title: string;
  assetName: string;
  status: MaintenanceStatus;
  kanbanSubstatus?: MaintenanceKanbanSubstatus;
};

type TicketProgressModalProps = {
  ticket: TicketWorkflowTicket;
  returnTo: string;
};

const workflowAssignedToOptions = [
  { value: 'supplies', label: 'Suprimentos' },
  { value: 'electrical', label: 'El\u00e9trica' },
  { value: 'hydraulic', label: 'Hidr\u00e1ulica' },
  { value: 'mechanical', label: 'Mec\u00e2nica' },
  { value: 'structural', label: 'Estrutural' },
  { value: 'vendors', label: 'Fornecedores' },
  { value: 'technical_ops', label: 'Gerente T\u00e9cnico e Opera\u00e7\u00f5es' }
] as const;

const workflowStatusOptions = [
  { value: 'pending', label: maintenanceStatusLabels.pending },
  { value: 'in_progress', label: maintenanceStatusLabels.in_progress },
  { value: 'frozen', label: maintenanceStatusLabels.frozen },
  { value: 'payment', label: maintenanceStatusLabels.payment },
  { value: 'completed', label: maintenanceStatusLabels.completed },
  { value: 'cancelled', label: maintenanceStatusLabels.cancelled },
  { value: 'reopened', label: maintenanceStatusLabels.reopened }
] as const;

export function getMaintenanceProgressSubstatusOptions(status: MaintenanceStatus) {
  const compatibleStatus = status === 'reopened' ? 'in_progress' : status;
  return maintenanceKanbanSubstatusDefinitions.filter(
    (definition) => definition.status === compatibleStatus
  );
}

export function TicketProgressModal({ ticket, returnTo }: TicketProgressModalProps) {
  const [status, setStatus] = useState<MaintenanceStatus>(ticket.status);
  const substatusOptions = useMemo(() => getMaintenanceProgressSubstatusOptions(status), [status]);
  const [substatus, setSubstatus] = useState<MaintenanceKanbanSubstatus | ''>(
    ticket.kanbanSubstatus ?? getMaintenanceProgressSubstatusOptions(ticket.status)[0]?.key ?? ''
  );

  useEffect(() => {
    setStatus(ticket.status);
    setSubstatus(
      ticket.kanbanSubstatus ?? getMaintenanceProgressSubstatusOptions(ticket.status)[0]?.key ?? ''
    );
  }, [ticket.kanbanSubstatus, ticket.status]);

  useEffect(() => {
    if (substatusOptions.some((option) => option.key === substatus)) {
      return;
    }

    setSubstatus(substatusOptions[0]?.key ?? '');
  }, [status, substatus, substatusOptions]);

  return (
    <div className="modal-backdrop">
      <div className="modal-card modal-card--wide">
        <div className="panel-title">
          <span>Atualizar andamento da Solicita\u00e7\u00e3o</span>
          <Link className="action-button action-button--ghost" href={returnTo}>
            Fechar
          </Link>
        </div>

        <form action={updateMaintenanceTicketProgressAction} className="action-form">
          <input name="ticketId" type="hidden" value={ticket.ticketId} />
          <input name="assetId" type="hidden" value={ticket.assetId} />
          <input name="returnTo" type="hidden" value={returnTo} />
          <div className="form-grid">
            <label className="form-field">
              <span>Status</span>
              <select
                name="status"
                required
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as MaintenanceStatus);
                }}
              >
                {workflowStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>SubStatus</span>
              <select
                name="substatus"
                required
                value={substatus}
                onChange={(event) => {
                  setSubstatus(event.target.value as MaintenanceKanbanSubstatus);
                }}
              >
                {substatusOptions.map((definition) => (
                  <option key={definition.key} value={definition.key}>
                    {definition.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field form-field--full">
              <span>Atribu\u00eddo</span>
              <select name="assignedTo" defaultValue="technical_ops" required>
                {workflowAssignedToOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="form-actions form-actions--end">
            <button className="action-button" type="submit">
              Atualizar andamento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
