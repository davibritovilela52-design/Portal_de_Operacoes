'use server';

import { isAPIError } from 'better-auth/api';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '../../lib/auth';
import {
  clearPortalSession,
  persistPortalSession,
  readPortalSession
} from '../../lib/portal-session';
import { resolvePortalSessionForEmail } from '../../lib/portal-auth-session';

const defaultTenantId = process.env.OPS_PORTAL_TENANT_ID ?? 'prime-you';

export async function loginAction(formData: FormData) {
  const email = readRequired(formData, 'email').toLowerCase();

  try {
    const authResult = (await auth.api.signInEmail({
      body: {
        email,
        password: readRequired(formData, 'password')
      },
      headers: await headers()
    })) as
      | { twoFactorRedirect?: boolean; twoFactorMethods?: string[] }
      | { token: string };

    if ('twoFactorRedirect' in authResult && authResult.twoFactorRedirect) {
      const params = new URLSearchParams({
        email,
        methods: (authResult.twoFactorMethods ?? []).join(',')
      });

      redirect(`/2fa?${params.toString()}`);
    }

    const sessionResult = await resolvePortalSessionForEmail(defaultTenantId, email);

    if (!sessionResult.authenticated) {
      redirectWithMessage('/login', 'error', describeAuthFailure(sessionResult.reason));
    }

    await persistPortalSession(sessionResult.token, sessionResult.session);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirectWithMessage('/login', 'error', describeThrownError(error));
  }

  redirect('/dashboard');
}

export async function logoutAction() {
  const currentSession = await readPortalSession();

  if (currentSession) {
    await clearPortalSession();
  }

  await auth.api.signOut({
    headers: await headers()
  });

  redirect('/login');
}

function readRequired(formData: FormData, key: string): string {
  const value = formData.get(key);

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Campo obrigatorio ausente: ${key}`);
  }

  return value.trim();
}

function redirectWithMessage(
  path: string,
  key: 'notice' | 'error',
  message: string
): never {
  const params = new URLSearchParams({
    [key]: message
  });

  redirect(`${path}?${params.toString()}`);
}

function describeThrownError(error: unknown): string {
  if (isAPIError(error)) {
    if (error.status === 401) {
      return 'Email ou senha inválidos.';
    }

    if (error.status === 403) {
      return 'Verifique seu e-mail antes de entrar.';
    }

    return 'Não foi possível entrar agora. Tente novamente em instantes.';
  }

  if (error instanceof Error) {
    return 'Não foi possível entrar agora. Tente novamente em instantes.';
  }

  return 'Não foi possível entrar agora. Tente novamente em instantes.';
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
      return 'Não foi possível entrar agora. Tente novamente em instantes.';
  }
}
