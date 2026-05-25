import { describe, expect, it } from 'vitest';

import { signPortalSession, verifyPortalSession } from '../lib/portal-session-codec';

const secret = 'ops-portal-dev-session-secret';
const claims = {
  version: 1 as const,
  userId: 'user-123',
  tenantId: 'prime-you',
  role: 'central_operations' as const,
  assetIds: ['asset-1'],
  displayName: 'D. Vecchi',
  email: 'dvecchi@primeyou.com.br',
  mfaVerified: false,
  expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
};

describe('portal session codec', () => {
  it('round-trips a signed session token', () => {
    const token = signPortalSession(claims, secret);

    expect(verifyPortalSession(token, secret)).toEqual(claims);
  });

  it('rejects a token signed with another secret', () => {
    const token = signPortalSession(claims, secret);

    expect(verifyPortalSession(token, 'wrong-secret')).toBeNull();
  });
});
