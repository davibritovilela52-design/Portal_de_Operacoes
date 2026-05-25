import { Injectable, UnauthorizedException } from '@nestjs/common';

import { type AccessActor } from '../access/access-policy.service.js';
import { verifyPortalSession } from './portal-session-codec.js';

type PortalSessionConfig = {
  sessionSecret: string;
};

@Injectable()
export class PortalSessionService {
  private readonly config: PortalSessionConfig = readPortalSessionConfigFromEnv();

  resolveActor(
    _bodyActor: AccessActor | undefined,
    sessionToken?: string
  ): AccessActor {
    if (!sessionToken) {
      throw new UnauthorizedException('Portal session is required.');
    }

    const claims = verifyPortalSession(sessionToken, this.config.sessionSecret);

    if (!claims) {
      throw new UnauthorizedException('Portal session is invalid or expired.');
    }

    return {
      userId: claims.userId,
      tenantId: claims.tenantId,
      role: claims.role,
      assetIds: claims.assetIds
    };
  }
}

function readPortalSessionConfigFromEnv(): PortalSessionConfig {
  const sessionSecret = process.env.OPS_PORTAL_SESSION_SECRET?.trim();

  if (!sessionSecret) {
    throw new Error('OPS_PORTAL_SESSION_SECRET is required to validate portal sessions.');
  }

  return {
    sessionSecret
  };
}
