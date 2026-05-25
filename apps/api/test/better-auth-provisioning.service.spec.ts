import { afterEach, describe, expect, it, vi } from 'vitest';

import { BetterAuthProvisioningService } from '../src/modules/auth/better-auth-provisioning.service.js';

describe('BetterAuthProvisioningService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates a Better Auth user and queues the reset flow when the user is missing', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn()
      }
    };
    const service = new BetterAuthProvisioningService(prisma as never);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, text: async () => '' })
      .mockResolvedValueOnce({ ok: true, text: async () => '' });

    vi.stubGlobal('fetch', fetchMock);

    await service.ensurePortalUser({
      email: 'central@example.com',
      displayName: 'Central Ops',
      shouldSendVerificationEmail: true,
      shouldSendPasswordReset: true
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'central@example.com' },
      select: { id: true, emailVerified: true, name: true }
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3000/api/auth/sign-up/email',
      expect.objectContaining({
        method: 'POST'
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3000/api/auth/request-password-reset',
      expect.objectContaining({
        method: 'POST'
      })
    );
  });

  it('updates the display name and only sends explicit onboarding emails for existing users', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'user-1',
          emailVerified: false,
          name: 'Old Name'
        }),
        update: vi.fn().mockResolvedValue({
          id: 'user-1',
          emailVerified: false,
          name: 'New Name'
        })
      }
    };
    const service = new BetterAuthProvisioningService(prisma as never);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, text: async () => '' })
      .mockResolvedValueOnce({ ok: true, text: async () => '' });

    vi.stubGlobal('fetch', fetchMock);

    await service.ensurePortalUser({
      email: 'central@example.com',
      displayName: 'New Name',
      shouldSendVerificationEmail: true,
      shouldSendPasswordReset: true
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { email: 'central@example.com' },
      data: { name: 'New Name' }
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3000/api/auth/send-verification-email',
      expect.objectContaining({
        method: 'POST'
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3000/api/auth/request-password-reset',
      expect.objectContaining({
        method: 'POST'
      })
    );
  });
});
