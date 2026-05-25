import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { Panel } from '../../components/portal-ui';
import { auth } from '../../lib/auth';
import { readPortalSession } from '../../lib/portal-session';
import { TwoFactorSecurityPanel } from './two-factor-security-panel';

export default async function SecurityPage() {
  const portalSession = await readPortalSession();

  if (!portalSession) {
    redirect('/login');
  }

  const session = await auth.api.getSession({
    headers: await headers()
  });

  const email = session?.user?.email ?? portalSession.claims.email;
  const twoFactorEnabled = Boolean(session?.user?.twoFactorEnabled ?? portalSession.claims.mfaVerified);

  return (
    <main className="page">
      <Panel>
        <div className="page-header">
          <div>
            <div className="eyebrow">Conta</div>
            <h1>Segurança da conta</h1>
            <p>Ative ou revogue a verificação em duas etapas do Better Auth.</p>
          </div>
        </div>

        <TwoFactorSecurityPanel email={email} twoFactorEnabled={twoFactorEnabled} />
      </Panel>
    </main>
  );
}
