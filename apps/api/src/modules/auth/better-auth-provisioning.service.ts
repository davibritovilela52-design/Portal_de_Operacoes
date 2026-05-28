import { randomUUID } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../persistence/prisma.service.js';

export type PortalOnboardingCommand = {
  email: string;
  displayName: string;
  shouldSendVerificationEmail: boolean;
  shouldSendPasswordReset: boolean;
};

type BetterAuthUserRecord = {
  id: string;
  emailVerified: boolean;
  name: string;
};

@Injectable()
export class BetterAuthProvisioningService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: {
      user: {
        findUnique(args: {
          where: { email: string };
          select: { id: boolean; emailVerified: boolean; name: boolean };
        }): Promise<BetterAuthUserRecord | null>;
        update(args: {
          where: { email: string };
          data: { name?: string };
        }): Promise<BetterAuthUserRecord>;
      };
    }
  ) {}

  async ensurePortalUser(command: PortalOnboardingCommand): Promise<void> {
    const email = command.email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        emailVerified: true,
        name: true
      }
    });

    if (!existingUser) {
      await this.createBetterAuthUser({
        email,
        name: command.displayName
      });

      await this.requestPasswordReset(email);

      return;
    }

    if (existingUser.name !== command.displayName) {
      await this.prisma.user.update({
        where: { email },
        data: {
          name: command.displayName
        }
      });
    }

    if (command.shouldSendVerificationEmail && existingUser.emailVerified === false) {
      await this.sendVerificationEmail(email);
    }

    if (command.shouldSendPasswordReset) {
      await this.requestPasswordReset(email);
    }
  }

  private async createBetterAuthUser(input: { email: string; name: string }): Promise<void> {
    await this.postAuthJson('/sign-up/email', {
      email: input.email,
      name: input.name,
      password: this.buildBootstrapPassword()
    });
  }

  private async sendVerificationEmail(email: string): Promise<void> {
    await this.postAuthJson('/send-verification-email', {
      email
    });
  }

  private async requestPasswordReset(email: string): Promise<void> {
    await this.postAuthJson('/request-password-reset', {
      email
    });
  }

  private async postAuthJson(path: string, body: Record<string, unknown>): Promise<void> {
    const response = await fetch(this.buildAuthUrl(path), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Better Auth request failed for ${path}: ${response.status} ${errorText}`
      );
    }
  }

  private buildAuthUrl(path: string): string {
    return new URL(`/api/auth${path}`, readBetterAuthBaseUrl()).toString();
  }

  private buildBootstrapPassword(): string {
    return `Bootstrap-${cryptoRandomSegment()}-${cryptoRandomSegment()}-${cryptoRandomSegment()}!`;
  }
}

function readBetterAuthBaseUrl(): string {
  const configuredBaseUrl =
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ??
    'http://localhost:3000';

  return normalizeLoopbackBaseUrl(configuredBaseUrl);
}

function normalizeLoopbackBaseUrl(baseUrl: string): string {
  const url = new URL(baseUrl);

  if (url.hostname === '127.0.0.1') {
    url.hostname = 'localhost';
  }

  return url.toString();
}

function cryptoRandomSegment(): string {
  return randomUUID().replace(/-/g, '').slice(0, 8);
}
