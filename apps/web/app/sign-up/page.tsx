import { Panel } from '../../components/portal-ui';
import { redirect } from 'next/navigation';
import { readPortalSession } from '../../lib/portal-session';
import { signUpAction } from './actions';

type SignUpPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
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
        <div className="auth-panel__intro">
          <h1>Crie seu acesso</h1>
          <p>
            A conta precisa ser confirmada por e-mail antes de receber sessão
            no portal.
          </p>
        </div>

        {notice ? (
          <div className="auth-banner auth-banner--notice">
            <strong>Aviso</strong>
            <p>{notice}</p>
          </div>
        ) : null}

        {error ? (
          <div className="auth-banner auth-banner--error">
            <strong>Falha no cadastro</strong>
            <p>{error}</p>
          </div>
        ) : null}

        <form action={signUpAction} className="action-form auth-form">
          <div className="form-grid form-grid--single">
            <label className="form-field">
              <span>Nome</span>
              <input name="name" type="text" autoComplete="name" required />
            </label>

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
            Criar conta
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
  key: 'notice' | 'error'
) {
  const value = searchParams[key];

  return typeof value === 'string' ? value : undefined;
}
