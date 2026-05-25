import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '../../lib/auth';

type VerifyEmailPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function VerifyEmailPage({
  searchParams
}: VerifyEmailPageProps) {
  const resolvedSearchParams = await (searchParams ?? Promise.resolve({}));
  const token = readSearchMessage(resolvedSearchParams, 'token');

  if (!token) {
    redirect('/login?error=Token%20de%20verifica%C3%A7%C3%A3o%20ausente.');
  }

  try {
    await auth.api.verifyEmail({
      query: {
        token
      },
      headers: await headers()
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Falha inesperada ao verificar o e-mail.';
    redirect(`/login?error=${encodeURIComponent(message)}`);
  }

  redirect('/login?notice=E-mail%20verificado.%20Agora%20fa%C3%A7a%20login.');
}

function readSearchMessage(
  searchParams: Record<string, string | string[] | undefined>,
  key: 'token'
) {
  const value = searchParams[key];

  return typeof value === 'string' ? value : undefined;
}
