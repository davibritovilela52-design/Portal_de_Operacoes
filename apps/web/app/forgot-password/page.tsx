import { Panel } from '../../components/portal-ui';
import { redirect } from 'next/navigation';
import { readPortalSession } from '../../lib/portal-session';
import { forgotPasswordAction } from './actions';

type ForgotPasswordPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ForgotPasswordPage({
  searchParams
}: ForgotPasswordPageProps) {
  const [session, resolvedSearchParams] = await Promise.all([
    readPortalSession(),
    searchParams ?? Promise.resolve({})
  ]);

  if (session) {
    redirect('/dashboard');
  }

  const error = readSearchMessage(resolvedSearchParams, 'error');

  return (
    <main className="auth-page auth-page--centered">
      <Panel className="auth-panel auth-panel--compact">
        <div className="auth-panel__intro">
          <h1>Recuperar senha</h1>
          <p>Enviaremos um link para redefinir a senha do seu acesso.</p>
        </div>

        {error ? (
          <div className="auth-banner auth-banner--error">
            <strong>Falha na recuperação</strong>
            <p>{error}</p>
          </div>
        ) : null}

        <form action={forgotPasswordAction} className="action-form auth-form">
          <div className="form-grid form-grid--single">
            <label className="form-field">
              <span>Email</span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="voce@empresa.com"
                required
              />
            </label>
          </div>

          <button className="action-button auth-submit" type="submit">
            Enviar link
          </button>
        </form>

        <div className="auth-links">
          <a href="/login">Voltar para login</a>
          <a href="/sign-up">Criar conta</a>
        </div>
      </Panel>
    </main>
  );
}

function readSearchMessage(
  searchParams: Record<string, string | string[] | undefined>,
  key: 'notice' | 'error'
) {
  const value = searchParams[key];

  return typeof value === 'string' ? value : undefined;
}
