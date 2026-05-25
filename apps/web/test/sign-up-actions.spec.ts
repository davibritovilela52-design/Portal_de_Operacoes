import { beforeEach, describe, expect, it, vi } from 'vitest';

const redirectMock = vi.fn((path: string) => {
  const error = new Error(`Redirecting to ${path}`) as Error & { digest?: string };
  error.digest = 'NEXT_REDIRECT';
  throw error;
});

const signUpEmailMock = vi.fn();

vi.mock('next/navigation', () => ({
  redirect: redirectMock
}));

vi.mock('next/headers', () => ({
  headers: async () => new Headers()
}));

vi.mock('../lib/auth', () => ({
  auth: {
    api: {
      signUpEmail: signUpEmailMock
    }
  }
}));

describe('sign-up actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not forward role from a tampered form payload', async () => {
    signUpEmailMock.mockResolvedValue({
      token: null,
      user: {
        id: 'user-1'
      }
    });

    const { signUpAction } = await import('../app/sign-up/actions');
    const formData = new FormData();
    formData.set('email', 'TECH@EXAMPLE.COM');
    formData.set('name', 'Tech User');
    formData.set('password', 'Test1234!');
    formData.set('confirmPassword', 'Test1234!');
    formData.set('role', 'ADMIN');

    await expect(signUpAction(formData)).rejects.toMatchObject({
      digest: 'NEXT_REDIRECT'
    });

    expect(signUpEmailMock).toHaveBeenCalledWith({
      body: {
        email: 'tech@example.com',
        name: 'Tech User',
        password: 'Test1234!'
      },
      headers: expect.any(Headers)
    });
    expect(signUpEmailMock.mock.calls[0]?.[0]?.body).not.toHaveProperty('role');
    expect(redirectMock).toHaveBeenCalledWith(
      '/login?notice=Conta+criada.+Verifique+seu+e-mail+para+ativar+o+acesso.'
    );
  });

  it('rejects mismatched passwords before reaching better-auth', async () => {
    const { signUpAction } = await import('../app/sign-up/actions');
    const formData = new FormData();
    formData.set('email', 'tech@example.com');
    formData.set('name', 'Tech User');
    formData.set('password', 'Test1234!');
    formData.set('confirmPassword', 'Different123!');
    formData.set('role', 'ADMIN');

    await expect(signUpAction(formData)).rejects.toMatchObject({
      digest: 'NEXT_REDIRECT'
    });

    expect(signUpEmailMock).not.toHaveBeenCalled();
    expect(redirectMock).toHaveBeenCalledWith(
      '/sign-up?error=As+senhas+precisam+ser+iguais.'
    );
  });
});
