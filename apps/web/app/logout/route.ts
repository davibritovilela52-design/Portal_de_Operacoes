import { NextResponse } from 'next/server';

import { portalSessionCookieName } from '../../lib/portal-session';

export async function GET(request: Request) {
  const location = new URL('/login?notice=Sessao%20encerrada%20com%20sucesso.', request.url);
  const response = NextResponse.redirect(location);

  response.cookies.delete(portalSessionCookieName);

  return response;
}
