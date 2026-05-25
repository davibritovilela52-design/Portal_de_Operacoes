'use server';

import { isAPIError } from 'better-auth/api';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '../../lib/auth';

export async function signUpAction(formData: FormData) {
  const email = readRequired(formData, 'email').toLowerCase();
  const name = readRequired(formData, 'name');
  const password = readRequired(formData, 'password');
  const confirmPassword = readRequired(formData, 'confirmPassword');

  if (password !== confirmPassword) {
    redirectWithMessage('/sign-up', 'error', 'As senhas precisam ser iguais.');
  }

  try {
    await auth.api.signUpEmail({
      body: {
        email,
        password,
        name
      },
      headers: await headers()
    });
  } catch (error) {
    redirectWithMessage('/sign-up', 'error', describeThrownError(error));
  }

  redirectWithMessage(
    '/login',
    'notice',
    'Conta criada. Verifique seu e-mail para ativar o acesso.'
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
    if (error.status === 409) {
      return 'Já existe uma conta com este e-mail.';
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Falha inesperada no cadastro.';
}
