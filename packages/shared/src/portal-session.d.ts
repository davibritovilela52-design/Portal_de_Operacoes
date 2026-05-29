export type PortalSessionRole = 'portal_admin' | 'central_operations' | 'yachts_operations' | 'yachts_technical_coordination' | 'yachts_management' | 'aviation_pilots' | 'aviation_operations' | 'aviation_technical_coordination' | 'aviation_crew' | 'aviation_management' | 'cars_operations' | 'cars_driver' | 'cars_management' | 'real_estate_operations' | 'real_estate_projects' | 'real_estate_houses' | 'real_estate_gta' | 'real_estate_management' | 'asset_field_team';
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
