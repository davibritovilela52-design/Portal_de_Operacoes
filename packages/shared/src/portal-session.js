import { createHmac, timingSafeEqual } from 'node:crypto';
export function signPortalSession(claims, secret) {
    const encodedPayload = encodeBase64Url(JSON.stringify(claims));
    const encodedSignature = encodeBase64Url(signPayload(encodedPayload, secret));
    return `${encodedPayload}.${encodedSignature}`;
}
export function verifyPortalSession(token, secret, now = new Date()) {
    const [encodedPayload, encodedSignature] = token.split('.');
    if (!encodedPayload || !encodedSignature) {
        return null;
    }
    const expectedSignature = Buffer.from(signPayload(encodedPayload, secret));
    const receivedSignature = decodeBase64Url(encodedSignature);
    if (receivedSignature.length === 0 ||
        receivedSignature.length !== expectedSignature.length ||
        !timingSafeEqual(receivedSignature, expectedSignature)) {
        return null;
    }
    try {
        const payload = JSON.parse(decodeBase64Url(encodedPayload).toString('utf8'));
        if (!isPortalSessionClaims(payload)) {
            return null;
        }
        const expiresAt = new Date(payload.expiresAt);
        if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= now.getTime()) {
            return null;
        }
        return payload;
    }
    catch {
        return null;
    }
}
function signPayload(payload, secret) {
    return createHmac('sha256', secret).update(payload).digest('base64url');
}
function encodeBase64Url(value) {
    return Buffer.from(value, 'utf8').toString('base64url');
}
function decodeBase64Url(value) {
    try {
        return Buffer.from(value, 'base64url');
    }
    catch {
        return Buffer.alloc(0);
    }
}
function isPortalSessionClaims(value) {
    return (value.version === 1 &&
        typeof value.userId === 'string' &&
        typeof value.tenantId === 'string' &&
        isPortalSessionRole(value.role) &&
        Array.isArray(value.assetIds) &&
        value.assetIds.every((item) => typeof item === 'string') &&
        typeof value.displayName === 'string' &&
        typeof value.email === 'string' &&
        typeof value.mfaVerified === 'boolean' &&
        typeof value.expiresAt === 'string');
}
function isPortalSessionRole(value) {
    return (value === 'portal_admin' ||
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
        value === 'asset_field_team');
}
//# sourceMappingURL=portal-session.js.map
