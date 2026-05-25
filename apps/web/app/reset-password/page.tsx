import { Panel } from '../../components/portal-ui';
import { redirect } from 'next/navigation';
import { readPortalSession } from '../../lib/portal-session';
import { resetPasswordAction } from './actions';

type ResetPasswordPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ResetPasswordPage({
  searchParams
}: ResetPasswordPageProps) {
  const [session, resolvedSearchParams] = await Promise.all([
    readPortalSession(),
    searchParams ?? Promise.resolve({})
  ]);

  if (session) {
    redirect('/dashboard');
  }

  const token = readSearchMessage(resolvedSearchParams, 'token');
  const error = readSearchMessage(resolvedSearchParams, 'error');

  if (!token) {
    return (
      <main className="auth-page auth-page--centered">
        <Panel className="auth-panel auth-panel--compact">
          <div className="auth-banner auth-banner--error">
            <strong>Link inválido</strong>
            <p>Solicite um novo link de redefinição de senha.</p>
          </div>

          <div className="auth-links">
            <a href="/forgot-password">Solicitar novo link</a>
            <a href="/login">Voltar para login</a>
          </div>
        </Panel>
      </main>
    );
  }

  return (
    <main className="auth-page auth-page--centered">
      <Panel className="auth-panel auth-panel--compact">
        <div className="auth-panel__intro">
          <h1>Defina uma nova senha</h1>
          <p>Escolha uma senha forte para continuar com o portal.</p>
        </div>

        {error ? (
          <div className="auth-banner auth-banner--error">
            <strong>Falha no reset</strong>
            <p>{error}</p>
          </div>
        ) : null}

        <form action={resetPasswordAction} className="action-form auth-form">
          <input name="token" type="hidden" value={token} />

          <div className="form-grid form-grid--single">
            <label className="form-field">
              <span>Nova senha</span>
              <input
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
              />
            </label>

            <label className="form-field">
              <span>Confirmar senha</span>
              <input
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
              />
            </label>
          </div>

          <button className="action-button auth-submit" type="submit">
            Atualizar senha
          </button>
        </form>

        <div className="auth-links">
          <a href="/login">Voltar para login</a>
        </div>
      </Panel>
    </main>
  );
}

function readSearchMessage(
  searchParams: Record<string, string | string[] | undefined>,
  key: 'token' | 'error' | 'notice'
) {
  const value = searchParams[key];

  return typeof value === 'string' ? value : undefined;
}
