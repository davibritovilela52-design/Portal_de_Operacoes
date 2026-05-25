'use server';

import { isAPIError } from 'better-auth/api';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '../../lib/auth';

export async function resetPasswordAction(formData: FormData) {
  const token = readRequired(formData, 'token');
  const newPassword = readRequired(formData, 'newPassword');
  const confirmPassword = readRequired(formData, 'confirmPassword');

  if (newPassword !== confirmPassword) {
    redirectWithMessage(
      `/reset-password?token=${encodeURIComponent(token)}`,
      'error',
      'As senhas precisam ser iguais.'
    );
  }

  try {
    await auth.api.resetPassword({
      body: {
        token,
        newPassword
      },
      headers: await headers()
    });
  } catch (error) {
    redirectWithMessage(
      `/reset-password?token=${encodeURIComponent(token)}`,
      'error',
      describeThrownError(error)
    );
  }

  redirectWithMessage(
    '/login',
    'notice',
    'Senha atualizada. Entre novamente com a nova senha.'
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

  return 'Falha inesperada ao redefinir a senha.';
}
