'use client';
import {
  useEffect,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type PointerEvent as ReactPointerEvent
} from 'react';

import { HorizontalScrollSurface } from '../../../components/horizontal-scroll-surface';
import { Badge } from '../../../components/portal-ui';
import {
  buildMaintenanceKanbanColumns,
  isMaintenanceKanbanSubstatusCompatible,
  maintenanceKanbanSubstatusDefinitions,
  type MaintenanceKanbanColumn,
  type MaintenanceKanbanSubstatus,
  type MaintenanceStatus,
  type MaintenanceTicketRecord
} from '../../../lib/portal-model';
import { transitionMaintenanceTicketAction } from '../operations-actions';

type MaintenanceKanbanBoardProps = {
  columns: MaintenanceKanbanColumn[];
  returnTo?: string;
};

type DragTicketPayload = {
  id: string;
  assetId: string;
  status: MaintenanceStatus;
  columnKey: MaintenanceKanbanSubstatus;
};

type PointerDragSnapshot = {
  pointerId: number;
  started: boolean;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  width: number;
  ticket: MaintenanceTicketRecord;
  payload: DragTicketPayload;
  targetColumnKey: MaintenanceKanbanSubstatus | null;
};

type DragPreviewState = {
  ticketId: string;
  reference: string;
  title: string;
  assetName: string;
  width: number;
  left: number;
  top: number;
};

const autoTransitionMap: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  pending: ['in_progress'],
  in_progress: ['payment'],
  frozen: ['in_progress'],
  payment: ['completed'],
  completed: [],
  cancelled: [],
  reopened: ['in_progress']
};

const cardDragThreshold = 6;
const scrollStep = 320;
const autoScrollThreshold = 140;
const autoScrollStep = 28;
const kanbanStorageKey = 'ops-portal-maintenance-kanban-overrides';

