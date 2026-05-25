import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resolvePortalSessionForEmail } from '../lib/portal-auth-session';

const { findManyMock } = vi.hoisted(() => ({
  findManyMock: vi.fn()
}));

vi.mock('../lib/prisma', () => ({
  prisma: {
    accessAssignment: {
      findMany: findManyMock
    }
  }
}));

describe('portal auth session', () => {
  beforeEach(() => {
    process.env.OPS_PORTAL_SESSION_SECRET = 'test-portal-session-secret';
    vi.clearAllMocks();
  });

  it('allows yachts operations assignments to create a portal session', async () => {
    findManyMock.mockResolvedValue([
      {
        id: 'assignment-1',
        tenantId: 'prime-you',
        userId: 'operacoes-yachts-sfouyer',
        displayName: 'S. Fouyer',
        email: 'sfouyer@primeyou.com.br',
        role: 'yachts_operations',
        assetIds: [],
        mfaEnabled: true,
        lastReviewedAt: new Date('2026-05-21T12:25:16.687Z'),
        revokedAt: null,
        createdAt: new Date('2026-05-19T12:48:21.933Z'),
        updatedAt: new Date('2026-05-21T12:25:16.687Z')
      }
    ]);

    const result = await resolvePortalSessionForEmail(
      'prime-you',
      'sfouyer@primeyou.com.br'
    );

    expect(result.authenticated).toBe(true);
    if (result.authenticated) {
      expect(result.session.role).toBe('yachts_operations');
      expect(result.session.email).toBe('sfouyer@primeyou.com.br');
    }
  });
});
