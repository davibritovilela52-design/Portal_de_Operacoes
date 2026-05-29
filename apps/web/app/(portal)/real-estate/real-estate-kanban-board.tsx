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
  buildRealEstateKanbanColumns,
  isRealEstateKanbanSubstatusCompatible,
  realEstateKanbanSubstatusDefinitions,
  type RealEstateKanbanColumn,
  type RealEstateKanbanSubstatus,
  type RealEstateStatus,
  type RealEstateReportRecord
} from '../../../lib/portal-model';
import { transitionRealEstateReportAction } from '../operations-actions';

type RealEstateKanbanBoardProps = {
  columns: RealEstateKanbanColumn[];
  returnTo?: string;
};

type DragReportPayload = {
  id: string;
  assetId: string;
  status: RealEstateStatus;
  columnKey: RealEstateKanbanSubstatus;
};

type PointerDragSnapshot = {
  pointerId: number;
  started: boolean;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  width: number;
  report: RealEstateReportRecord;
  payload: DragReportPayload;
  targetColumnKey: RealEstateKanbanSubstatus | null;
};

type DragPreviewState = {
  reportId: string;
  reference: string;
  title: string;
  assetName: string;
  isBlocked: boolean;
  width: number;
  left: number;
  top: number;
};

const autoTransitionMap: Record<RealEstateStatus, RealEstateStatus[]> = {
  pending: ['in_progress'],
  in_progress: ['under_review'],
  blocked: ['in_progress'],
  under_review: ['resolved'],
  resolved: [],
  cancelled: [],
  reopened: ['in_progress']
};

const cardDragThreshold = 6;
const scrollStep = 320;
const autoScrollThreshold = 140;
const autoScrollStep = 28;
const kanbanStorageKey = 'ops-portal-real-estate-kanban-overrides';

