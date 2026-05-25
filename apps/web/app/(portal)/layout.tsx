import type { ReactNode } from 'react';

import { PortalShell } from '../../components/portal-shell';
import { portalRoleLabels } from '../../lib/portal-model';
import { requirePortalSession } from '../../lib/portal-session';

export const dynamic = 'force-dynamic';

type PortalLayoutProps = {
  children: ReactNode;
};

export default async function PortalLayout({ children }: PortalLayoutProps) {
  const session = await requirePortalSession();

  return (
    <PortalShell
      session={{
        displayName: session.claims.displayName,
        email: session.claims.email,
        role: session.actor.role,
        roleLabel: portalRoleLabels[session.actor.role],
        mfaVerified: session.claims.mfaVerified
      }}
    >
      {children}
    </PortalShell>
  );
}
