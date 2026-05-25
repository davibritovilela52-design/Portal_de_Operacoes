export type PortalSessionRole = 'portal_admin' | 'central_operations' | 'yachts_technical_coordination' | 'asset_field_team';
export type PortalSessionClaims = {
    version: 1;
    userId: string;
    tenantId: string;
    role: PortalSessionRole;
    assetIds: string[];
    displayName: string;
    email: string;
    mfaVerified: boolean;
    expiresAt: string;
};
export declare function signPortalSession(claims: PortalSessionClaims, secret: string): string;
export declare function verifyPortalSession(token: string, secret: string, now?: Date): PortalSessionClaims | null;
//# sourceMappingURL=portal-session.d.ts.map