import { redirect } from 'next/navigation';

import { Panel } from '../../components/portal-ui';
import { readPortalSession } from '../../lib/portal-session';
import { loginAction } from './actions';

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [session, resolvedSearchParams] = await Promise.all([
    readPortalSession(),
    searchParams ?? Promise.resolve({})
  ]);

  if (session) {
    redirect('/dashboard');
  }

  const error = readSearchMessage(resolvedSearchParams, 'error');
  const notice = readSearchMessage(resolvedSearchParams, 'notice');

  return (
    <main className="auth-page auth-page--centered">
      <Panel className="auth-panel auth-panel--compact">
        {notice ? (
          <div className="auth-banner auth-banner--notice">
            <strong>Aviso</strong>
            <p>{notice}</p>
          </div>
        ) : null}

        {error ? (
          <div className="auth-banner auth-banner--error">
            <strong>Não foi possível entrar</strong>
            <p>{error}</p>
          </div>
        ) : null}

        <form action={loginAction} className="action-form auth-form">
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

            <label className="form-field">
              <span>Senha</span>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </label>
          </div>

          <button className="action-button auth-submit" type="submit">
            Entrar
          </button>
        </form>

        <div className="auth-links">
          <a href="/sign-up">Criar conta</a>
          <a href="/forgot-password">Esqueci minha senha</a>
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
