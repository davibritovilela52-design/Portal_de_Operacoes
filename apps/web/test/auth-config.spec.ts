import { beforeEach, describe, expect, it, vi } from 'vitest';

const betterAuthMock = vi.fn((options) => ({
  options
}));
const prismaAdapterMock = vi.fn(() => ({
  adapter: 'prisma'
}));
const twoFactorMock = vi.fn(() => ({
  plugin: 'two-factor'
}));

vi.mock('better-auth', () => ({
  betterAuth: betterAuthMock
}));

vi.mock('better-auth/adapters/prisma', () => ({
  prismaAdapter: prismaAdapterMock
}));

vi.mock('better-auth/plugins', () => ({
  twoFactor: twoFactorMock
}));

vi.mock('../lib/auth-email', () => ({
  buildPasswordResetUrl: vi.fn(() => 'https://example.com/reset'),
  buildVerificationUrl: vi.fn(() => 'https://example.com/verify'),
  sendAuthEmail: vi.fn()
}));

vi.mock('../lib/prisma', () => ({
  prisma: {
    client: 'prisma'
  }
}));

describe('auth config', () => {
  beforeEach(() => {
    process.env.BETTER_AUTH_SECRET = 'test-better-auth-secret';
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('forces TECNICO for user role on creation and update', async () => {
    const authModule = await import('../lib/auth');
    const options = betterAuthMock.mock.calls[0]?.[0];

    expect(authModule.publicRegistrationRole).toBe('TECNICO');
    expect(prismaAdapterMock).toHaveBeenCalled();
    expect(twoFactorMock).toHaveBeenCalled();
    expect(options.user.additionalFields.role).toMatchObject({
      type: 'string',
      required: false,
      defaultValue: 'TECNICO',
      returned: false
    });

    await expect(
      options.databaseHooks.user.create.before(
        {
          email: 'tech@example.com',
          name: 'Tech User',
          role: 'ADMIN'
        },
        null
      )
    ).resolves.toEqual({
      data: {
        email: 'tech@example.com',
        name: 'Tech User',
        role: 'TECNICO'
      }
    });

    await expect(
      options.databaseHooks.user.update.before(
        {
          name: 'Updated User',
          role: 'ADMIN'
        },
        null
      )
    ).resolves.toEqual({
      data: {
        name: 'Updated User',
        role: 'TECNICO'
      }
    });
  });
});
