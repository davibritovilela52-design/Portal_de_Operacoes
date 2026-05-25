'use server';

import { headers } from 'next/headers';

import { auth } from '../../lib/auth';
import { persistPortalSession } from '../../lib/portal-session';
import { resolvePortalSessionForEmail } from '../../lib/portal-auth-session';

const defaultTenantId = process.env.OPS_PORTAL_TENANT_ID ?? 'prime-you';

export async function finalizeTwoFactorAction() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session?.user?.email) {
    return {
      ok: false,
      message: 'Não foi possível concluir a autenticação.'
    };
  }

  const result = await resolvePortalSessionForEmail(defaultTenantId, session.user.email, {
    mfaVerified: true
  });

  if (!result.authenticated) {
    return {
      ok: false,
      message: describeAuthFailure(result.reason)
    };
  }

  await persistPortalSession(result.token, result.session);

  return {
    ok: true as const
  };
}

function describeAuthFailure(reason: string): string {
  switch (reason) {
    case 'INVALID_CREDENTIALS':
      return 'Email ou senha inválidos.';
    case 'ASSIGNMENT_NOT_FOUND':
      return 'Não existe acesso ativo para este email.';
    case 'MULTIPLE_ACTIVE_ASSIGNMENTS':
      return 'Existe mais de um acesso ativo para este email. Consolide os acessos antes do login.';
    default:
      return `Login recusado: ${reason}.`;
  }
}
