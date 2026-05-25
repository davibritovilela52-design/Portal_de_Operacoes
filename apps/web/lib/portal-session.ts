import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from './auth';
import { resolvePortalSessionForEmail } from './portal-auth-session';
import { type FrontendActor } from './portal-api';
import {
  verifyPortalSession,
  type PortalSessionClaims
} from './portal-session-codec';
import { readRequiredEnv } from './runtime-config';

export const portalSessionCookieName = 'ops_portal_session';

export type PortalSessionContext = {
  token: string;
  claims: PortalSessionClaims;
  actor: FrontendActor;
  operatorLabel: string;
};

export async function readPortalSession(): Promise<PortalSessionContext | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(portalSessionCookieName)?.value;

  if (!token) {
    return resolvePortalSessionFromBetterAuth();
  }

  const claims = verifyPortalSession(token, readPortalSessionSecret());

  if (!claims) {
    return resolvePortalSessionFromBetterAuth();
  }

  return {
    token,
    claims,
    actor: {
      userId: claims.userId,
      tenantId: claims.tenantId,
      role: claims.role,
      assetIds: claims.assetIds
    },
    operatorLabel: claims.displayName || claims.email || claims.userId
  };
}

async function resolvePortalSessionFromBetterAuth(): Promise<PortalSessionContext | null> {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session?.user?.email) {
    return null;
  }

  const resolved = await resolvePortalSessionForEmail(
    process.env.OPS_PORTAL_TENANT_ID ?? 'prime-you',
    session.user.email,
    {
      mfaVerified: true
    }
  );

  if (!resolved.authenticated) {
    return null;
  }

  return {
    token: resolved.token,
    claims: resolved.session,
    actor: {
      userId: resolved.session.userId,
      tenantId: resolved.session.tenantId,
      role: resolved.session.role,
      assetIds: resolved.session.assetIds
    },
    operatorLabel: resolved.session.displayName || resolved.session.email || resolved.session.userId
  };
}

export async function requirePortalSession(): Promise<PortalSessionContext> {
  const session = await readPortalSession();

  if (!session) {
    redirect('/login');
  }

  return session;
}

export async function requirePortalRole(
  role: FrontendActor['role']
): Promise<PortalSessionContext> {
  const session = await requirePortalSession();

  if (session.actor.role !== role) {
    redirect('/dashboard?error=Acesso%20restrito%20ao%20papel%20autenticado.');
  }

  return session;
}

export async function requirePortalRoles(
  roles: FrontendActor['role'][]
): Promise<PortalSessionContext> {
  const session = await requirePortalSession();

  if (!roles.includes(session.actor.role)) {
    redirect('/dashboard?error=Acesso%20restrito%20ao%20papel%20autenticado.');
  }

  return session;
}

export async function persistPortalSession(
  token: string,
  claims: PortalSessionClaims
): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(portalSessionCookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(claims.expiresAt)
  });
}

export async function clearPortalSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(portalSessionCookieName);
}

export function readPortalSessionSecret(): string {
  return readRequiredEnv('OPS_PORTAL_SESSION_SECRET');
}
