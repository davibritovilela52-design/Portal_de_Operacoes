import { createHmac } from 'node:crypto';

import { prisma } from './prisma';
import { type PortalSessionClaims } from './portal-session-codec';
import { readRequiredEnv } from './runtime-config';

type PortalSessionResolution =
  | {
      authenticated: true;
      token: string;
      session: PortalSessionClaims;
    }
  | {
      authenticated: false;
      reason: 'ASSIGNMENT_NOT_FOUND' | 'MULTIPLE_ACTIVE_ASSIGNMENTS';
    };

const validPortalRoles = new Set<PortalSessionClaims['role']>([
  'portal_admin',
  'central_operations',
  'yachts_operations',
  'yachts_technical_coordination',
  'yachts_management',
  'aviation_pilots',
  'aviation_operations',
  'aviation_technical_coordination',
  'aviation_crew',
  'aviation_management',
  'cars_operations',
  'cars_driver',
  'cars_management',
  'real_estate_operations',
  'real_estate_projects',
  'real_estate_houses',
  'real_estate_gta',
  'real_estate_management',
  'asset_field_team'
]);

export async function resolvePortalSessionForEmail(
  tenantId: string,
  email: string,
  options: {
    mfaVerified?: boolean;
  } = {}
): Promise<PortalSessionResolution> {
  const assignments = await prisma.accessAssignment.findMany({
    where: {
      tenantId,
      email: email.trim().toLowerCase(),
      revokedAt: null
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  if (assignments.length === 0) {
    return {
      authenticated: false,
      reason: 'ASSIGNMENT_NOT_FOUND'
    };
  }

  if (assignments.length > 1) {
    return {
      authenticated: false,
      reason: 'MULTIPLE_ACTIVE_ASSIGNMENTS'
    };
  }

  const assignment = assignments[0];

  if (!validPortalRoles.has(assignment.role as PortalSessionClaims['role'])) {
    return {
      authenticated: false,
      reason: 'ASSIGNMENT_NOT_FOUND'
    };
  }

  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
  const session: PortalSessionClaims = {
    version: 1,
    userId: assignment.userId,
    tenantId: assignment.tenantId,
    role: assignment.role as PortalSessionClaims['role'],
    assetIds: assignment.assetIds,
    displayName: assignment.displayName,
    email: assignment.email,
    mfaVerified: options.mfaVerified ?? false,
    expiresAt
  };

  return {
    authenticated: true,
    token: signPortalSession(session, readPortalSessionSecret()),
    session
  };
}

function readPortalSessionSecret(): string {
  return readRequiredEnv('OPS_PORTAL_SESSION_SECRET');
}

function signPortalSession(
  claims: PortalSessionClaims,
  secret: string
): string {
  const encodedPayload = Buffer.from(JSON.stringify(claims), 'utf8').toString('base64url');
  const encodedSignature = createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');

  return `${encodedPayload}.${encodedSignature}`;
}