export function RealEstateKanbanBoard({
  columns,
  returnTo = '/real-estate'
}: RealEstateKanbanBoardProps) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const submitFormRef = useRef<HTMLFormElement>(null);
  const reportIdRef = useRef<HTMLInputElement>(null);
  const assetIdRef = useRef<HTMLInputElement>(null);
  const toStatusRef = useRef<HTMLInputElement>(null);
  const kanbanSubstatusRef = useRef<HTMLInputElement>(null);
  const pointerDragRef = useRef<PointerDragSnapshot | null>(null);
  const nativeDragPayloadRef = useRef<DragReportPayload | null>(null);
  const draggingElementRef = useRef<HTMLElement | null>(null);
  const [draggedReportId, setDraggedReportId] = useState<string | null>(null);
  const [dragPreview, setDragPreview] = useState<DragPreviewState | null>(null);
  const [dropColumnKey, setDropColumnKey] = useState<RealEstateKanbanSubstatus | null>(null);
  const [columnOverrides, setColumnOverrides] = useState<
    Partial<Record<string, RealEstateKanbanSubstatus>>
  >({});

  const baseReports = columns.flatMap((column) => column.tickets);
  const effectiveColumns = buildRealEstateKanbanColumns(baseReports, columnOverrides);
  const currentColumnKeyByReportId = new Map<string, RealEstateKanbanSubstatus>();

  for (const column of effectiveColumns) {
    for (const report of column.tickets) {
      currentColumnKeyByReportId.set(report.id, column.key);
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const storedValue = window.localStorage.getItem(kanbanStorageKey);
      if (!storedValue) return;

      const parsedValue = JSON.parse(storedValue) as Partial<Record<string, RealEstateKanbanSubstatus>>;
      const sanitizedValue = sanitizeKanbanOverrides(parsedValue, baseReports);
      setColumnOverrides(sanitizedValue);
    } catch {
      window.localStorage.removeItem(kanbanStorageKey);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const sanitizedValue = sanitizeKanbanOverrides(columnOverrides, baseReports);
    window.localStorage.setItem(kanbanStorageKey, JSON.stringify(sanitizedValue));
  }, [baseReports, columnOverrides]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    document.body.classList.toggle('kanban-body--dragging', dragPreview !== null);

    return () => {
      document.body.classList.remove('kanban-body--dragging');
    };
  }, [dragPreview]);

  const handleWindowPointerMove = (event: PointerEvent) => {
    const dragSnapshot = pointerDragRef.current;
    if (!dragSnapshot || dragSnapshot.pointerId !== event.pointerId) return;

    event.preventDefault();

    const deltaX = event.clientX - dragSnapshot.startX;
    const deltaY = event.clientY - dragSnapshot.startY;

    if (!dragSnapshot.started && Math.hypot(deltaX, deltaY) < cardDragThreshold) return;

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
    if (!dragSnapshot || dragSnapshot.pointerId !== event.pointerId) return;

    const draggingElement = draggingElementRef.current;
    if (draggingElement?.hasPointerCapture(event.pointerId)) {
      draggingElement.releasePointerCapture(event.pointerId);
    }

    draggingElementRef.current = null;
    pointerDragRef.current = null;
    setDragPreview(null);
    setDraggedReportId(null);
    setDropColumnKey(null);

    if (!dragSnapshot.started) {
      openReportModal(dragSnapshot.report.id);
      return;
    }

    if (!dragSnapshot.targetColumnKey) return;

    handleDroppedColumn(dragSnapshot.payload, dragSnapshot.targetColumnKey);
  };

  useEffect(() => {
    window.addEventListener('pointermove', handleWindowPointerMove, { passive: false });
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
    if (!surface) return;

    surface.scrollBy({
      left: direction === 'left' ? -scrollStep : scrollStep,
      behavior: 'smooth'
    });
  };

  const openReportModal = (reportId: string) => {
    if (typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    url.searchParams.delete('mode');
    url.searchParams.set('reportId', reportId);
    window.location.assign(url.toString());
  };

  const handlePointerDragStart = (
    event: ReactPointerEvent<HTMLElement>,
    report: RealEstateReportRecord
  ) => {
    if (event.button !== 0 || !canDragReport(report.status)) return;

    const target = event.target as HTMLElement | null;
    if (target?.closest('a, button, input, textarea, select')) return;

    event.preventDefault();
    event.stopPropagation();

    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    const columnKey = currentColumnKeyByReportId.get(report.id) ?? report.kanbanSubstatus;
    if (!columnKey) return;

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
      report,
      payload: {
        id: report.id,
        assetId: report.assetId,
        status: report.status,
        columnKey
      },
      targetColumnKey: null
    };

    setDraggedReportId(report.id);
    setDropColumnKey(null);
  };

  const handleNativeDragStart = (
    event: ReactDragEvent<HTMLElement>,
    report: RealEstateReportRecord
  ) => {
    if (!canDragReport(report.status)) {
      event.preventDefault();
      return;
    }

    const columnKey = currentColumnKeyByReportId.get(report.id) ?? report.kanbanSubstatus;
    if (!columnKey) {
      event.preventDefault();
      return;
    }

    const payload: DragReportPayload = {
      id: report.id,
      assetId: report.assetId,
      status: report.status,
      columnKey
    };

    nativeDragPayloadRef.current = payload;
    setDraggedReportId(report.id);
    setDropColumnKey(null);

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', JSON.stringify(payload));
    }
  };

  const handleNativeDragEnd = () => {
    nativeDragPayloadRef.current = null;
    setDraggedReportId(null);
    setDropColumnKey(null);
  };

  const handleColumnDragOver = (
    event: ReactDragEvent<HTMLElement>,
    targetColumnKey: RealEstateKanbanSubstatus
  ) => {
    const payload = nativeDragPayloadRef.current;
    if (!payload || !canDropToColumn(payload, targetColumnKey)) return;

    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    setDropColumnKey(targetColumnKey);
  };

  const handleColumnDrop = (
    event: ReactDragEvent<HTMLElement>,
    targetColumnKey: RealEstateKanbanSubstatus
  ) => {
    const payload = nativeDragPayloadRef.current;
    if (!payload || !canDropToColumn(payload, targetColumnKey)) return;

    event.preventDefault();
    nativeDragPayloadRef.current = null;
    setDraggedReportId(null);
    setDropColumnKey(null);

    handleDroppedColumn(payload, targetColumnKey);
  };

  const handleDroppedColumn = (
    payload: DragReportPayload,
    targetColumnKey: RealEstateKanbanSubstatus
  ) => {
    if (payload.columnKey === targetColumnKey) return;

    const targetDefinition = realEstateKanbanSubstatusDefinitions.find(
      (definition) => definition.key === targetColumnKey
    );

    if (!targetDefinition) return;

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
      reportIdInput: reportIdRef.current,
      assetIdInput: assetIdRef.current,
      toStatusInput: toStatusRef.current,
      kanbanSubstatusInput: kanbanSubstatusRef.current
    });
  };

  const handleCardClick = (report: RealEstateReportRecord) => {
    if (canDragReport(report.status)) return;
    openReportModal(report.id);
  };

  return (
    <>
      <div className="kanban-board-shell">
        <div className="kanban-board-head">
          <div className="kanban-board-head__copy">
            <span className="kanban-board-head__eyebrow">Quadro operacional</span>
            <strong>Kanban de imóveis</strong>
            <p>Arraste os cards entre substatus ou use a rolagem lateral do quadro</p>
          </div>

          <div className="kanban-board-head__actions">
            <Badge
              label={`${effectiveColumns.reduce((total, column) => total + column.tickets.length, 0)} reportes`}
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

        <form ref={submitFormRef} action={transitionRealEstateReportAction} className="sr-only">
          <input ref={reportIdRef} name="reportId" type="hidden" />
          <input ref={assetIdRef} name="assetId" type="hidden" />
          <input ref={toStatusRef} name="toStatus" type="hidden" />
          <input ref={kanbanSubstatusRef} name="kanbanSubstatus" type="hidden" />
          <input name="returnTo" type="hidden" value={returnTo} />
        </form>

        <div className="kanban-frame">
          <HorizontalScrollSurface
            className="kanban-surface"
            ariaLabel="Kanban de real estate"
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
                        className={`kanban-column__status-dot kanban-column__status-dot--${resolveRealEstateKanbanTone(column.status)}`}
                        aria-hidden="true"
                      />
                      <span>{column.status}</span>
                    </div>

                    <div className="kanban-column__title-row">
                      <strong>{column.label}</strong>
                      <span className="kanban-column__count">{column.tickets.length}</span>
                    </div>
                  </div>

                  <div className="kanban-column__list">
                    {column.tickets.length === 0 ? (
                      <div className="kanban-empty">Sem reportes neste substatus.</div>
                    ) : (
                      column.tickets.map((report) => (
                        <article
                          key={report.id}
                          data-kanban-card="true"
                          draggable={canDragReport(report.status)}
                          className={resolveCardClassName(report.id, draggedReportId, dragPreview)}
                          onClick={() => handleCardClick(report)}
                          onDragEnd={handleNativeDragEnd}
                          onDragStart={(event) => handleNativeDragStart(event, report)}
                          onPointerDown={(event) => handlePointerDragStart(event, report)}
                        >
                          <div className="kanban-card__meta">
                            <span className="kanban-card__id">{report.reportNumber}</span>
                            {report.status === 'blocked' ? (
                              <span className="kanban-card__aog-badge">BLQ</span>
                            ) : (
                              <span className="kanban-card__drag-cue" aria-hidden="true">⋮⋮</span>
                            )}
                          </div>
                          <strong className="kanban-card__title">{report.title}</strong>

                          <div className="kanban-card__footer">
                            <span className="kanban-card__asset-label">Imóvel</span>
                            <p className="kanban-card__asset">{report.assetName}</p>
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
              {dragPreview.isBlocked ? (
                <span className="kanban-card__aog-badge">BLQ</span>
              ) : (
                <span className="kanban-card__drag-cue" aria-hidden="true">⋮⋮</span>
              )}
            </div>
            <strong className="kanban-card__title">{dragPreview.title}</strong>
            <div className="kanban-card__footer">
              <span className="kanban-card__asset-label">Imóvel</span>
              <p className="kanban-card__asset">{dragPreview.assetName}</p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function canDragReport(status: RealEstateStatus) {
  return status !== 'resolved' && status !== 'cancelled';
}

function canAutoTransition(fromStatus: RealEstateStatus, toStatus: RealEstateStatus) {
  return autoTransitionMap[fromStatus].includes(toStatus);
}

function canDropToColumn(payload: DragReportPayload, targetColumnKey: RealEstateKanbanSubstatus) {
  const targetDefinition = realEstateKanbanSubstatusDefinitions.find(
    (definition) => definition.key === targetColumnKey
  );

  if (!targetDefinition || payload.columnKey === targetColumnKey) return false;

  if (payload.status === targetDefinition.status) return true;

  return canAutoTransition(payload.status, targetDefinition.status);
}

function maybeAutoScrollSurface(clientX: number, surface: HTMLDivElement | null) {
  if (!surface) return;

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
    reportId: dragSnapshot.report.id,
    reference: dragSnapshot.report.reportNumber,
    title: dragSnapshot.report.title,
    assetName: dragSnapshot.report.assetName,
    isBlocked: dragSnapshot.report.status === 'blocked',
    width: dragSnapshot.width,
    left: clientX - dragSnapshot.offsetX,
    top: clientY - dragSnapshot.offsetY
  };
}

function resolveHoveredColumnKey(
  clientX: number,
  clientY: number,
  fromStatus: RealEstateStatus,
  currentColumnKey: RealEstateKanbanSubstatus
): RealEstateKanbanSubstatus | null {
  const hoveredElement = document.elementFromPoint(clientX, clientY);
  const hoveredColumn = hoveredElement?.closest<HTMLElement>('[data-kanban-column-key]');
  const hoveredColumnKey = hoveredColumn?.dataset.kanbanColumnKey as
    | RealEstateKanbanSubstatus
    | undefined;

  if (!hoveredColumnKey) return null;

  const payload: DragReportPayload = {
    id: '',
    assetId: '',
    status: fromStatus,
    columnKey: currentColumnKey
  };

  if (!canDropToColumn(payload, hoveredColumnKey)) return null;

  return hoveredColumnKey;
}

function resolveCardClassName(
  reportId: string,
  draggedReportId: string | null,
  dragPreview: DragPreviewState | null
) {
  const classes = ['kanban-card'];

  if (reportId === draggedReportId) {
    classes.push('kanban-card--dragging');
  }

  if (dragPreview?.reportId === reportId) {
    classes.push('kanban-card--placeholder');
  }

  return classes.join(' ');
}

function resolveColumnClassName(
  columnKey: RealEstateKanbanSubstatus,
  dropColumnKey: RealEstateKanbanSubstatus | null
) {
  if (columnKey === dropColumnKey) {
    return 'kanban-column kanban-column--drop-target';
  }

  return 'kanban-column';
}

function resolveRealEstateKanbanTone(status: RealEstateStatus) {
  switch (status) {
    case 'blocked':
      return 'critical';
    case 'under_review':
    case 'reopened':
      return 'warning';
    case 'resolved':
      return 'success';
    case 'in_progress':
      return 'accent';
    default:
      return 'default';
  }
}

function submitTransition(
  payload: DragReportPayload,
  targetStatus: RealEstateStatus,
  targetColumnKey: RealEstateKanbanSubstatus,
  refs: {
    submitForm: HTMLFormElement | null;
    reportIdInput: HTMLInputElement | null;
    assetIdInput: HTMLInputElement | null;
    toStatusInput: HTMLInputElement | null;
    kanbanSubstatusInput: HTMLInputElement | null;
  }
) {
  if (payload.status !== targetStatus && !canAutoTransition(payload.status, targetStatus)) return;

  if (
    !refs.submitForm ||
    !refs.reportIdInput ||
    !refs.assetIdInput ||
    !refs.toStatusInput ||
    !refs.kanbanSubstatusInput
  ) {
    return;
  }

  refs.reportIdInput.value = payload.id;
  refs.assetIdInput.value = payload.assetId;
  refs.toStatusInput.value = targetStatus;
  refs.kanbanSubstatusInput.value = targetColumnKey;
  refs.submitForm.requestSubmit();
}

function sanitizeKanbanOverrides(
  value: Partial<Record<string, RealEstateKanbanSubstatus>>,
  reports: RealEstateReportRecord[]
) {
  const sanitizedEntries = Object.entries(value).filter(([reportId, substatus]) => {
    const report = reports.find((item) => item.id === reportId);
    return report && substatus && isRealEstateKanbanSubstatusCompatible(substatus, report.status);
  });

  return Object.fromEntries(sanitizedEntries) as Partial<Record<string, RealEstateKanbanSubstatus>>;
}
