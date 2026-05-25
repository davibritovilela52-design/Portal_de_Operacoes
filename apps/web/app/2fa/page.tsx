import { redirect } from 'next/navigation';

import { Panel } from '../../components/portal-ui';
import { readPortalSession } from '../../lib/portal-session';
import { TwoFactorChallenge } from './two-factor-challenge';

type TwoFactorPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TwoFactorPage({ searchParams }: TwoFactorPageProps) {
  const [session, resolvedSearchParams] = await Promise.all([
    readPortalSession(),
    searchParams ?? Promise.resolve({})
  ]);

  if (session) {
    redirect('/dashboard');
  }

  const email = readSearchValue(resolvedSearchParams, 'email');
  const methods = readSearchList(resolvedSearchParams, 'methods');
  const error = readSearchValue(resolvedSearchParams, 'error');

  return (
    <main className="auth-page auth-page--centered">
      <Panel className="auth-panel auth-panel--compact">
        <div className="auth-panel__intro">
          <h1>Verificação em duas etapas</h1>
          <p>Digite o código do aplicativo autenticador ou um código de backup.</p>
        </div>

        {email ? (
          <div className="auth-banner auth-banner--notice">
            <strong>Conta</strong>
            <p>{email}</p>
          </div>
        ) : null}

        {methods.length > 0 ? (
          <div className="auth-banner auth-banner--notice">
            <strong>Métodos habilitados</strong>
            <p>{methods.join(', ')}</p>
          </div>
        ) : null}

        {error ? (
          <div className="auth-banner auth-banner--error">
            <strong>Falha na verificação</strong>
            <p>{error}</p>
          </div>
        ) : null}

        <TwoFactorChallenge />

        <div className="auth-links">
          <a href="/login">Voltar para login</a>
        </div>
      </Panel>
    </main>
  );
}

function readSearchValue(
  searchParams: Record<string, string | string[] | undefined>,
  key: 'email' | 'error'
) {
  const value = searchParams[key];

  return typeof value === 'string' ? value : undefined;
}

function readSearchList(
  searchParams: Record<string, string | string[] | undefined>,
  key: 'methods'
) {
  const value = searchParams[key];

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
}
