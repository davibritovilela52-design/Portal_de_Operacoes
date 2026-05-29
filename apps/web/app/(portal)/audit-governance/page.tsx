import {
  ActionButton,
  Badge,
  PageHeader,
  Panel
} from '../../../components/portal-ui';
import { fetchPortalAuditSnapshot } from '../../../lib/portal-api';
import { formatDateLabel, portalRoleLabels } from '../../../lib/portal-model';
import { requirePortalSession } from '../../../lib/portal-session';
import {
  createDecisionMemoAction,
  createRectificationAction
} from '../operations-actions';

type AuditGovernancePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AuditGovernancePage({
  searchParams
}: AuditGovernancePageProps) {
  const session = await requirePortalSession();
  const [{ auditRecords, fleetAssets, source }, resolvedSearchParams] = await Promise.all([
    fetchPortalAuditSnapshot({
      tenantId: session.actor.tenantId,
      actor: session.actor,
      sessionToken: session.token
    }),
    searchParams ?? Promise.resolve({})
  ]);
  const notice = readSearchMessage(resolvedSearchParams, 'notice');
  const error = readSearchMessage(resolvedSearchParams, 'error');
  const decisionMemos = auditRecords.filter((record) => record.type === 'decision_memo');
  const rectifications = auditRecords.filter((record) => record.type === 'rectification');

  return (
    <div className="page">
      <PageHeader
        eyebrow="Visibilidade forense"
        title="Auditoria e governança"
        description="Mini-atas confirmadas, retificações versionadas e rastreabilidade operacional em um ledger único, pronto para investigação e governança."
        actions={
          <Badge
            label={
              source === 'api'
                ? 'Governanca via API'
                : source === 'mixed'
                  ? 'Governanca em modo misto'
                  : 'Governanca em modo mock'
            }
            tone="accent"
          />
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

      <div className="split-grid">
        <Panel tone="highlight">
          <div className="panel-title">
            <span>Registrar mini-ata</span>
            <Badge label="Ledger imutável após confirmação" tone="accent" />
          </div>

          <form action={createDecisionMemoAction} className="action-form">
            <div className="form-grid">
              <label className="form-field form-field--full">
                <span>Ativo</span>
                <select name="assetId" defaultValue={fleetAssets[0]?.id}>
                  {fleetAssets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field form-field--full">
                <span>Papel operacional</span>
                <select name="actorRole" defaultValue={session.actor.role} disabled>
                  <option value="central_operations">{portalRoleLabels.central_operations}</option>
                  <option value="portal_admin">{portalRoleLabels.portal_admin}</option>
                </select>
              </label>

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
                <span>Acao critica</span>
                <input name="action" type="text" defaultValue="agenda.conflict.override" required />
              </label>

              <label className="form-field form-field--full">
                <span>Tipo do agregado</span>
                <input name="aggregateType" type="text" defaultValue="agenda_event" required />
              </label>

              <label className="form-field form-field--full">
                <span>ID do agregado</span>
                <input name="aggregateId" type="text" placeholder="event-123" required />
              </label>
            </div>

            <label className="form-field form-field--full">
              <span>Contexto</span>
              <textarea
                name="context"
                rows={3}
                placeholder="Explique o contexto operacional da decisão."
                required
              />
            </label>

            <label className="form-field form-field--full">
              <span>Decisão registrada</span>
              <textarea
                name="decision"
                rows={3}
                placeholder="Descreva a decisão confirmada."
                required
              />
            </label>

            <label className="form-field form-field--full">
              <span>Alternativas consideradas</span>
              <textarea
                name="alternativesConsidered"
                rows={3}
                placeholder="Uma alternativa por linha"
                required
              />
            </label>

            <label className="form-field form-field--full">
              <span>Impacto esperado</span>
              <textarea
                name="expectedImpact"
                rows={2}
                placeholder="Risco mitigado, efeito esperado e reflexo operacional."
                required
              />
            </label>

            <div className="form-actions">
              <p className="helper-text">
                Mini-atas confirmadas viram trilha oficial de governança sem edição posterior.
              </p>
              <ActionButton label="Registrar mini-ata" icon="audit" type="submit" />
            </div>
          </form>
        </Panel>

        <Panel>
          <div className="panel-title">
            <span>Abrir retificação</span>
            <Badge label="Somente versionado" tone="warning" />
          </div>

          <form action={createRectificationAction} className="action-form">
            <div className="form-grid">
              <label className="form-field form-field--full">
                <span>Papel operacional</span>
                <select name="actorRole" defaultValue={session.actor.role} disabled>
                  <option value="central_operations">{portalRoleLabels.central_operations}</option>
                  <option value="portal_admin">{portalRoleLabels.portal_admin}</option>
                </select>
              </label>

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
                <span>ID do registro</span>
                <input name="recordId" type="text" placeholder="maintenance-1" required />
              </label>

              <label className="form-field form-field--full">
                <span>Status do registro</span>
                <select name="recordStatus" defaultValue="completed">
                  <option value="completed">Concluído</option>
                  <option value="open">Em aberto</option>
                </select>
              </label>

              <label className="form-field form-field--full">
                <span>Versão atual</span>
                <input name="recordVersion" type="number" min="1" step="1" defaultValue="1" required />
              </label>
            </div>

            <label className="form-field form-field--full">
              <span>Motivo da retificação</span>
              <textarea
                name="reason"
                rows={3}
                placeholder="Explique o erro ou ajuste necessario."
                required
              />
            </label>

            <label className="form-field form-field--full">
              <span>Snapshot posterior (JSON)</span>
              <textarea
                name="afterSnapshot"
                rows={6}
                defaultValue={'{\n  "supplierInvoiceNumber": "INV-055"\n}'}
                required
              />
            </label>

            <div className="form-actions">
              <p className="helper-text">
                Registros concluidos seguem imutaveis; correcoes entram como nova versao auditavel.
              </p>
              <ActionButton label="Abrir retificação" icon="audit" type="submit" />
            </div>
          </form>
        </Panel>
      </div>

      <div className="split-grid">
        <Panel>
          <div className="panel-title">
            <span>Pulso de governança</span>
            <Badge label="Ledger único" tone="default" />
          </div>
          <div className="summary-list">
            <div className="summary-item">
              <div className="summary-item__label">Entradas no ledger</div>
              <div className="summary-item__value">
                <strong>{auditRecords.length}</strong>
                <span>Volume total da trilha</span>
              </div>
            </div>
            <div className="summary-item">
              <div className="summary-item__label">Mini-atas</div>
              <div className="summary-item__value">
                <strong>{decisionMemos.length}</strong>
                <span>Decisões confirmadas</span>
              </div>
            </div>
            <div className="summary-item">
              <div className="summary-item__label">Retificações</div>
              <div className="summary-item__value">
                <strong>{rectifications.length}</strong>
                <span>Correções versionadas</span>
              </div>
            </div>
            <div className="summary-item">
              <div className="summary-item__label">Escopo global</div>
              <div className="summary-item__value">
                <strong>{auditRecords.filter((record) => !record.assetId).length}</strong>
                <span>Itens sem ativo específico</span>
              </div>
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="panel-title">
            <span>Regras de governança</span>
            <Badge label="MVP operacional" tone="accent" />
          </div>
          <div className="signal-list">
            <article className="signal-item">
              <h3 className="signal-item__title">Mini-ata confirmada = imutavel</h3>
              <p>Decisoes criticas confirmadas entram no ledger sem edicao posterior.</p>
            </article>
            <article className="signal-item">
              <h3 className="signal-item__title">Retificação sempre versionada</h3>
              <p>Correcoes em registro concluido geram nova versao com before/after rastreavel.</p>
            </article>
            <article className="signal-item">
              <h3 className="signal-item__title">Equipe de campo ve apenas seu escopo</h3>
              <p>O backend filtra o ledger por ativo quando o papel for equipe do ativo.</p>
            </article>
          </div>
        </Panel>
      </div>

      <Panel>
        <div className="panel-title">
          <span>Trilha de ações críticas</span>
          <div className="label-row">
            <Badge label="Mini-ata" tone="accent" />
            <Badge label="Retificação" tone="warning" />
          </div>
        </div>

        <div className="timeline-list">
          {auditRecords.map((record) => (
            <article key={record.id} className="timeline-item">
              <div className="signal-item__meta">
                <h3 className="timeline-item__title">{record.title}</h3>
                <Badge
                  label={auditTypeLabels[record.type]}
                  tone={record.type === 'rectification' ? 'warning' : 'accent'}
                />
              </div>
              <p>{record.summary}</p>
              <div className="meta-row">
                <span>
                  {record.assetName} · {record.actor}
                </span>
                <span>{formatDateLabel(record.at)}</span>
              </div>
            </article>
          ))}
        </div>
      </Panel>

      <Panel>
        <div className="panel-title">
          <span>Tabela de governança</span>
          <Badge label="Consulta rápida" tone="default" />
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>ID / tipo</th>
                <th>Registro</th>
                <th>Escopo</th>
                <th>Ator</th>
                <th>Metadata</th>
              </tr>
            </thead>
            <tbody>
              {auditRecords.map((record) => (
                <tr key={record.id}>
                  <td>
                    <strong>{record.id.toUpperCase()}</strong>
                    <br />
                    <span>{record.type}</span>
                  </td>
                  <td>
                    <strong>{record.title}</strong>
                    <br />
                    <span>{record.summary}</span>
                  </td>
                  <td>
                    <strong>{record.assetName}</strong>
                    <br />
                    <span>{formatDateLabel(record.at)}</span>
                  </td>
                  <td>{record.actor}</td>
                  <td>
                    {record.type === 'decision_memo' ? (
                      <div className="scope-list">
                        <span className="scope-chip">{record.aggregateType ?? 'aggregate'}</span>
                        <span className="scope-chip">{record.aggregateId ?? 'sem id'}</span>
                        <span className="scope-chip">{record.status ?? 'sem status'}</span>
                      </div>
                    ) : (
                      <div className="scope-list">
                        <span className="scope-chip">{record.recordId ?? 'sem record'}</span>
                        <span className="scope-chip">
                          v{record.sourceVersion ?? '?'}-&gt;v{record.targetVersion ?? '?'}
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

const auditTypeLabels = {
  decision_memo: 'Mini-ata',
  rectification: 'Retificação',
  override: 'Exceção operacional',
  authorization_failure: 'Falha de autorização'
} as const;

function readSearchMessage(
  searchParams: Record<string, string | string[] | undefined>,
  key: 'notice' | 'error'
) {
  const value = searchParams[key];

  return typeof value === 'string' ? value : undefined;
}
