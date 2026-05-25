import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { twoFactor } from 'better-auth/plugins';

import { buildPasswordResetUrl, buildVerificationUrl, sendAuthEmail } from './auth-email';
import { prisma } from './prisma';
import { readRequiredEnv } from './runtime-config';

const authBaseUrl = process.env.BETTER_AUTH_URL ?? 'http://127.0.0.1:3002';
const publicRegistrationRole = 'TECNICO' as const;

export const auth = betterAuth({
  appName: 'Portal de Operações',
  baseURL: authBaseUrl,
  secret: readRequiredEnv('BETTER_AUTH_SECRET'),
  database: prismaAdapter(prisma, {
    provider: 'postgresql'
  }),
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: publicRegistrationRole,
        returned: false
      }
    }
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => ({
          data: {
            ...user,
            role: publicRegistrationRole
          }
        })
      },
      update: {
        before: async (user) => ({
          data: {
            ...user,
            role: publicRegistrationRole
          }
        })
      }
    }
  },
  plugins: [
    twoFactor({
      issuer: 'Portal de Operações',
      totpOptions: {
        digits: 6,
        period: 30
      },
      backupCodeOptions: {
        amount: 10,
        length: 10,
        storeBackupCodes: 'encrypted'
      },
      twoFactorCookieMaxAge: 600,
      trustDeviceMaxAge: 30 * 24 * 60 * 60
    })
  ],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, token }) => {
      void sendAuthEmail({
        to: user.email,
        subject: 'Redefina sua senha do Portal de Operações',
        text: `Abra ${buildPasswordResetUrl(token)} para redefinir sua senha.`,
        html: [
          '<p>Abra o link abaixo para redefinir sua senha do Portal de Operações.</p>',
          `<p><a href="${buildPasswordResetUrl(token)}">${buildPasswordResetUrl(token)}</a></p>`
        ].join('')
      });
    }
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: false,
    sendVerificationEmail: async ({ user, token }) => {
      void sendAuthEmail({
        to: user.email,
        subject: 'Verifique seu e-mail do Portal de Operações',
        text: `Abra ${buildVerificationUrl(token)} para verificar seu e-mail.`,
        html: [
          '<p>Abra o link abaixo para verificar seu e-mail do Portal de Operações.</p>',
          `<p><a href="${buildVerificationUrl(token)}">${buildVerificationUrl(token)}</a></p>`
        ].join('')
      });
    }
  }
});

export type BetterAuthSession = typeof auth.$Infer.Session;
export { publicRegistrationRole };
