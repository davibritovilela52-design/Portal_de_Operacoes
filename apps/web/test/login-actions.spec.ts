import { beforeEach, describe, expect, it, vi } from 'vitest';

const redirectMock = vi.fn((path: string) => {
  const error = new Error(`Redirecting to ${path}`) as Error & { digest?: string };
  error.digest = 'NEXT_REDIRECT';
  throw error;
});

const signInEmailMock = vi.fn();
const signOutMock = vi.fn();
const resolvePortalSessionForEmailMock = vi.fn();
const persistPortalSessionMock = vi.fn();
const clearPortalSessionMock = vi.fn();
const readPortalSessionMock = vi.fn();

vi.mock('next/navigation', () => ({
  redirect: redirectMock
}));

vi.mock('next/headers', () => ({
  headers: async () => new Headers()
}));

vi.mock('next/dist/client/components/redirect-error', () => ({
  isRedirectError: (error: unknown) =>
    error instanceof Error && 'digest' in error && error.digest === 'NEXT_REDIRECT'
}));

vi.mock('../lib/auth', () => ({
  auth: {
    api: {
      signInEmail: signInEmailMock,
      signOut: signOutMock
    }
  }
}));

vi.mock('../lib/portal-auth-session', () => ({
  resolvePortalSessionForEmail: resolvePortalSessionForEmailMock
}));

vi.mock('../lib/portal-session', () => ({
  persistPortalSession: persistPortalSessionMock,
  clearPortalSession: clearPortalSessionMock,
  readPortalSession: readPortalSessionMock
}));

describe('login actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rethrows the successful redirect after persisting the session', async () => {
    signInEmailMock.mockResolvedValue({
      token: 'better-auth-session-token'
    });
    resolvePortalSessionForEmailMock.mockResolvedValue({
      authenticated: true,
      token: 'session-token',
      session: {
        version: 1,
        userId: 'portal-admin-1',
        tenantId: 'prime-you',
        role: 'portal_admin',
        assetIds: [],
        displayName: 'Portal Admin',
        email: 'portal.admin@primeyou.com',
        mfaVerified: true,
        expiresAt: '2026-05-18T23:59:59.000Z'
      }
    });
    persistPortalSessionMock.mockResolvedValue(undefined);

    const { loginAction } = await import('../app/login/actions');
    const formData = new FormData();
    formData.set('email', 'portal.admin@primeyou.com');
    formData.set('password', 'PrimeYouYachts2026!');

    await expect(loginAction(formData)).rejects.toMatchObject({
      digest: 'NEXT_REDIRECT'
    });
    expect(signInEmailMock).toHaveBeenCalledWith({
      body: {
        email: 'portal.admin@primeyou.com',
        password: 'PrimeYouYachts2026!'
      },
      headers: expect.any(Headers)
    });
    expect(resolvePortalSessionForEmailMock).toHaveBeenCalledWith(
      'prime-you',
      'portal.admin@primeyou.com'
    );
    expect(persistPortalSessionMock).toHaveBeenCalledWith('session-token', expect.any(Object));
    expect(redirectMock).toHaveBeenCalledWith('/dashboard');
  });

  it('redirects to the two-factor page when better auth requires verification', async () => {
    signInEmailMock.mockResolvedValue({
      twoFactorRedirect: true,
      twoFactorMethods: ['totp', 'backup-code']
    });

    const { loginAction } = await import('../app/login/actions');
    const formData = new FormData();
    formData.set('email', 'portal.admin@primeyou.com');
    formData.set('password', 'PrimeYouYachts2026!');

    await expect(loginAction(formData)).rejects.toMatchObject({
      digest: 'NEXT_REDIRECT'
    });
    expect(resolvePortalSessionForEmailMock).not.toHaveBeenCalled();
    expect(persistPortalSessionMock).not.toHaveBeenCalled();
    expect(redirectMock).toHaveBeenCalledWith(
      '/2fa?email=portal.admin%40primeyou.com&methods=totp%2Cbackup-code'
    );
  });

  it('signs out better auth when logging out', async () => {
    readPortalSessionMock.mockResolvedValue(null);
    signOutMock.mockResolvedValue(undefined);

    const { logoutAction } = await import('../app/login/actions');

    await expect(logoutAction()).rejects.toMatchObject({
      digest: 'NEXT_REDIRECT'
    });
    expect(clearPortalSessionMock).not.toHaveBeenCalled();
    expect(signOutMock).toHaveBeenCalledWith({
      headers: expect.any(Headers)
    });
    expect(redirectMock).toHaveBeenCalledWith('/login');
  });

  it('replaces internal errors with a generic login message', async () => {
    signInEmailMock.mockResolvedValue({
      token: 'better-auth-session-token'
    });
    resolvePortalSessionForEmailMock.mockRejectedValue(
      new Error(
        'Invalid `prisma.user.findFirst()` invocation: The table does not exist'
      )
    );

    const { loginAction } = await import('../app/login/actions');
    const formData = new FormData();
    formData.set('email', 'portal.admin@boatflow.local');
    formData.set('password', 'PrimeYouYachts2026!');

    await expect(loginAction(formData)).rejects.toMatchObject({
      digest: 'NEXT_REDIRECT'
    });
    expect(redirectMock).toHaveBeenCalledWith(
      '/login?error=N%C3%A3o+foi+poss%C3%ADvel+entrar+agora.+Tente+novamente+em+instantes.'
    );
  });
});
