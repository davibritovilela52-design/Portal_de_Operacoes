'use server';

import { isAPIError } from 'better-auth/api';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '../../lib/auth';

const redirectToResetPassword = new URL(
  '/reset-password',
  process.env.BETTER_AUTH_URL ?? 'http://127.0.0.1:3002'
).toString();

export async function forgotPasswordAction(formData: FormData) {
  const email = readRequired(formData, 'email').toLowerCase();

  try {
    await auth.api.requestPasswordReset({
      body: {
        email,
        redirectTo: redirectToResetPassword
      },
      headers: await headers()
    });
  } catch (error) {
    redirectWithMessage('/forgot-password', 'error', describeThrownError(error));
  }

  redirectWithMessage(
    '/login',
    'notice',
    'Se o e-mail existir, enviamos um link de redefinição.'
  );
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
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Falha inesperada ao solicitar a redefinição.';
}