export function MaintenanceKanbanBoard({
  columns,
  returnTo = '/maintenance'
}: MaintenanceKanbanBoardProps) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const submitFormRef = useRef<HTMLFormElement>(null);
  const ticketIdRef = useRef<HTMLInputElement>(null);
  const assetIdRef = useRef<HTMLInputElement>(null);
  const toStatusRef = useRef<HTMLInputElement>(null);
  const kanbanSubstatusRef = useRef<HTMLInputElement>(null);
  const pointerDragRef = useRef<PointerDragSnapshot | null>(null);
  const nativeDragPayloadRef = useRef<DragTicketPayload | null>(null);
  const draggingElementRef = useRef<HTMLElement | null>(null);
  const [draggedTicketId, setDraggedTicketId] = useState<string | null>(null);
  const [dragPreview, setDragPreview] = useState<DragPreviewState | null>(null);
  const [dropColumnKey, setDropColumnKey] = useState<MaintenanceKanbanSubstatus | null>(null);
  const [columnOverrides, setColumnOverrides] = useState<
    Partial<Record<string, MaintenanceKanbanSubstatus>>
  >({});

  const baseTickets = columns.flatMap((column) => column.tickets);
  const effectiveColumns = buildMaintenanceKanbanColumns(baseTickets, columnOverrides);
  const currentColumnKeyByTicketId = new Map<string, MaintenanceKanbanSubstatus>();

  for (const column of effectiveColumns) {
    for (const ticket of column.tickets) {
      currentColumnKeyByTicketId.set(ticket.id, column.key);
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const storedValue = window.localStorage.getItem(kanbanStorageKey);
      if (!storedValue) {
        return;
      }

      const parsedValue = JSON.parse(storedValue) as Partial<
        Record<string, MaintenanceKanbanSubstatus>
      >;
      const sanitizedValue = sanitizeKanbanOverrides(parsedValue, baseTickets);
      setColumnOverrides(sanitizedValue);
    } catch {
      window.localStorage.removeItem(kanbanStorageKey);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const sanitizedValue = sanitizeKanbanOverrides(columnOverrides, baseTickets);
    window.localStorage.setItem(kanbanStorageKey, JSON.stringify(sanitizedValue));
  }, [baseTickets, columnOverrides]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    document.body.classList.toggle('kanban-body--dragging', dragPreview !== null);

    return () => {
      document.body.classList.remove('kanban-body--dragging');
    };
  }, [dragPreview]);

  const handleWindowPointerMove = (event: PointerEvent) => {
    const dragSnapshot = pointerDragRef.current;
    if (!dragSnapshot || dragSnapshot.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();

    const deltaX = event.clientX - dragSnapshot.startX;
    const deltaY = event.clientY - dragSnapshot.startY;

    if (!dragSnapshot.started && Math.hypot(deltaX, deltaY) < cardDragThreshold) {
      return;
    }

    if (!dragSnapshot.started) {
      dragSnapshot.started = true;
    }

    maybeAutoScrollSurface(event.clientX, surfaceRef.current);

    const hoveredColumnKey = resolveHoveredColumnKey(
      event.clientX,
      event.clientY,
      dragSnapshot.payload.status,
      dragSnapshot.payload.columnKey
    );

    dragSnapshot.targetColumnKey = hoveredColumnKey;
    setDropColumnKey(hoveredColumnKey);
    setDragPreview(buildDragPreview(dragSnapshot, event.clientX, event.clientY));
  };

  const handleWindowPointerEnd = (event: PointerEvent) => {
    const dragSnapshot = pointerDragRef.current;
    if (!dragSnapshot || dragSnapshot.pointerId !== event.pointerId) {
      return;
    }

    const draggingElement = draggingElementRef.current;
    if (draggingElement?.hasPointerCapture(event.pointerId)) {
      draggingElement.releasePointerCapture(event.pointerId);
    }

    draggingElementRef.current = null;
    pointerDragRef.current = null;
    setDragPreview(null);
    setDraggedTicketId(null);
    setDropColumnKey(null);

    if (!dragSnapshot.started) {
      openTicketModal(dragSnapshot.ticket.id);
      return;
    }

    if (!dragSnapshot.targetColumnKey) {
      return;
    }

    handleDroppedColumn(dragSnapshot.payload, dragSnapshot.targetColumnKey);
  };

  useEffect(() => {
    window.addEventListener('pointermove', handleWindowPointerMove, {
      passive: false
    });
    window.addEventListener('pointerup', handleWindowPointerEnd);
    window.addEventListener('pointercancel', handleWindowPointerEnd);

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerEnd);
      window.removeEventListener('pointercancel', handleWindowPointerEnd);
    };
  });

  const scrollBoard = (direction: 'left' | 'right') => {
    const surface = surfaceRef.current;
    if (!surface) {
      return;
    }

    surface.scrollBy({
      left: direction === 'left' ? -scrollStep : scrollStep,
      behavior: 'smooth'
    });
  };

  const openTicketModal = (ticketId: string) => {
    if (typeof window === 'undefined') {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.delete('mode');
    url.searchParams.set('ticketId', ticketId);
    window.location.assign(url.toString());
  };

  const handlePointerDragStart = (
    event: ReactPointerEvent<HTMLElement>,
    ticket: MaintenanceTicketRecord
  ) => {
    if (event.button !== 0 || !canDragTicket(ticket.status)) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (target?.closest('a, button, input, textarea, select')) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    const columnKey = currentColumnKeyByTicketId.get(ticket.id) ?? ticket.kanbanSubstatus;
    if (!columnKey) {
      return;
    }

    card.setPointerCapture(event.pointerId);
    draggingElementRef.current = card;

    pointerDragRef.current = {
      pointerId: event.pointerId,
      started: false,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      ticket,
      payload: {
        id: ticket.id,
        assetId: ticket.assetId,
        status: ticket.status,
        columnKey
      },
      targetColumnKey: null
    };

    setDraggedTicketId(ticket.id);
    setDropColumnKey(null);
  };

  const handleNativeDragStart = (
    event: ReactDragEvent<HTMLElement>,
    ticket: MaintenanceTicketRecord
  ) => {
    if (!canDragTicket(ticket.status)) {
      event.preventDefault();
      return;
    }

    const columnKey = currentColumnKeyByTicketId.get(ticket.id) ?? ticket.kanbanSubstatus;
    if (!columnKey) {
      event.preventDefault();
      return;
    }

    const payload: DragTicketPayload = {
      id: ticket.id,
      assetId: ticket.assetId,
      status: ticket.status,
      columnKey
    };

    nativeDragPayloadRef.current = payload;
    setDraggedTicketId(ticket.id);
    setDropColumnKey(null);

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', JSON.stringify(payload));
    }
  };

  const handleNativeDragEnd = () => {
    nativeDragPayloadRef.current = null;
    setDraggedTicketId(null);
    setDropColumnKey(null);
  };

  const handleColumnDragOver = (
    event: ReactDragEvent<HTMLElement>,
    targetColumnKey: MaintenanceKanbanSubstatus
  ) => {
    const payload = nativeDragPayloadRef.current;
    if (!payload || !canDropToColumn(payload, targetColumnKey)) {
      return;
    }

    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    setDropColumnKey(targetColumnKey);
  };

  const handleColumnDrop = (
    event: ReactDragEvent<HTMLElement>,
    targetColumnKey: MaintenanceKanbanSubstatus
  ) => {
    const payload = nativeDragPayloadRef.current;
    if (!payload || !canDropToColumn(payload, targetColumnKey)) {
      return;
    }

    event.preventDefault();
    nativeDragPayloadRef.current = null;
    setDraggedTicketId(null);
    setDropColumnKey(null);

    handleDroppedColumn(payload, targetColumnKey);
  };

  const handleDroppedColumn = (
    payload: DragTicketPayload,
    targetColumnKey: MaintenanceKanbanSubstatus
  ) => {
    if (payload.columnKey === targetColumnKey) {
      return;
    }

    const targetDefinition = maintenanceKanbanSubstatusDefinitions.find(
      (definition) => definition.key === targetColumnKey
    );

    if (!targetDefinition) {
      return;
    }

    if (
      payload.status !== targetDefinition.status &&
      !canAutoTransition(payload.status, targetDefinition.status)
    ) {
      return;
    }

    setColumnOverrides((currentValue) => ({
      ...currentValue,
      [payload.id]: targetColumnKey
    }));

    submitTransition(payload, targetDefinition.status, targetColumnKey, {
      submitForm: submitFormRef.current,
      ticketIdInput: ticketIdRef.current,
      assetIdInput: assetIdRef.current,
      toStatusInput: toStatusRef.current,
      kanbanSubstatusInput: kanbanSubstatusRef.current
    });
  };

  const handleCardClick = (ticket: MaintenanceTicketRecord) => {
    if (canDragTicket(ticket.status)) {
      return;
    }

    openTicketModal(ticket.id);
  };

  return (
    <>
      <div className="kanban-board-shell">
        <div className="kanban-board-head">
          <div className="kanban-board-head__copy">
            <span className="kanban-board-head__eyebrow">Quadro operacional</span>
            <strong>Kanban de chamados</strong>
            <p>Arraste os cards entre substatus ou use a rolagem lateral do quadro</p>
          </div>

          <div className="kanban-board-head__actions">
            <Badge
              label={`${effectiveColumns.reduce((total, column) => total + column.count, 0)} chamados`}
              tone="default"
            />
            <button
              type="button"
              className="action-button action-button--ghost"
              onClick={() => scrollBoard('left')}
              aria-label="Rolar quadro para a esquerda"
            >
              &lt;
            </button>
            <button
              type="button"
              className="action-button action-button--ghost"
              onClick={() => scrollBoard('right')}
              aria-label="Rolar quadro para a direita"
            >
              &gt;
            </button>
          </div>
        </div>

        <form ref={submitFormRef} action={transitionMaintenanceTicketAction} className="sr-only">
          <input ref={ticketIdRef} name="ticketId" type="hidden" />
          <input ref={assetIdRef} name="assetId" type="hidden" />
          <input ref={toStatusRef} name="toStatus" type="hidden" />
          <input ref={kanbanSubstatusRef} name="kanbanSubstatus" type="hidden" />
          <input name="returnTo" type="hidden" value={returnTo} />
        </form>

        <div className="kanban-frame">
          <HorizontalScrollSurface
            className="kanban-surface"
            ariaLabel="Kanban de manutenção"
            surfaceRef={surfaceRef}
          >
            <div ref={boardRef} className="kanban-board">
              {effectiveColumns.map((column) => (
                <section
                  key={column.key}
                  className={resolveColumnClassName(column.key, dropColumnKey)}
                  data-kanban-column-key={column.key}
                  data-kanban-status={column.status}
                  onDragOver={(event) => handleColumnDragOver(event, column.key)}
                  onDrop={(event) => handleColumnDrop(event, column.key)}
                >
                  <div className="kanban-column__header">
                    <div className="kanban-column__eyebrow">
                      <span
                        className={`kanban-column__status-dot kanban-column__status-dot--${resolveKanbanTone(column.status)}`}
                        aria-hidden="true"
                      />
                      <span>{column.phaseLabel}</span>
                    </div>

                    <div className="kanban-column__title-row">
                      <strong>{column.label}</strong>
                      <span className="kanban-column__count">{column.count}</span>
                    </div>
                  </div>

                  <div className="kanban-column__list">
                    {column.tickets.length === 0 ? (
                      <div className="kanban-empty">Sem chamados neste substatus.</div>
                    ) : (
                      column.tickets.map((ticket) => (
                        <article
                          key={ticket.id}
                          data-kanban-card="true"
                          draggable={canDragTicket(ticket.status)}
                          className={resolveCardClassName(ticket.id, draggedTicketId, dragPreview)}
                          onClick={() => handleCardClick(ticket)}
                          onDragEnd={handleNativeDragEnd}
                          onDragStart={(event) => handleNativeDragStart(event, ticket)}
                          onPointerDown={(event) => handlePointerDragStart(event, ticket)}
                        >
                          <div className="kanban-card__meta">
                            <span className="kanban-card__id">{ticket.ticketNumber}</span>
                            <span className="kanban-card__drag-cue" aria-hidden="true">
                              ⋮⋮
                            </span>
                          </div>
                          <strong className="kanban-card__title">{ticket.title}</strong>

                          <div className="kanban-card__footer">
                            <span className="kanban-card__asset-label">Embarcação</span>
                            <p className="kanban-card__asset">
                              {formatMaintenanceAssetName(ticket.assetName)}
                            </p>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </section>
              ))}
            </div>
          </HorizontalScrollSurface>
        </div>
      </div>

      {dragPreview ? (
        <div
          className="kanban-drag-layer"
          style={{
            transform: `translate3d(${dragPreview.left}px, ${dragPreview.top}px, 0)`,
            width: `${dragPreview.width}px`
          }}
        >
          <div className="kanban-card kanban-card--pointer-dragging">
            <div className="kanban-card__meta">
              <span className="kanban-card__id">{dragPreview.reference}</span>
              <span className="kanban-card__drag-cue" aria-hidden="true">
                ⋮⋮
              </span>
            </div>
            <strong className="kanban-card__title">{dragPreview.title}</strong>
            <div className="kanban-card__footer">
              <span className="kanban-card__asset-label">Embarcação</span>
              <p className="kanban-card__asset">
                {formatMaintenanceAssetName(dragPreview.assetName)}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function canDragTicket(status: MaintenanceStatus) {
  return status !== 'completed' && status !== 'cancelled';
}

function canAutoTransition(fromStatus: MaintenanceStatus, toStatus: MaintenanceStatus) {
  return autoTransitionMap[fromStatus].includes(toStatus);
}

function canDropToColumn(
  payload: DragTicketPayload,
  targetColumnKey: MaintenanceKanbanSubstatus
) {
  const targetDefinition = maintenanceKanbanSubstatusDefinitions.find(
    (definition) => definition.key === targetColumnKey
  );

  if (!targetDefinition || payload.columnKey === targetColumnKey) {
    return false;
  }

  if (payload.status === targetDefinition.status) {
    return true;
  }

  return canAutoTransition(payload.status, targetDefinition.status);
}

function maybeAutoScrollSurface(clientX: number, surface: HTMLDivElement | null) {
  if (!surface) {
    return;
  }

  const bounds = surface.getBoundingClientRect();
  const distanceToLeft = clientX - bounds.left;
  const distanceToRight = bounds.right - clientX;

  if (distanceToLeft < autoScrollThreshold) {
    surface.scrollLeft -= autoScrollStep;
    return;
  }

  if (distanceToRight < autoScrollThreshold) {
    surface.scrollLeft += autoScrollStep;
  }
}

function buildDragPreview(
  dragSnapshot: PointerDragSnapshot,
  clientX: number,
  clientY: number
): DragPreviewState {
  return {
    ticketId: dragSnapshot.ticket.id,
    reference: dragSnapshot.ticket.ticketNumber,
    title: dragSnapshot.ticket.title,
    assetName: dragSnapshot.ticket.assetName,
    width: dragSnapshot.width,
    left: clientX - dragSnapshot.offsetX,
    top: clientY - dragSnapshot.offsetY
  };
}

function formatMaintenanceAssetName(value: string) {
  return value.replace(/^yacht(?:\s*-\s*|\s+)/i, '').trim();
}

function resolveHoveredColumnKey(
  clientX: number,
  clientY: number,
  fromStatus: MaintenanceStatus,
  currentColumnKey: MaintenanceKanbanSubstatus
): MaintenanceKanbanSubstatus | null {
  const hoveredElement = document.elementFromPoint(clientX, clientY);
  const hoveredColumn = hoveredElement?.closest<HTMLElement>('[data-kanban-column-key]');
  const hoveredColumnKey = hoveredColumn?.dataset.kanbanColumnKey as
    | MaintenanceKanbanSubstatus
    | undefined;

  if (!hoveredColumnKey) {
    return null;
  }

  const payload: DragTicketPayload = {
    id: '',
    assetId: '',
    status: fromStatus,
    columnKey: currentColumnKey
  };

  if (!canDropToColumn(payload, hoveredColumnKey)) {
    return null;
  }

  return hoveredColumnKey;
}

function resolveCardClassName(
  ticketId: string,
  draggedTicketId: string | null,
  dragPreview: DragPreviewState | null
) {
  const classes = ['kanban-card'];

  if (ticketId === draggedTicketId) {
    classes.push('kanban-card--dragging');
  }

  if (dragPreview?.ticketId === ticketId) {
    classes.push('kanban-card--placeholder');
  }

  return classes.join(' ');
}

function resolveColumnClassName(
  columnKey: MaintenanceKanbanSubstatus,
  dropColumnKey: MaintenanceKanbanSubstatus | null
) {
  if (columnKey === dropColumnKey) {
    return 'kanban-column kanban-column--drop-target';
  }

  return 'kanban-column';
}

function resolveKanbanTone(status: MaintenanceStatus) {
  switch (status) {
    case 'frozen':
      return 'critical';
    case 'payment':
    case 'reopened':
      return 'warning';
    case 'completed':
      return 'success';
    case 'in_progress':
      return 'accent';
    default:
      return 'default';
  }
}

function submitTransition(
  payload: DragTicketPayload,
  targetStatus: MaintenanceStatus,
  targetColumnKey: MaintenanceKanbanSubstatus,
  refs: {
    submitForm: HTMLFormElement | null;
    ticketIdInput: HTMLInputElement | null;
    assetIdInput: HTMLInputElement | null;
    toStatusInput: HTMLInputElement | null;
    kanbanSubstatusInput: HTMLInputElement | null;
  }
) {
  if (payload.status !== targetStatus && !canAutoTransition(payload.status, targetStatus)) {
    return;
  }

  if (
    !refs.submitForm ||
    !refs.ticketIdInput ||
    !refs.assetIdInput ||
    !refs.toStatusInput ||
    !refs.kanbanSubstatusInput
  ) {
    return;
  }

  refs.ticketIdInput.value = payload.id;
  refs.assetIdInput.value = payload.assetId;
  refs.toStatusInput.value = targetStatus;
  refs.kanbanSubstatusInput.value = targetColumnKey;
  refs.submitForm.requestSubmit();
}

function sanitizeKanbanOverrides(
  value: Partial<Record<string, MaintenanceKanbanSubstatus>>,
  tickets: MaintenanceTicketRecord[]
) {
  const sanitizedEntries = Object.entries(value).filter(([ticketId, substatus]) => {
    const ticket = tickets.find((item) => item.id === ticketId);

    return ticket && substatus && isMaintenanceKanbanSubstatusCompatible(substatus, ticket.status);
  });

  return Object.fromEntries(sanitizedEntries) as Partial<
    Record<string, MaintenanceKanbanSubstatus>
  >;
}
