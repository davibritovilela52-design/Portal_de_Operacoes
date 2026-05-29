import Link from 'next/link';
import type { CSSProperties } from 'react';

import { PageHeader, Panel } from '../../../../components/portal-ui';
import { fetchRealEstateAgendaSnapshot } from '../../../../lib/portal-api';
import {
  buildAgendaAssetColorThemeMap,
  resolveAgendaEventColorTheme,
  resolveAgendaEventEmphasis,
  type AgendaEventEmphasis
} from '../../../../lib/agenda-event-theme';
import {
  agendaEventLabels,
  filterAgendaEventsByAsset,
  type AgendaEventRecord
} from '../../../../lib/portal-model';
import { requirePortalSession } from '../../../../lib/portal-session';
import {
  deleteAgendaEventAction,
  rescheduleAgendaEventAction,
  scheduleAgendaEventAction
} from '../../operations-actions';
import { RealEstateAgendaAssetFilterForm } from './real-estate-agenda-asset-filter-form';

const defaultAgendaCalendarYear = 2026;
const defaultAgendaCalendarMonthIndex = 4;
const weekLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'] as const;
const AGENDA_BASE_PATH = '/real-estate/agenda';

type CalendarEventStyle = CSSProperties & {
  '--calendar-event-accent': string;
  '--calendar-event-border': string;
  '--calendar-event-border-hover': string;
  '--calendar-event-surface': string;
  '--calendar-event-surface-hover': string;
  '--calendar-event-ink': string;
  '--calendar-event-subtitle': string;
};

type AgendaMonthCursor = {
  year: number;
  monthIndex: number;
  monthKey: string;
  startDate: Date;
};

type RealEstateAgendaPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RealEstateAgendaPage({ searchParams }: RealEstateAgendaPageProps) {
  const session = await requirePortalSession();
  const [{ agendaEvents, fleetAssets }, resolvedSearchParams] = await Promise.all([
    fetchRealEstateAgendaSnapshot({
      tenantId: session.actor.tenantId,
      actor: session.actor,
      sessionToken: session.token
    }),
    searchParams ?? Promise.resolve({})
  ]);
  const notice = readSearchMessage(resolvedSearchParams, 'notice');
  const error = readSearchMessage(resolvedSearchParams, 'error');
  const mode = readAgendaMode(resolvedSearchParams);
  const editIntent = readAgendaEditIntent(resolvedSearchParams);
  const deleteConfirmationRequested = readAgendaDeleteConfirmation(resolvedSearchParams);
  const monthCursor = readAgendaMonthCursor(resolvedSearchParams);
  const monthQuery = formatAgendaMonthQuery(monthCursor);
  const selectedAssetId = readAgendaAssetId(resolvedSearchParams, fleetAssets);
  const selectedEventId = readAgendaEventId(resolvedSearchParams);
  const visibleAgendaEvents = filterAgendaEventsByAsset(agendaEvents, selectedAssetId);
  const selectedEvent = visibleAgendaEvents.find((event) => event.id === selectedEventId) ?? null;
  const isEditingSelectedEvent = mode === 'edit' && selectedEvent !== null && editIntent === 'edit';
  const isConfirmingDelete = mode === 'edit' && selectedEvent !== null && deleteConfirmationRequested;
  const canChooseCreateAsset = session.actor.role !== 'asset_field_team';
  const defaultCreateAssetId =
    selectedAssetId ??
    (session.actor.role === 'asset_field_team'
      ? session.actor.assetIds[0] ?? fleetAssets[0]?.id
      : fleetAssets[0]?.id);
  const defaultCreateAsset = defaultCreateAssetId
    ? fleetAssets.find((asset) => asset.id === defaultCreateAssetId) ?? null
    : null;
  const agendaAssetThemes = buildAgendaAssetColorThemeMap(fleetAssets.map((asset) => asset.id));
  const buildAgendaViewHref = (
    cursor: AgendaMonthCursor = monthCursor,
    options: {
      mode?: 'create' | 'edit';
      eventId?: string;
      intent?: 'edit';
      confirmDelete?: boolean;
      assetId?: string;
    } = {}
  ) =>
    buildAgendaHref(cursor, {
      assetId: selectedAssetId,
      ...options
    });
  const agendaHomeHref = buildAgendaViewHref();
  const calendarCells = buildCalendarCells(visibleAgendaEvents, monthCursor);
  const calendarWeeks = chunkCalendarCells(calendarCells, 7);
  const monthLabel = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(monthCursor.startDate);
  const previousMonthHref = buildAgendaViewHref(shiftAgendaMonth(monthCursor, -1));
  const nextMonthHref = buildAgendaViewHref(shiftAgendaMonth(monthCursor, 1));

  return (
    <div className="page">
      <PageHeader
        title="Agenda"
        actions={
          <Link className="action-button" href={buildAgendaViewHref(monthCursor, { mode: 'create' })}>
            Criar evento
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
        <div className="agenda-calendar-chrome">
          <div className="agenda-calendar-nav agenda-calendar-nav--header" aria-label="Navegacao entre meses">
            <Link
              aria-label="Mes anterior"
              className="action-button action-button--ghost agenda-calendar-nav__arrow"
              href={previousMonthHref}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
                <path d="M14.5 6.5 9 12l5.5 5.5" />
              </svg>
            </Link>
            <strong className="agenda-calendar-nav__label">{monthLabel}</strong>
            <Link
              aria-label="Proximo mes"
              className="action-button action-button--ghost agenda-calendar-nav__arrow"
              href={nextMonthHref}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
                <path d="m9.5 6.5 5.5 5.5-5.5 5.5" />
              </svg>
            </Link>
          </div>

          <div className="agenda-calendar-toolbar">
            <RealEstateAgendaAssetFilterForm
              assets={fleetAssets.map((asset) => ({
                id: asset.id,
                label: asset.name
              }))}
              monthQuery={monthQuery}
              selectedAssetId={selectedAssetId ?? null}
            />
          </div>
        </div>

        <div className="calendar-shell">
          <div className="table-wrap">
            <div className="calendar-grid calendar-grid--labels">
              {weekLabels.map((label) => (
                <div key={label} className="calendar-weekday">
                  {label}
                </div>
              ))}
            </div>
            <div className="calendar-weeks">
              {calendarWeeks.map((week) => {
                const weekEvents = buildWeekCalendarEventSegments(visibleAgendaEvents, week);
                const weekEventLanes = buildWeekCalendarEventLanes(weekEvents);

                return (
                  <div key={week[0]?.key ?? 'week'} className="calendar-week">
                    <div className="calendar-week-days">
                      {week.map((cell) => (
                        <div
                          key={cell.key}
                          className={cell.inMonth ? 'calendar-week-day' : 'calendar-week-day calendar-week-day--outside'}
                        >
                          <div className="calendar-day-number">{cell.dayLabel}</div>
                        </div>
                      ))}
                    </div>

                    <div className="calendar-week-event-lanes">
                      {weekEventLanes.length === 0 ? (
                        <div className="calendar-week-event-lane calendar-week-event-lane--empty" aria-hidden="true" />
                      ) : (
                        weekEventLanes.map((lane, laneIndex) => (
                          <div
                            key={`${week[0]?.key ?? 'week'}-lane-${laneIndex}`}
                            className="calendar-week-event-lane"
                          >
                            {lane.map((segment) => {
                              const presentation = buildCalendarEventPresentation(
                                segment.event,
                                agendaAssetThemes
                              );
                              const spanColumns = `${segment.startColumn} / ${segment.endColumn + 1}`;

                              return (
                                <Link
                                  key={`${segment.weekKey}-${segment.event.id}-${segment.startColumn}-${segment.endColumn}`}
                                  href={buildAgendaViewHref(monthCursor, {
                                    mode: 'edit',
                                    eventId: segment.event.id
                                  })}
                                  className={`${presentation.className} calendar-event-chip--multi-day`}
                                  style={{
                                    ...presentation.style,
                                    gridColumn: spanColumns
                                  }}
                                >
                                  <strong>{segment.event.title}</strong>
                                  <span>{segment.event.assetName}</span>
                                </Link>
                              );
                            })}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Panel>

      {mode === 'create' ? (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="panel-title">
              <span>Novo evento</span>
            </div>

            <form action={scheduleAgendaEventAction} className="action-form">
              <input name="actorRole" type="hidden" value={session.actor.role} />
              <input name="calendarMonth" type="hidden" value={monthQuery} />
              <input name="agendaBasePath" type="hidden" value={AGENDA_BASE_PATH} />
              {selectedAssetId ? (
                <input name="filterAssetId" type="hidden" value={selectedAssetId} />
              ) : null}
              <input name="operator" type="hidden" value={session.operatorLabel} />
              {!canChooseCreateAsset && defaultCreateAssetId ? (
                <input name="assetId" type="hidden" value={defaultCreateAssetId} />
              ) : null}

              <div className="form-grid">
                <label className="form-field form-field--full">
                  <span>Tipo de evento</span>
                  <select name="type" defaultValue="utilization">
                    {buildAgendaTypeOptions().map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                {canChooseCreateAsset ? (
                  <label className="form-field form-field--full">
                    <span>Imóvel</span>
                    <select name="assetId" defaultValue={defaultCreateAssetId}>
                      {fleetAssets.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <div className="form-field form-field--full">
                    <span>Imóvel</span>
                    <div className="form-value">
                      {defaultCreateAsset ? defaultCreateAsset.name : 'Imóvel não informado'}
                    </div>
                  </div>
                )}

                <div className="form-grid form-grid--date-range form-field--full">
                  <label className="form-field">
                    <span>Data de início</span>
                    <input name="startsAt" type="datetime-local" required />
                  </label>

                  <label className="form-field">
                    <span>Data de fim</span>
                    <input name="endsAt" type="datetime-local" required />
                  </label>
                </div>

                <label className="form-field form-field--full">
                  <span>Descrição</span>
                  <textarea
                    name="description"
                    rows={4}
                    placeholder="Descreva o evento operacional ou bloqueio."
                    required
                  />
                </label>
              </div>

              <div className="form-actions">
                <Link className="action-button action-button--ghost" href={agendaHomeHref}>
                  Cancelar
                </Link>
                <button className="action-button" type="submit">
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {mode === 'edit' ? (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="panel-title">
              <span>{isEditingSelectedEvent ? 'Editar evento' : 'Evento agendado'}</span>
              <Link className="action-button action-button--ghost" href={agendaHomeHref}>
                Fechar
              </Link>
            </div>

            {selectedEvent ? (
              isEditingSelectedEvent ? (
                <form action={rescheduleAgendaEventAction} className="action-form">
                  <input name="actorRole" type="hidden" value={session.actor.role} />
                  <input name="calendarMonth" type="hidden" value={monthQuery} />
                  <input name="agendaBasePath" type="hidden" value={AGENDA_BASE_PATH} />
                  {selectedAssetId ? (
                    <input name="filterAssetId" type="hidden" value={selectedAssetId} />
                  ) : null}
                  <input name="operator" type="hidden" value={session.operatorLabel} />
                  <input
                    name="eventSnapshot"
                    type="hidden"
                    value={buildEventSnapshotValue(selectedEvent)}
                  />

                  <div className="form-grid">
                    <label className="form-field form-field--full">
                      <span>Tipo de evento</span>
                      <select name="type" defaultValue={selectedEvent.type}>
                        {buildAgendaTypeOptions().map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    {canChooseCreateAsset ? (
                      <label className="form-field form-field--full">
                        <span>Imóvel</span>
                        <select name="assetId" defaultValue={selectedEvent.assetId}>
                          {fleetAssets.map((asset) => (
                            <option key={asset.id} value={asset.id}>
                              {asset.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <div className="form-field form-field--full">
                        <span>Imóvel</span>
                        <div className="form-value">{selectedEvent.assetName}</div>
                        <input name="assetId" type="hidden" value={selectedEvent.assetId} />
                      </div>
                    )}

                    <div className="form-grid form-grid--date-range form-field--full">
                      <label className="form-field">
                        <span>Data de início</span>
                        <input
                          name="rescheduleStartsAt"
                          type="datetime-local"
                          defaultValue={toDateTimeLocalValue(selectedEvent.startsAt)}
                          required
                        />
                      </label>

                      <label className="form-field">
                        <span>Data de fim</span>
                        <input
                          name="rescheduleEndsAt"
                          type="datetime-local"
                          defaultValue={toDateTimeLocalValue(selectedEvent.endsAt)}
                          required
                        />
                      </label>
                    </div>

                    <label className="form-field form-field--full">
                      <span>Descrição</span>
                      <textarea
                        name="description"
                        rows={4}
                        defaultValue={selectedEvent.description ?? ''}
                        placeholder="Descreva o evento operacional ou bloqueio."
                        required
                      />
                    </label>
                  </div>

                  <div className="form-actions">
                    <Link
                      className="action-button action-button--ghost"
                      href={buildAgendaViewHref(monthCursor, {
                        mode: 'edit',
                        eventId: selectedEvent.id
                      })}
                    >
                      Cancelar
                    </Link>
                    <button className="action-button" type="submit">
                      Salvar
                    </button>
                  </div>
                </form>
              ) : (
                <div className="action-form">
                  <div className="form-grid">
                    <div className="form-field">
                      <span>Tipo de evento</span>
                      <div className="form-value">{agendaEventLabels[selectedEvent.type]}</div>
                    </div>

                    <div className="form-field">
                      <span>Imóvel</span>
                      <div className="form-value">{selectedEvent.assetName}</div>
                    </div>

                    <div className="form-field">
                      <span>Data de início</span>
                      <div className="form-value">{formatAgendaDateTime(selectedEvent.startsAt)}</div>
                    </div>

                    <div className="form-field">
                      <span>Data de fim</span>
                      <div className="form-value">{formatAgendaDateTime(selectedEvent.endsAt)}</div>
                    </div>

                    <div className="form-field form-field--full">
                      <span>Descrição</span>
                      <div className="form-value form-value--multiline">
                        {selectedEvent.description?.trim() || 'Sem descrição informada.'}
                      </div>
                    </div>
                  </div>

                  <div className="form-actions">
                    <Link
                      className="action-button"
                      href={buildAgendaViewHref(monthCursor, {
                        mode: 'edit',
                        eventId: selectedEvent.id,
                        intent: 'edit'
                      })}
                    >
                      Editar
                    </Link>
                    <Link
                      className="action-button action-button--ghost"
                      href={buildAgendaViewHref(monthCursor, {
                        mode: 'edit',
                        eventId: selectedEvent.id,
                        confirmDelete: true
                      })}
                    >
                      Excluir
                    </Link>
                  </div>
                </div>
              )
            ) : (
              <div className="signal-list">
                <article className="signal-item">
                  <h3 className="signal-item__title">Evento não encontrado</h3>
                  <p>Selecione um evento válido no calendário para abrir o detalhamento.</p>
                </article>
              </div>
            )}

            {isConfirmingDelete ? (
              <div className="modal-inline-confirmation" role="dialog" aria-modal="true">
                <div className="modal-inline-confirmation__card">
                  <strong>Deseja mesmo excluir este evento?</strong>
                  <p>Essa ação remove o evento do calendário do imóvel selecionado.</p>
                  <div className="form-actions">
                    <Link
                      className="action-button action-button--ghost"
                      href={buildAgendaViewHref(monthCursor, {
                        mode: 'edit',
                        eventId: selectedEvent.id
                      })}
                    >
                      Cancelar
                    </Link>
                    <form action={deleteAgendaEventAction}>
                      <input name="actorRole" type="hidden" value={session.actor.role} />
                      <input name="calendarMonth" type="hidden" value={monthQuery} />
                      <input name="agendaBasePath" type="hidden" value={AGENDA_BASE_PATH} />
                      {selectedAssetId ? (
                        <input name="filterAssetId" type="hidden" value={selectedAssetId} />
                      ) : null}
                      <input name="operator" type="hidden" value={session.operatorLabel} />
                      <input name="eventId" type="hidden" value={selectedEvent.id} />
                      <input name="assetId" type="hidden" value={selectedEvent.assetId} />
                      <button className="action-button" type="submit">
                        Sim, excluir
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function buildCalendarCells(events: AgendaEventRecord[], monthCursor: AgendaMonthCursor) {
  const eventIndex = new Map<string, AgendaEventRecord[]>();
  const firstDayOfMonth = monthCursor.startDate;
  const daysInMonth = new Date(Date.UTC(monthCursor.year, monthCursor.monthIndex + 1, 0, 12)).getUTCDate();
  const monthStartKey = toUtcDateKey(firstDayOfMonth);
  const monthEndKey = toUtcDateKey(new Date(Date.UTC(monthCursor.year, monthCursor.monthIndex, daysInMonth, 12)));

  for (const event of events) {
    const eventStart = new Date(event.startsAt);
    const eventEnd = new Date(event.endsAt);

    if (Number.isNaN(eventStart.getTime()) || Number.isNaN(eventEnd.getTime())) continue;

    const eventStartKey = toUtcDateKey(eventStart);
    const eventEndKey = toUtcDateKey(eventEnd);
    const rangeStartKey = eventStartKey < monthStartKey ? monthStartKey : eventStartKey;
    const rangeEndKey = eventEndKey > monthEndKey ? monthEndKey : eventEndKey;

    if (rangeEndKey < rangeStartKey) continue;

    const current = createUtcNoonDateFromKey(rangeStartKey);
    const rangeEndDate = createUtcNoonDateFromKey(rangeEndKey);

    while (current <= rangeEndDate) {
      const dateKey = toUtcDateKey(current);
      const dayEvents = eventIndex.get(dateKey) ?? [];

      dayEvents.push(event);
      dayEvents.sort((l, r) => {
        const delta = Date.parse(l.startsAt) - Date.parse(r.startsAt);
        return delta !== 0 ? delta : l.title.localeCompare(r.title, 'pt-BR');
      });
      eventIndex.set(dateKey, dayEvents);
      current.setUTCDate(current.getUTCDate() + 1);
    }
  }

  const startOffset = (firstDayOfMonth.getUTCDay() + 6) % 7;
  const cells: Array<{
    key: string;
    inMonth: boolean;
    dayLabel: string;
    events: AgendaEventRecord[];
    date: Date;
  }> = [];

  for (let i = 0; i < startOffset; i++) {
    const date = new Date(Date.UTC(monthCursor.year, monthCursor.monthIndex, 1 - startOffset + i, 12));
    cells.push({ key: `outside-start-${i}`, inMonth: false, dayLabel: '', events: [], date });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(Date.UTC(monthCursor.year, monthCursor.monthIndex, day, 12));
    const key = toUtcDateKey(date);
    cells.push({ key, inMonth: true, dayLabel: String(day), events: eventIndex.get(key) ?? [], date });
  }

  while (cells.length % 7 !== 0) {
    const trailingIndex = cells.length - (startOffset + daysInMonth) + 1;
    const date = new Date(Date.UTC(monthCursor.year, monthCursor.monthIndex, daysInMonth + trailingIndex, 12));
    cells.push({ key: `outside-end-${cells.length}`, inMonth: false, dayLabel: '', events: [], date });
  }

  return cells;
}

function chunkCalendarCells(
  cells: Array<{ key: string; inMonth: boolean; dayLabel: string; events: AgendaEventRecord[]; date: Date }>,
  size: number
) {
  const weeks: typeof cells[] = [];
  for (let i = 0; i < cells.length; i += size) weeks.push(cells.slice(i, i + size));
  return weeks;
}

function buildWeekCalendarEventSegments(
  events: AgendaEventRecord[],
  week: Array<{ key: string; inMonth: boolean; dayLabel: string; events: AgendaEventRecord[]; date: Date }>
) {
  const weekStart = week[0]?.date;
  const weekEnd = week[week.length - 1]?.date;
  if (!weekStart || !weekEnd) return [];

  const weekStartTime = weekStart.getTime();
  const weekEndTime = weekEnd.getTime();
  const segments: Array<{ event: AgendaEventRecord; startColumn: number; endColumn: number; weekKey: string }> = [];

  for (const event of events) {
    const eventStart = new Date(event.startsAt);
    const eventEnd = new Date(event.endsAt);
    if (Number.isNaN(eventStart.getTime()) || Number.isNaN(eventEnd.getTime())) continue;

    const eventStartTime = normalizeUtcNoon(eventStart).getTime();
    const eventEndTime = normalizeUtcNoon(eventEnd).getTime();
    const overlapStartTime = Math.max(eventStartTime, weekStartTime);
    const overlapEndTime = Math.min(eventEndTime, weekEndTime);
    if (overlapEndTime < overlapStartTime) continue;

    segments.push({
      event,
      startColumn: differenceInUtcCalendarDays(weekStartTime, overlapStartTime) + 1,
      endColumn: differenceInUtcCalendarDays(weekStartTime, overlapEndTime) + 1,
      weekKey: weekStart.toISOString().slice(0, 10)
    });
  }

  segments.sort((l, r) => {
    const delta = Date.parse(l.event.startsAt) - Date.parse(r.event.startsAt);
    return delta !== 0 ? delta : l.event.title.localeCompare(r.event.title, 'pt-BR');
  });

  return segments;
}

function buildWeekCalendarEventLanes(
  segments: Array<{ event: AgendaEventRecord; startColumn: number; endColumn: number; weekKey: string }>
) {
  const sorted = [...segments].sort((l, r) => {
    if (l.startColumn !== r.startColumn) return l.startColumn - r.startColumn;
    if (l.endColumn !== r.endColumn) return r.endColumn - l.endColumn;
    const delta = Date.parse(l.event.startsAt) - Date.parse(r.event.startsAt);
    return delta !== 0 ? delta : l.event.title.localeCompare(r.event.title, 'pt-BR');
  });
  const lanes: typeof segments[] = [];

  for (const segment of sorted) {
    let targetLane = lanes.findIndex((lane) => {
      const last = lane[lane.length - 1];
      return Boolean(last && last.endColumn < segment.startColumn);
    });
    if (targetLane === -1) { targetLane = lanes.length; lanes.push([]); }
    lanes[targetLane].push(segment);
  }

  return lanes;
}

function buildCalendarEventPresentation(
  event: AgendaEventRecord,
  assetThemes: Map<string, ReturnType<typeof resolveAgendaEventColorTheme>>
): { className: string; style: CalendarEventStyle } {
  const theme = assetThemes.get(event.assetId) ?? resolveAgendaEventColorTheme(event.assetId);
  const emphasis = resolveAgendaEventEmphasis(event);
  return { className: buildCalendarEventClassName(emphasis), style: buildAgendaThemeStyle(theme) };
}

function buildAgendaThemeStyle(theme: ReturnType<typeof resolveAgendaEventColorTheme>): CalendarEventStyle {
  return {
    '--calendar-event-accent': theme.accent,
    '--calendar-event-border': theme.border,
    '--calendar-event-border-hover': theme.borderHover,
    '--calendar-event-surface': theme.surface,
    '--calendar-event-surface-hover': theme.surfaceHover,
    '--calendar-event-ink': theme.title,
    '--calendar-event-subtitle': theme.subtitle
  };
}

function buildCalendarEventClassName(emphasis: AgendaEventEmphasis) {
  const base = 'calendar-event-chip calendar-event-link';
  if (emphasis === 'critical') return `${base} calendar-event-chip--critical`;
  if (emphasis === 'warning') return `${base} calendar-event-chip--warning`;
  return base;
}

function buildAgendaTypeOptions() {
  return [
    { value: 'utilization', label: agendaEventLabels.utilization },
    { value: 'planned_maintenance', label: agendaEventLabels.planned_maintenance },
    { value: 'emergency_maintenance', label: agendaEventLabels.emergency_maintenance },
    { value: 'operational_block', label: agendaEventLabels.operational_block },
    { value: 'crew_rest', label: agendaEventLabels.crew_rest }
  ] as const;
}

function buildEventSnapshotValue(event: AgendaEventRecord) {
  return JSON.stringify({
    id: event.id,
    assetId: event.assetId,
    type: event.type,
    safeMinimumBreached: event.safeMinimumBreached ?? false,
    provisional: event.provisional ?? false,
    validatedAt: event.validatedAt ?? null
  });
}

function readSearchMessage(params: Record<string, string | string[] | undefined>, key: 'notice' | 'error') {
  const value = params[key];
  return typeof value === 'string' ? value : undefined;
}

function readAgendaMode(params: Record<string, string | string[] | undefined>) {
  const value = params.mode;
  return value === 'create' || value === 'edit' ? value : undefined;
}

function readAgendaEventId(params: Record<string, string | string[] | undefined>) {
  const value = params.eventId;
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function readAgendaAssetId(
  params: Record<string, string | string[] | undefined>,
  fleetAssets: Array<{ id: string }>
) {
  const value = params.assetId;
  if (typeof value !== 'string' || value.trim().length === 0) return undefined;
  return fleetAssets.some((a) => a.id === value) ? value : undefined;
}

function readAgendaEditIntent(params: Record<string, string | string[] | undefined>) {
  return params.intent === 'edit' ? 'edit' : 'view';
}

function readAgendaDeleteConfirmation(params: Record<string, string | string[] | undefined>) {
  return params.confirmDelete === 'true';
}

function readAgendaMonthCursor(params: Record<string, string | string[] | undefined>) {
  const value = params.month;
  if (typeof value === 'string') {
    const match = /^(\d{4})-(\d{2})$/.exec(value.trim());
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]);
      if (Number.isInteger(year) && Number.isInteger(month) && month >= 1 && month <= 12) {
        return createAgendaMonthCursor(year, month - 1);
      }
    }
  }
  return createAgendaMonthCursor(defaultAgendaCalendarYear, defaultAgendaCalendarMonthIndex);
}

function toDateTimeLocalValue(value: string) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function toUtcDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function createUtcNoonDateFromKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function normalizeUtcNoon(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12));
}

function differenceInUtcCalendarDays(startTime: number, endTime: number) {
  return Math.round((endTime - startTime) / (24 * 60 * 60 * 1000));
}

function createAgendaMonthCursor(year: number, monthIndex: number): AgendaMonthCursor {
  const startDate = new Date(Date.UTC(year, monthIndex, 1, 12));
  return {
    year: startDate.getUTCFullYear(),
    monthIndex: startDate.getUTCMonth(),
    monthKey: formatAgendaMonthKey(startDate.getUTCFullYear(), startDate.getUTCMonth()),
    startDate
  };
}

function shiftAgendaMonth(cursor: AgendaMonthCursor, offset: number) {
  return createAgendaMonthCursor(cursor.year, cursor.monthIndex + offset);
}

function formatAgendaMonthQuery(cursor: AgendaMonthCursor) {
  return cursor.monthKey;
}

function buildAgendaHref(
  cursor: AgendaMonthCursor,
  options: {
    mode?: 'create' | 'edit';
    eventId?: string;
    intent?: 'edit';
    confirmDelete?: boolean;
    assetId?: string;
  } = {}
) {
  const params = new URLSearchParams({ month: formatAgendaMonthQuery(cursor) });
  if (options.mode) params.set('mode', options.mode);
  if (options.eventId) params.set('eventId', options.eventId);
  if (options.intent) params.set('intent', options.intent);
  if (options.confirmDelete) params.set('confirmDelete', 'true');
  if (options.assetId) params.set('assetId', options.assetId);
  return `${AGENDA_BASE_PATH}?${params.toString()}`;
}

function formatAgendaMonthKey(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}

function formatAgendaDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}
