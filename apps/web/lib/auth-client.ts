import { createAuthClient } from 'better-auth/client';
import { twoFactorClient } from 'better-auth/client/plugins';

type TwoFactorSetupResponse = {
  totpURI: string;
  backupCodes: string[];
};

type TwoFactorActionResponse<T> = {
  data: T | null;
  error: unknown | null;
};

type TwoFactorAuthClient = {
  twoFactor: {
    enable(input: { password: string }): Promise<TwoFactorActionResponse<TwoFactorSetupResponse>>;
    disable(input: { password: string }): Promise<TwoFactorActionResponse<{ status: boolean }>>;
    generateBackupCodes(
      input: { password: string }
    ): Promise<TwoFactorActionResponse<{ backupCodes: string[] }>>;
    verifyTotp(input: {
      code: string;
      trustDevice?: boolean;
    }): Promise<TwoFactorActionResponse<{ token: string }>>;
    verifyBackupCode(input: {
      code: string;
      trustDevice?: boolean;
    }): Promise<TwoFactorActionResponse<{ token: string }>>;
  };
};

const authBaseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? process.env.BETTER_AUTH_URL;
const authClientOptions = authBaseUrl
  ? {
      baseURL: authBaseUrl,
      plugins: [
        twoFactorClient({
          twoFactorPage: '/2fa'
        })
      ]
    }
  : {
      plugins: [
        twoFactorClient({
          twoFactorPage: '/2fa'
        })
      ]
    };

export const authClient = createAuthClient(authClientOptions) as unknown as TwoFactorAuthClient;
