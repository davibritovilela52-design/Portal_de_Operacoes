import { redirect } from 'next/navigation';

import {
  ActionButton,
  Badge,
  PageHeader,
  Panel
} from '../../../components/portal-ui';
import { type CutoverRunRecord, fetchPortalCutoverSnapshot } from '../../../lib/portal-api';
import { portalRoleLabels } from '../../../lib/portal-model';
import { requirePortalSession } from '../../../lib/portal-session';
import {
  evaluateCutoverRunAction,
  recordCutoverCheckpointAction,
  recordCutoverDecisionAction,
  upsertCutoverRunAction
} from '../operations-actions';

type CutoverPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CutoverPage({ searchParams }: CutoverPageProps) {
  const session = await requirePortalSession();

  if (!canReadCutover(session.actor.role)) {
    redirect('/dashboard?error=Acesso%20restrito%20ao%20cockpit%20de%20cutover.');
  }

  const [{ latestRun, runs, source, writePolicy }, resolvedSearchParams] = await Promise.all([
    fetchPortalCutoverSnapshot({
      tenantId: session.actor.tenantId,
      actor: session.actor,
      sessionToken: session.token
    }),
    searchParams ?? Promise.resolve({})
  ]);

  const notice = readSearchMessage(resolvedSearchParams, 'notice');
  const error = readSearchMessage(resolvedSearchParams, 'error');
  const isPortalAdmin = session.actor.role === 'portal_admin';
  const now = toDateTimeLocalValue(new Date());
  const blockers = latestRun?.gate.blockers ?? [];
  const completedCheckpoints = latestRun?.checkpoints.filter(
    (checkpoint) => checkpoint.status === 'completed'
  ).length ?? 0;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Governança de go-live"
        title="Controle de cutover"
        description="Rodadas persistentes de cutover com reconciliação por entidade, evidências de readiness, checkpoints T+1/T+4/T+24 e decisão formal de go/no-go."
        actions={
          <>
            <Badge
              label={writePolicy.allowed ? 'Legado ainda editavel' : 'Legado em read-only'}
              tone={writePolicy.allowed ? 'warning' : 'critical'}
            />
            <Badge
              label={
                source === 'api'
                  ? 'Cockpit via API'
                  : source === 'mixed'
                    ? 'Cockpit em modo misto'
                    : 'Cockpit em modo mock'
              }
              tone="accent"
            />
          </>
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

      <Panel tone="highlight">
        <div className="panel-title">
          <span>Situação da rodada</span>
          <Badge label={latestRun ? cutoverRunStatusLabels[latestRun.status] : 'Sem rodada'} tone="accent" />
        </div>
        <div className="summary-list">
          <div className="summary-item">
            <div className="summary-item__label">Rodada ativa</div>
            <div className="summary-item__value">
              <strong>{latestRun?.label ?? 'Não iniciada'}</strong>
              <span>{latestRun ? `Status ${cutoverRunStatusLabels[latestRun.status]}` : 'Crie a primeira rodada'}</span>
            </div>
          </div>
          <div className="summary-item">
            <div className="summary-item__label">Agenda futura migrada</div>
            <div className="summary-item__value">
              <strong>{latestRun?.futureAgendaDaysMigrated ?? 0} dias</strong>
              <span>Meta mínima de 90 dias</span>
            </div>
          </div>
          <div className="summary-item">
            <div className="summary-item__label">Bloqueios</div>
            <div className="summary-item__value">
              <strong>{blockers.length}</strong>
              <span>Gates reprovados na última avaliação</span>
            </div>
          </div>
          <div className="summary-item">
            <div className="summary-item__label">Checkpoints concluídos</div>
            <div className="summary-item__value">
              <strong>{completedCheckpoints}/3</strong>
              <span>T+1, T+4 e T+24</span>
            </div>
          </div>
        </div>
      </Panel>

      <div className="split-grid">
        <Panel tone="highlight">
          <div className="panel-title">
            <span>Baseline da rodada</span>
            <Badge label="Persistente por locatário" tone="accent" />
          </div>

          {isPortalAdmin ? (
            <form action={upsertCutoverRunAction} className="action-form">
              {latestRun ? <input name="runId" type="hidden" value={latestRun.id} /> : null}

              <div className="form-grid">
                <label className="form-field form-field--full">
                  <span>{portalRoleLabels.portal_admin}</span>
                  <input
                    name="operator"
                    type="text"
                    defaultValue={session.operatorLabel}
                    readOnly
                    required
                  />
                </label>

                <label className="form-field form-field--full">
                  <span>Label da rodada</span>
                  <input
                    name="label"
                    type="text"
                    defaultValue={latestRun?.label ?? 'Go-live Yachts phase 1'}
                    required
                  />
                </label>

                <label className="form-field form-field--full">
                  <span>Agenda migrada (dias)</span>
                  <input
                    name="futureAgendaDaysMigrated"
                    type="number"
                    min="0"
                    step="1"
                    defaultValue={String(latestRun?.futureAgendaDaysMigrated ?? 90)}
                    required
                  />
                </label>

                <label className="form-field checkbox-field form-field--full">
                  <input
                    name="finalFreezeApplied"
                    type="checkbox"
                    defaultChecked={latestRun?.finalFreezeApplied ?? false}
                  />
                  <span>Freeze final de 12h aplicado</span>
                </label>
              </div>

              <label className="form-field">
                <span>IDs de anexos críticos inválidos</span>
                <textarea
                  name="invalidCriticalAttachmentIds"
                  rows={3}
                  defaultValue={latestRun?.invalidCriticalAttachmentIds.join('\n') ?? ''}
                  placeholder="Um ID por linha; deixe vazio quando não houver pendências."
                />
              </label>

              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Entidade</th>
                      <th>Contagem de origem</th>
                      <th>Contagem migrada</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Chamados de manutenção</td>
                      <td>
                        <input
                          name="maintenanceTicketsSourceCount"
                          type="number"
                          min="0"
                          step="1"
                          defaultValue={String(readEntityCount(latestRun, 'maintenance_tickets').sourceCount)}
                          required
                        />
                      </td>
                      <td>
                        <input
                          name="maintenanceTicketsMigratedCount"
                          type="number"
                          min="0"
                          step="1"
                          defaultValue={String(readEntityCount(latestRun, 'maintenance_tickets').migratedCount)}
                          required
                        />
                      </td>
                    </tr>
                    <tr>
                      <td>Eventos de agenda</td>
                      <td>
                        <input
                          name="agendaEventsSourceCount"
                          type="number"
                          min="0"
                          step="1"
                          defaultValue={String(readEntityCount(latestRun, 'agenda_events').sourceCount)}
                          required
                        />
                      </td>
                      <td>
                        <input
                          name="agendaEventsMigratedCount"
                          type="number"
                          min="0"
                          step="1"
                          defaultValue={String(readEntityCount(latestRun, 'agenda_events').migratedCount)}
                          required
                        />
                      </td>
                    </tr>
                    <tr>
                      <td>Anexos críticos</td>
                      <td>
                        <input
                          name="criticalAttachmentsSourceCount"
                          type="number"
                          min="0"
                          step="1"
                          defaultValue={String(readEntityCount(latestRun, 'critical_attachments').sourceCount)}
                          required
                        />
                      </td>
                      <td>
                        <input
                          name="criticalAttachmentsMigratedCount"
                          type="number"
                          min="0"
                          step="1"
                          defaultValue={String(readEntityCount(latestRun, 'critical_attachments').migratedCount)}
                          required
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="panel-title">
                <span>Aprovacoes do comite</span>
                <Badge label="Unanimidade obrigatoria" tone="critical" />
              </div>

              <div className="cutover-approval-grid">
                {renderApprovalFields({
                  prefix: 'centralOperations',
                  label: portalRoleLabels.central_operations,
                  defaultValue: latestRun?.approvals.centralOperations,
                  now
                })}
                {renderApprovalFields({
                  prefix: 'technicalCoordination',
                  label: portalRoleLabels.yachts_technical_coordination,
                  defaultValue: latestRun?.approvals.technicalCoordination,
                  now
                })}
                {renderApprovalFields({
                  prefix: 'portalAdmin',
                  label: portalRoleLabels.portal_admin,
                  defaultValue: latestRun?.approvals.portalAdmin,
                  now
                })}
              </div>

              <div className="panel-title">
                <span>Adicionar evidência</span>
                <Badge label="Append-only por save" tone="warning" />
              </div>

              <div className="form-grid">
                <label className="form-field form-field--full">
                  <span>Tipo</span>
                  <select name="evidenceType" defaultValue="">
                    <option value="">Sem nova evidência</option>
                    <option value="migration_report">Relatório de migração</option>
                    <option value="attachment_validation">Validação de anexos</option>
                    <option value="freeze_confirmation">Confirmação de freeze</option>
                    <option value="readiness_evidence">Evidência de readiness</option>
                  </select>
                </label>

                <label className="form-field form-field--full">
                  <span>Titulo</span>
                  <input name="evidenceTitle" type="text" placeholder="Dry-run report" />
                </label>

                <label className="form-field form-field--full">
                  <span>Referencia</span>
                  <input
                    name="evidenceReference"
                    type="text"
                    placeholder=".tmp/legacy-yachts-import-report.json"
                  />
                </label>

                <label className="form-field checkbox-field form-field--full">
                  <input name="evidenceValid" type="checkbox" defaultChecked />
                  <span>Evidência válida</span>
                </label>
              </div>

              <label className="form-field">
                <span>Detalhe da evidência</span>
                <textarea
                  name="evidenceDetail"
                  rows={3}
                  placeholder="Explique o que a evidência valida nesta rodada."
                />
              </label>

              <div className="form-actions">
                <p className="helper-text">
                  Atualizar o baseline reseta a última avaliação para draft e preserva checkpoints já registrados.
                </p>
                <ActionButton label="Salvar rodada" icon="cutover" type="submit" />
              </div>
            </form>
          ) : (
            <div className="signal-list">
              <article className="signal-item">
                <h3 className="signal-item__title">Leitura liberada para papéis críticos</h3>
                <p>
                  {portalRoleLabels.central_operations} e{' '}
                  {portalRoleLabels.portal_admin.toLowerCase()} atualizam o baseline estrutural
                  da rodada de cutover.
                </p>
              </article>
            </div>
          )}
        </Panel>

        <Panel>
          <div className="panel-title">
            <span>Checkpoints e decisão</span>
            <Badge label="T+1 / T+4 / T+24" tone="accent" />
          </div>

          {latestRun ? (
            <>
              <form action={recordCutoverCheckpointAction} className="action-form">
                <input name="runId" type="hidden" value={latestRun.id} />
                <div className="form-grid">
                  <label className="form-field form-field--full">
                    <span>Operador</span>
                    <input
                      name="operator"
                      type="text"
                      defaultValue={session.operatorLabel}
                      readOnly
                      required
                    />
                  </label>

                  <label className="form-field form-field--full">
                    <span>Checkpoint</span>
                    <select name="checkpoint" defaultValue="T+1">
                      <option value="T+1">T+1</option>
                      <option value="T+4">T+4</option>
                      <option value="T+24">T+24</option>
                    </select>
                  </label>

                  <label className="form-field form-field--full">
                    <span>Status</span>
                    <select name="checkpointStatus" defaultValue="completed">
                      <option value="completed">Concluído</option>
                      <option value="pending">Pendente</option>
                      <option value="blocked">Bloqueado</option>
                    </select>
                  </label>
                </div>

                <label className="form-field">
                  <span>Notas do checkpoint</span>
                  <textarea
                    name="checkpointNotes"
                    rows={3}
                    placeholder="Confirme estabilidade, divergencias ou bloqueios do checkpoint."
                    required
                  />
                </label>

                <div className="form-actions">
                  <p className="helper-text">
                    {portalRoleLabels.yachts_technical_coordination},{' '}
                    {portalRoleLabels.central_operations.toLowerCase()} e{' '}
                    {portalRoleLabels.portal_admin.toLowerCase()} podem registrar checkpoints.
                  </p>
                  <ActionButton label="Registrar checkpoint" icon="clock" type="submit" />
                </div>
              </form>

              <div className="timeline-list">
                {latestRun.checkpoints.map((checkpoint) => (
                  <article key={checkpoint.id} className="timeline-item">
                    <div className="signal-item__meta">
                      <h3 className="timeline-item__title">{checkpoint.checkpoint}</h3>
                      <Badge
                        label={cutoverCheckpointStatusLabels[checkpoint.status]}
                        tone={
                          checkpoint.status === 'completed'
                            ? 'success'
                            : checkpoint.status === 'blocked'
                              ? 'critical'
                              : 'warning'
                        }
                      />
                    </div>
                    <p>{checkpoint.notes}</p>
                    <div className="meta-row">
                      <span>{checkpoint.recordedBy}</span>
                      <span>{formatDateLabel(checkpoint.recordedAt)}</span>
                    </div>
                  </article>
                ))}
              </div>

              {isPortalAdmin ? (
                <div className="split-grid">
                  <form action={evaluateCutoverRunAction} className="action-form">
                    <input name="runId" type="hidden" value={latestRun.id} />
                    <input
                      name="operator"
                      type="hidden"
                      value={session.operatorLabel}
                    />
                    <div className="form-actions">
                      <p className="helper-text">
                        Reavalia a rodada com base no baseline persistido e atualiza blockers.
                      </p>
                      <ActionButton label="Reavaliar gates" icon="audit" type="submit" />
                    </div>
                  </form>

                  <div className="dual-action-row">
                    <form action={recordCutoverDecisionAction} className="action-form">
                      <input name="runId" type="hidden" value={latestRun.id} />
                      <input
                        name="operator"
                        type="hidden"
                        value={session.operatorLabel}
                      />
                      <input name="decision" type="hidden" value="go" />
                      <ActionButton label="Confirmar go-live" icon="cutover" type="submit" />
                    </form>

                    <form action={recordCutoverDecisionAction} className="action-form">
                      <input name="runId" type="hidden" value={latestRun.id} />
                      <input
                        name="operator"
                        type="hidden"
                        value={session.operatorLabel}
                      />
                      <input name="decision" type="hidden" value="no_go" />
                      <ActionButton
                        label="Registrar no-go"
                        icon="alert"
                        tone="critical"
                        type="submit"
                      />
                    </form>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="signal-list">
              <article className="signal-item">
                <h3 className="signal-item__title">Nenhuma rodada persistida</h3>
                <p>Assim que o admin salvar a primeira rodada, checkpoints e decisão ficarão disponíveis.</p>
              </article>
            </div>
          )}
        </Panel>
      </div>

      <div className="triple-grid">
        <Panel tone={latestRun && readEntityGate(latestRun).status === 'ready' ? 'highlight' : latestRun ? 'critical' : 'default'}>
          <div className="panel-title">
            <span>Conciliação de entidades</span>
            <Badge label={latestRun ? readEntityGate(latestRun).label : 'Sem rodada'} tone={latestRun && readEntityGate(latestRun).status === 'ready' ? 'success' : 'critical'} />
          </div>
          <p>{latestRun ? readEntityGate(latestRun).detail : 'Crie uma rodada para conciliar contagens.'}</p>
        </Panel>

        <Panel
          tone={
            latestRun && latestRun.invalidCriticalAttachmentIds.length === 0
              ? 'highlight'
              : latestRun
                ? 'critical'
                : 'default'
          }
          className="cutover-insight-panel"
        >
          <div className="panel-title">
            <span>Integridade de anexos críticos</span>
            <Badge
              label={
                !latestRun
                  ? 'Sem rodada'
                  : latestRun.invalidCriticalAttachmentIds.length === 0
                    ? 'Pronto'
                    : 'Bloqueado'
              }
              tone={
                !latestRun
                  ? 'warning'
                  : latestRun.invalidCriticalAttachmentIds.length === 0
                    ? 'success'
                    : 'critical'
              }
            />
          </div>
          <p>
            {!latestRun
              ? 'Ainda não existe validação persistida.'
              : latestRun.invalidCriticalAttachmentIds.length === 0
                ? 'Nenhum anexo crítico inválido na última rodada.'
                : `Pendências: ${latestRun.invalidCriticalAttachmentIds.join(', ')}.`}
          </p>
        </Panel>

        <Panel tone={latestRun && blockers.length === 0 ? 'highlight' : latestRun ? 'critical' : 'default'}>
          <div className="panel-title">
            <span>Janela futura + comite</span>
            <Badge
              label={!latestRun ? 'Sem rodada' : blockers.length === 0 ? 'Pronto' : 'Bloqueado'}
              tone={!latestRun ? 'warning' : blockers.length === 0 ? 'success' : 'critical'}
            />
          </div>
          <p>
            {!latestRun
              ? 'A decisão do comitê depende de uma rodada avaliada.'
              : `Agenda: ${latestRun.futureAgendaDaysMigrated} dias; freeze ${latestRun.finalFreezeApplied ? 'aplicado' : 'pendente'}; unanimidade ${committeeApproved(latestRun) ? 'ok' : 'pendente'}.`}
          </p>
        </Panel>
      </div>

      <div className="split-grid">
        <Panel className="cutover-evidence-panel">
          <div className="panel-title">
            <span>Evidencias da rodada</span>
            <Badge label="Append-only" tone="warning" />
          </div>

          <div className="timeline-list cutover-evidence-list">
            {(latestRun?.evidences ?? []).map((evidence) => (
              <article key={evidence.id} className="timeline-item cutover-evidence-card">
                <div className="signal-item__meta">
                  <h3 className="timeline-item__title">{evidence.title}</h3>
                  <Badge
                    label={evidence.valid ? 'Válida' : 'Inválida'}
                    tone={evidence.valid ? 'success' : 'critical'}
                  />
                </div>
                <p>{evidence.detail}</p>
                <div className="meta-row">
                  <span>{evidence.type}</span>
                  <span>{formatDateLabel(evidence.createdAt)}</span>
                </div>
                <div className="meta-row">
                  <span>{evidence.reference}</span>
                </div>
              </article>
            ))}
          </div>
        </Panel>

        <Panel>
          <div className="panel-title">
            <span>Historico de rodadas</span>
            <Badge label={`${runs.length} rodadas`} tone="accent" />
          </div>

          <div className="table-wrap">
            <table className="table cutover-history-table">
              <thead>
                <tr>
                  <th>Rodada</th>
                  <th>Status</th>
                  <th>Decisão</th>
                  <th>Agenda</th>
                  <th>Atualizada em</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td className="cutover-history-table__run">
                      <strong>{run.label}</strong>
                      <span>{run.id}</span>
                    </td>
                    <td>
                      <Badge
                        label={cutoverRunStatusLabels[run.status]}
                        tone={
                          run.status === 'completed'
                            ? 'success'
                            : run.status === 'blocked'
                              ? 'critical'
                              : run.status === 'approved'
                                ? 'accent'
                                : 'warning'
                        }
                      />
                    </td>
                    <td>{run.goLiveDecision ? cutoverDecisionLabels[run.goLiveDecision] : 'Pendente'}</td>
                    <td>{run.futureAgendaDaysMigrated} dias</td>
                    <td>{formatDateLabel(run.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function renderApprovalFields(input: {
  prefix: 'centralOperations' | 'technicalCoordination' | 'portalAdmin';
  label: string;
  defaultValue?: {
    approved: boolean;
    approvedBy: string | null;
    approvedAt: string | Date | null;
  };
  now: string;
}) {
  return (
    <article className="role-card" key={input.prefix}>
      <div className="label-row">
        <Badge
          label={input.defaultValue?.approved ? 'Aprovado' : 'Pendente'}
          tone={input.defaultValue?.approved ? 'success' : 'warning'}
        />
      </div>
      <h3>{input.label}</h3>
      <label className="form-field checkbox-field">
        <input
          name={`${input.prefix}Approved`}
          type="checkbox"
          defaultChecked={input.defaultValue?.approved ?? false}
        />
        <span>Aprovação registrada</span>
      </label>
      <label className="form-field">
        <span>Aprovado por</span>
        <input
          name={`${input.prefix}ApprovedBy`}
          type="text"
          defaultValue={input.defaultValue?.approvedBy ?? ''}
        />
      </label>
      <label className="form-field">
        <span>Data/hora</span>
        <input
          name={`${input.prefix}ApprovedAt`}
          type="datetime-local"
          defaultValue={toDateTimeLocalValue(input.defaultValue?.approvedAt ?? input.now)}
        />
      </label>
    </article>
  );
}

function canReadCutover(role: string) {
  return (
    role === 'portal_admin' ||
    role === 'central_operations' ||
    role === 'yachts_technical_coordination'
  );
}

function readEntityCount(run: CutoverRunRecord | null, entity: string) {
  const entry = run?.entityCounts.find((entityCount) => entityCount.entity === entity);

  return {
    sourceCount: entry?.sourceCount ?? 0,
    migratedCount: entry?.migratedCount ?? 0
  };
}

function readEntityGate(run: CutoverRunRecord) {
  const mismatch = run.entityCounts.find(
    (entityCount) => entityCount.sourceCount !== entityCount.migratedCount
  );

  if (mismatch) {
    return {
      status: 'blocked' as const,
      label: 'Bloqueado',
      detail: `${cutoverEntityLabels[mismatch.entity] ?? mismatch.entity}: ${mismatch.migratedCount}/${mismatch.sourceCount} conciliados.`
    };
  }

  return {
    status: 'ready' as const,
    label: 'Pronto',
    detail: 'Todas as contagens persistidas estao reconciliadas.'
  };
}

function committeeApproved(run: CutoverRunRecord) {
  return (
    run.approvals.centralOperations.approved &&
    run.approvals.technicalCoordination.approved &&
    run.approvals.portalAdmin.approved
  );
}

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function readSearchMessage(
  searchParams: Record<string, string | string[] | undefined>,
  key: 'notice' | 'error'
) {
  const value = searchParams[key];

  return typeof value === 'string' ? value : undefined;
}

function toDateTimeLocalValue(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value;

  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

const cutoverRunStatusLabels = {
  draft: 'Rascunho',
  blocked: 'Bloqueada',
  approved: 'Aprovada',
  completed: 'Concluída'
} as const;

const cutoverCheckpointStatusLabels = {
  completed: 'Concluído',
  pending: 'Pendente',
  blocked: 'Bloqueado'
} as const;

const cutoverDecisionLabels = {
  go: 'Go',
  no_go: 'No-go'
} as const;

const cutoverEntityLabels: Record<string, string> = {
  maintenance_tickets: 'Chamados de manutenção',
  agenda_events: 'Eventos de agenda',
  critical_attachments: 'Anexos críticos'
};
