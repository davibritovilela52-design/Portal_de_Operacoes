import Link from 'next/link';

import { PortalIcon } from '../../../components/icons';
import { PageHeader, Panel, Badge } from '../../../components/portal-ui';
import { fetchPortalSnapshot } from '../../../lib/portal-api';
import {
  canManageAccessModule,
  portalRoleLabels,
  type AccessUserRecord,
  type PortalRole
} from '../../../lib/portal-model';
import { requirePortalRole } from '../../../lib/portal-session';
import {
  registerAccessUserAction,
  revokeAccessAssignmentAction,
  upsertAccessAssignmentAction
} from '../operations-actions';

type AccessPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = 'force-dynamic';

const accessModalRoleOptions: Array<{ value: PortalRole; label: string }> = [
  { value: 'portal_admin', label: portalRoleLabels.portal_admin },
  { value: 'central_operations', label: portalRoleLabels.central_operations },
  { value: 'yachts_operations', label: portalRoleLabels.yachts_operations },
  { value: 'yachts_management', label: portalRoleLabels.yachts_management },
  { value: 'aviation_pilots', label: portalRoleLabels.aviation_pilots },
  { value: 'aviation_operations', label: portalRoleLabels.aviation_operations },
  { value: 'aviation_technical_coordination', label: portalRoleLabels.aviation_technical_coordination },
  { value: 'aviation_crew', label: portalRoleLabels.aviation_crew },
  { value: 'aviation_management', label: portalRoleLabels.aviation_management },
  { value: 'real_estate_operations', label: portalRoleLabels.real_estate_operations },
  { value: 'real_estate_projects', label: portalRoleLabels.real_estate_projects },
  { value: 'real_estate_houses', label: portalRoleLabels.real_estate_houses },
  { value: 'real_estate_gta', label: portalRoleLabels.real_estate_gta },
  { value: 'real_estate_management', label: portalRoleLabels.real_estate_management },
  { value: 'cars_operations', label: portalRoleLabels.cars_operations },
  { value: 'cars_driver', label: portalRoleLabels.cars_driver },
  { value: 'cars_management', label: portalRoleLabels.cars_management },
  { value: 'asset_field_team', label: portalRoleLabels.asset_field_team }
];

export default async function AccessPage({ searchParams }: AccessPageProps) {
  const session = await requirePortalRole('portal_admin');
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
  const canManageAccess = canManageAccessModule(session.actor.role);
  const assignmentId = readAccessAssignmentId(resolvedSearchParams);
  const accessUsers = sortAccessUsers(snapshot.accessUsers.filter((user) => user.status !== 'revoked'));
  const selectedAssignment =
    mode === 'edit' && assignmentId
      ? accessUsers.find((user) => user.id === assignmentId)
      : undefined;
  const activeCount = accessUsers.filter((user) => user.status === 'active').length;
  const blockedCount = accessUsers.filter((user) => user.status === 'blocked').length;
  const openedAtValue = toDatetimeLocalValue(new Date());
  const modalMode =
    canManageAccess && mode === 'edit' && selectedAssignment
      ? 'edit'
      : canManageAccess && mode === 'create'
        ? 'create'
        : null;
  const modalTitle = modalMode === 'edit' ? 'Editar acesso' : 'Cadastrar usuário';
  const modalSubmitLabel = modalMode === 'edit' ? 'Salvar alterações' : 'Cadastrar usuário';
  const modalFormAction =
    modalMode === 'create' ? registerAccessUserAction : upsertAccessAssignmentAction;
  const modalUserIdDefault = selectedAssignment?.userId ?? '';
  const modalDisplayNameDefault = selectedAssignment?.displayName ?? '';
  const modalEmailDefault = selectedAssignment?.email ?? '';
  const modalRoleDefault = normalizeAccessRoleForModal(selectedAssignment?.role) ?? 'central_operations';
  const modalAssetIdsDefault = selectedAssignment
    ? selectedAssignment.assetScopes.includes('global')
      ? []
      : selectedAssignment.assetScopes
    : [];
  const modalMfaDefault = selectedAssignment ? (selectedAssignment.mfaEnabled ? 'on' : 'off') : 'on';
  const modalReviewedAtDefault = selectedAssignment
    ? toDatetimeLocalValue(new Date(selectedAssignment.lastReviewedAt))
    : openedAtValue;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Governança de acesso"
        title="Acessos e administração"
        description="Controle papéis e usuários do portal."
        actions={
          canManageAccess ? (
            <Link className="action-button" href="/access?mode=create">
              Cadastrar usuário
            </Link>
          ) : undefined
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

      {mode === 'edit' && assignmentId && !selectedAssignment ? (
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
                  {canManageAccess ? <th>Ações</th> : null}
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
                    {canManageAccess ? (
                      <td>
                        <div className="table-actions">
                          <Link
                            className="action-button action-button--ghost"
                            href={`/access?mode=edit&assignmentId=${encodeURIComponent(user.id)}`}
                            aria-label={`Editar acesso de ${user.email}`}
                          >
                            <PortalIcon name="edit" />
                            Editar
                          </Link>
                          <form action={revokeAccessAssignmentAction}>
                            <input name="assignmentId" type="hidden" value={user.id} readOnly />
                            <input name="requestedAt" type="hidden" value={openedAtValue} readOnly />
                            <button
                              className="action-button action-button--critical"
                              type="submit"
                              aria-label={`Excluir acesso de ${user.email}`}
                            >
                              <PortalIcon name="trash" />
                              Excluir
                            </button>
                          </form>
                        </div>
                      </td>
                    ) : null}
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

            <form action={modalFormAction} className="action-form">
              {modalMode === 'edit' ? (
                <input name="assignmentId" type="hidden" value={selectedAssignment?.id ?? ''} readOnly />
              ) : null}
              {modalAssetIdsDefault.map((assetId) => (
                <input key={assetId} name="assetIds" type="hidden" value={assetId} readOnly />
              ))}
              <input name="mfaEnabled" type="hidden" value={modalMfaDefault} readOnly />
              <input name="lastReviewedAt" type="hidden" value={modalReviewedAtDefault} readOnly />

              <div className="form-grid">
                {modalMode === 'edit' ? (
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
                ) : null}

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

              </div>

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

function toDatetimeLocalValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}
