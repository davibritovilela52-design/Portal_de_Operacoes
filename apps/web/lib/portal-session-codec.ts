import { createHmac, timingSafeEqual } from 'node:crypto';

import { type PortalRole } from './portal-model';

export type PortalSessionClaims = {
  version: 1;
  userId: string;
  tenantId: string;
  role: PortalRole;
  assetIds: string[];
  displayName: string;
  email: string;
  mfaVerified: boolean;
  expiresAt: string;
};

export function signPortalSession(
  claims: PortalSessionClaims,
  secret: string
): string {
  const encodedPayload = encodeBase64Url(JSON.stringify(claims));
  const encodedSignature = signPayload(encodedPayload, secret);

  return `${encodedPayload}.${encodedSignature}`;
}

export function verifyPortalSession(
  token: string,
  secret: string,
  now: Date = new Date()
): PortalSessionClaims | null {
  const [encodedPayload, encodedSignature] = token.split('.');

  if (!encodedPayload || !encodedSignature) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload, secret);
  const receivedSignature = Buffer.from(encodedSignature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (
    receivedSignature.length !== expectedSignatureBuffer.length ||
    !timingSafeEqual(receivedSignature, expectedSignatureBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      decodeBase64Url(encodedPayload).toString('utf8')
    ) as Partial<PortalSessionClaims>;

    if (!isPortalSessionClaims(payload)) {
      return null;
    }

    const expiresAt = new Date(payload.expiresAt);

    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= now.getTime()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decodeBase64Url(value: string): Buffer {
  try {
    return Buffer.from(value, 'base64url');
  } catch {
    return Buffer.alloc(0);
  }
}

function isPortalSessionClaims(
  value: Partial<PortalSessionClaims>
): value is PortalSessionClaims {
  return (
    value.version === 1 &&
    typeof value.userId === 'string' &&
    typeof value.tenantId === 'string' &&
    isPortalRole(value.role) &&
    Array.isArray(value.assetIds) &&
    value.assetIds.every((item) => typeof item === 'string') &&
    typeof value.displayName === 'string' &&
    typeof value.email === 'string' &&
    typeof value.mfaVerified === 'boolean' &&
    typeof value.expiresAt === 'string'
  );
}

function isPortalRole(value: unknown): value is PortalRole {
  return (
    value === 'portal_admin' ||
    value === 'central_operations' ||
    value === 'yachts_operations' ||
    value === 'yachts_technical_coordination' ||
    value === 'yachts_management' ||
    value === 'aviation_pilots' ||
    value === 'aviation_operations' ||
    value === 'aviation_technical_coordination' ||
    value === 'aviation_crew' ||
    value === 'aviation_management' ||
    value === 'cars_operations' ||
    value === 'cars_driver' ||
    value === 'cars_management' ||
    value === 'real_estate_operations' ||
    value === 'real_estate_projects' ||
    value === 'real_estate_houses' ||
    value === 'real_estate_gta' ||
    value === 'real_estate_management' ||
    value === 'asset_field_team'
  );
}
