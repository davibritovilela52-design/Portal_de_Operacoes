import Link from 'next/link';

import { PageHeader, Panel, Badge } from '../../../components/portal-ui';
import { fetchPortalSnapshot } from '../../../lib/portal-api';
import {
  canManageAccessModule,
  portalRoleLabels,
  type AccessUserRecord,
  type PortalRole
} from '../../../lib/portal-model';
import { requirePortalRoles } from '../../../lib/portal-session';
import { upsertAccessAssignmentAction } from '../operations-actions';

type AccessPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = 'force-dynamic';

const accessModalRoleOptions: Array<{ value: PortalRole; label: string }> = [
  { value: 'portal_admin', label: portalRoleLabels.portal_admin },
  { value: 'central_operations', label: portalRoleLabels.central_operations },
  { value: 'yachts_operations', label: portalRoleLabels.yachts_operations },
  {
    value: 'yachts_technical_coordination',
    label: portalRoleLabels.yachts_technical_coordination
  },
  { value: 'asset_field_team', label: portalRoleLabels.asset_field_team }
];

export default async function AccessPage({ searchParams }: AccessPageProps) {
  const session = await requirePortalRoles(['portal_admin', 'central_operations']);
  const [snapshot, resolvedSearchParams] = await Promise.all([
    fetchPortalSnapshot({
      tenantId: session.actor.tenantId,
      actor: session.actor,
      sessionToken: session.token
    }),
    searchParams ?? Promise.resolve({})
  ]);

  const notice = readSearchMessage(resolvedSearchParams, 'notice');
  const error = readSearchMessage(resolvedSearchParams, 'error');
  const mode = readAccessMode(resolvedSearchParams);
  const assignmentId = readAccessAssignmentId(resolvedSearchParams);
  const canManageAccess = canManageAccessModule(session.actor.role);
  const accessUsers = sortAccessUsers(snapshot.accessUsers.filter((user) => user.status !== 'revoked'));
  const selectedAssignment =
    canManageAccess && mode === 'edit' && assignmentId
      ? accessUsers.find((user) => user.id === assignmentId)
      : undefined;
  const activeCount = accessUsers.filter((user) => user.status === 'active').length;
  const blockedCount = accessUsers.filter((user) => user.status === 'blocked').length;
  const openedAtValue = toDatetimeLocalValue(new Date());
  const assetScopeDefault: string[] = [];
  const modalMode =
    canManageAccess && mode === 'edit' && selectedAssignment
      ? 'edit'
      : canManageAccess && mode === 'create'
        ? 'create'
        : null;
  const modalTitle = modalMode === 'edit' ? 'Editar acesso' : 'Cadastrar acesso';
  const modalSubmitLabel = modalMode === 'edit' ? 'Salvar alterações' : 'Salvar acesso';
  const modalUserIdDefault = selectedAssignment?.userId ?? '';
  const modalDisplayNameDefault = selectedAssignment?.displayName ?? '';
  const modalEmailDefault = selectedAssignment?.email ?? '';
  const modalRoleDefault = normalizeAccessRoleForModal(selectedAssignment?.role) ?? 'central_operations';
  const modalAssetIdsDefault = selectedAssignment
    ? selectedAssignment.assetScopes.includes('global')
      ? []
      : selectedAssignment.assetScopes
    : assetScopeDefault;
  const modalMfaDefault = selectedAssignment ? (selectedAssignment.mfaEnabled ? 'on' : 'off') : 'on';
  const modalReviewedAtDefault = selectedAssignment
    ? toDatetimeLocalValue(new Date(selectedAssignment.lastReviewedAt))
    : openedAtValue;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Governança de acesso"
        title="Acessos e administração"
        description="Controle papéis, escopos e MFA dos usuários do portal."
        actions={
          canManageAccess ? (
            <Link className="action-button" href="/access?mode=create">
              Cadastrar acesso
            </Link>
          ) : null
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

      {canManageAccess && mode === 'edit' && assignmentId && !selectedAssignment ? (
        <Panel tone="critical" className="status-banner">
          <strong>Registro não encontrado</strong>
          <p>O acesso selecionado não pôde ser localizado para edição.</p>
        </Panel>
      ) : null}

      <Panel>
        <div className="panel-title">
          <span>Acessos atuais</span>
          <Badge
            label={`${accessUsers.length} cadastrados`}
            tone={accessUsers.length > 0 ? 'accent' : 'default'}
          />
        </div>

        <p className="helper-text">
          {accessUsers.length} acessos cadastrados, {activeCount} ativos e {blockedCount} bloqueados.
        </p>

        {!canManageAccess ? (
          <p className="helper-text">
            Este perfil possui leitura do diretÃ³rio de acessos. AlteraÃ§Ãµes continuam restritas ao admin do portal.
          </p>
        ) : null}

        {accessUsers.length === 0 ? (
          <div className="signal-list">
            <article className="signal-item">
              <h3 className="signal-item__title">Nenhum acesso encontrado</h3>
              <p>Não há acessos visíveis para o papel autenticado nesta leitura.</p>
            </article>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Papel</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {accessUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <span className="access-user-email">{user.email}</span>
                    </td>
                    <td>{portalRoleLabels[user.role]}</td>
                    <td>
                      <Badge
                        label={resolveAccessStatusLabel(user.status)}
                        tone={resolveAccessStatusTone(user.status)}
                      />
                    </td>
                    <td>
                      {canManageAccess ? (
                        <div className="table-actions">
                          <Link
                            className="action-button action-button--ghost"
                            href={`/access?mode=edit&assignmentId=${encodeURIComponent(user.id)}`}
                          >
                            Editar
                          </Link>
                        </div>
                      ) : (
                        <span className="helper-text">Somente leitura</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {modalMode ? (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="panel-title">
              <span>{modalTitle}</span>
            </div>

            <form action={upsertAccessAssignmentAction} className="action-form">
              {modalMode === 'edit' ? (
                <input name="assignmentId" type="hidden" value={selectedAssignment?.id ?? ''} readOnly />
              ) : null}

              <div className="form-grid">
                <label className="form-field">
                  <span>ID do usuário</span>
                  <input
                    name="userId"
                    type="text"
                    placeholder="Ex.: central-ops-01"
                    defaultValue={modalUserIdDefault}
                    required
                  />
                </label>

                <label className="form-field">
                  <span>Nome do usuário</span>
                  <input
                    name="displayName"
                    type="text"
                    placeholder="Nome completo"
                    defaultValue={modalDisplayNameDefault}
                    required
                  />
                </label>

                <label className="form-field">
                  <span>E-mail</span>
                  <input
                    name="email"
                    type="email"
                    placeholder="nome@primeyou.com"
                    defaultValue={modalEmailDefault}
                    required
                  />
                </label>

                <label className="form-field form-field--full">
                  <span>Papel</span>
                  <select name="targetRole" defaultValue={modalRoleDefault} required>
                    {accessModalRoleOptions.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-field form-field--full">
                  <span>Escopo</span>
                  <select
                    name="assetIds"
                    multiple
                    size={Math.min(Math.max(snapshot.fleetAssets.length + 1, 3), 6)}
                    defaultValue={modalAssetIdsDefault}
                  >
                    {snapshot.fleetAssets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {formatAssetName(asset.name)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-field form-field--full">
                  <span>MFA</span>
                  <select name="mfaEnabled" defaultValue={modalMfaDefault}>
                    <option value="on">Ativo</option>
                    <option value="off">Inativo</option>
                  </select>
                </label>

                <label className="form-field form-field--full">
                  <span>Última revisão</span>
                  <input
                    name="lastReviewedAt"
                    type="datetime-local"
                    defaultValue={modalReviewedAtDefault}
                    required
                  />
                </label>
              </div>

              <p className="helper-text">
                Para acesso global de admin, deixe o escopo vazio. Os ativos podem ser selecionados em mais de uma posição.
              </p>

              <div className="form-actions form-actions--end">
                <Link className="action-button action-button--ghost" href="/access">
                  Cancelar
                </Link>
                <button className="action-button" type="submit">
                  {modalSubmitLabel}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function normalizeAccessRoleForModal(role: AccessUserRecord['role'] | undefined): PortalRole | undefined {
  return role;
}

function readSearchMessage(
  searchParams: Record<string, string | string[] | undefined>,
  key: 'notice' | 'error'
) {
  const value = searchParams[key];
  return typeof value === 'string' ? value : undefined;
}

function readAccessMode(searchParams: Record<string, string | string[] | undefined>) {
  return searchParams.mode === 'create' || searchParams.mode === 'edit' ? searchParams.mode : null;
}

function readAccessAssignmentId(searchParams: Record<string, string | string[] | undefined>) {
  const value = searchParams.assignmentId;
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function sortAccessUsers(users: AccessUserRecord[]) {
  return [...users].sort((left, right) => {
    const leftRank = resolveAccessStatusRank(left.status);
    const rightRank = resolveAccessStatusRank(right.status);

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return left.displayName.localeCompare(right.displayName, 'pt-BR');
  });
}

function resolveAccessStatusRank(status: AccessUserRecord['status']) {
  switch (status) {
    case 'active':
      return 0;
    case 'blocked':
      return 1;
    case 'revoked':
      return 2;
  }
}

function resolveAccessStatusLabel(status: AccessUserRecord['status']) {
  switch (status) {
    case 'active':
      return 'Ativo';
    case 'blocked':
      return 'Bloqueado';
    default:
      return 'Bloqueado';
  }
}

function resolveAccessStatusTone(status: AccessUserRecord['status']) {
  switch (status) {
    case 'active':
      return 'success' as const;
    case 'blocked':
      return 'critical' as const;
    default:
      return 'critical' as const;
  }
}

function formatAssetName(value: string) {
  return value.replace(/^yacht(?:\s*-\s*|\s+)/i, '').trim();
}

function toDatetimeLocalValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}
