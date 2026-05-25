import 'dotenv/config';

import { hashPassword } from '@better-auth/utils/password';

import { auth } from '../../web/lib/auth';
import { prisma } from '../../web/lib/prisma';
import {
  requestedRoster,
  type AccessRosterEntry
} from './access-roster-data';

type CliOptions = {
  apply: boolean;
};

type UserStatus = 'missing' | 'existing';

type BetterAuthRosterPlanEntry = AccessRosterEntry & {
  userStatus: UserStatus;
  emailVerified: boolean | null;
};

const defaultOptions: CliOptions = {
  apply: false
};

async function main() {
  const options = parseCliArguments(process.argv.slice(2));
  const plan = await buildPlan(requestedRoster);

  if (!options.apply) {
    console.log(
      JSON.stringify(
        {
          mode: 'dry-run',
          totalUsers: plan.length,
          missingUsers: plan.filter((entry) => entry.userStatus === 'missing').length,
          verifiedUsers: plan.filter((entry) => entry.emailVerified === true).length,
          unverifiedUsers: plan.filter((entry) => entry.emailVerified === false).length,
          bootstrapPasswordSource: readBootstrapPasswordSource(),
          plan
        },
        null,
        2
      )
    );
    return;
  }

  const results = [];

  for (const entry of plan) {
    const result = await ensureBetterAuthUser(entry);
    results.push(result);
  }

  console.log(
    JSON.stringify(
      {
        mode: 'apply',
        totalUsers: results.length,
        createdUsers: results.filter((entry) => entry.created).length,
        reusedUsers: results.filter((entry) => !entry.created).length,
        passwordUpdatedUsers: results.filter((entry) => entry.passwordUpdated).length,
        emailVerifiedUsers: results.filter((entry) => entry.emailVerifiedUpdated).length,
        results
      },
      null,
      2
    )
  );
}

function parseCliArguments(argv: string[]): CliOptions {
  const options: CliOptions = {
    ...defaultOptions
  };

  for (const argument of argv) {
    switch (argument) {
      case '--apply':
        options.apply = true;
        break;
      default:
        throw new Error(`Unknown argument: ${argument}`);
    }
  }

  return options;
}

async function buildPlan(entries: AccessRosterEntry[]): Promise<BetterAuthRosterPlanEntry[]> {
  const rows = await prisma.user.findMany({
    where: {
      email: {
        in: entries.map((entry) => entry.email.trim().toLowerCase())
      }
    },
    select: {
      email: true,
      emailVerified: true
    }
  });

  const rowsByEmail = new Map(rows.map((row) => [row.email.toLowerCase(), row]));

  return entries.map((entry) => {
    const normalizedEmail = entry.email.trim().toLowerCase();
    const user = rowsByEmail.get(normalizedEmail);

    return {
      ...entry,
      email: normalizedEmail,
      userStatus: user ? 'existing' : 'missing',
      emailVerified: user?.emailVerified ?? null
    };
  });
}

async function ensureBetterAuthUser(
  entry: BetterAuthRosterPlanEntry
): Promise<{
  email: string;
  created: boolean;
  passwordUpdated: boolean;
  emailVerifiedUpdated: boolean;
  userId?: string;
  userStatus: UserStatus;
}> {
  const bootstrapPassword = readBootstrapPassword();
  const encodedPassword = await hashPassword(bootstrapPassword);
  let created = false;
  let passwordUpdated = false;
  let emailVerifiedUpdated = false;

  if (entry.userStatus === 'missing') {
    try {
      await auth.api.signUpEmail({
        body: {
          email: entry.email,
          name: entry.displayName,
          password: bootstrapPassword
        }
      });

      created = true;
    } catch {
      const user = await prisma.user.findUnique({
        where: {
          email: entry.email
        },
        select: {
          id: true,
          emailVerified: true
        }
      });

      if (!user) {
        throw new Error(`Failed to create Better Auth user for ${entry.email}`);
      }
    }
  }

  const user = await prisma.user.findUnique({
    where: {
      email: entry.email
    },
    select: {
      id: true,
      emailVerified: true
    }
  });

  if (!user) {
    throw new Error(`Failed to resolve Better Auth user for ${entry.email}`);
  }

  const accountUpdateResult = await prisma.account.updateMany({
    where: {
      userId: user.id,
      providerId: 'credential'
    },
    data: {
      password: encodedPassword
    }
  });

  if (accountUpdateResult.count === 0) {
    throw new Error(`Failed to update credential password for ${entry.email}`);
  }

  passwordUpdated = true;

  if (!user.emailVerified) {
    await prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        emailVerified: true
      }
    });

    emailVerifiedUpdated = true;
  }

  if (entry.userStatus === 'missing' && !created) {
    throw new Error(`Failed to create Better Auth user for ${entry.email}`);
  }

  return {
    email: entry.email,
    created,
    passwordUpdated,
    emailVerifiedUpdated,
    userId: user.id,
    userStatus: entry.userStatus
  };
}

function readBootstrapPasswordSource(): string {
  if (process.env.OPS_PORTAL_AUTH_ROSTER_PASSWORD) {
    return 'OPS_PORTAL_AUTH_ROSTER_PASSWORD';
  }

  if (process.env.OPS_PORTAL_BRIDGE_PASSWORD) {
    return 'OPS_PORTAL_BRIDGE_PASSWORD';
  }

  return 'fallback-default';
}

function readBootstrapPassword(): string {
  return (
    process.env.OPS_PORTAL_AUTH_ROSTER_PASSWORD ??
    process.env.OPS_PORTAL_BRIDGE_PASSWORD ??
    'PrimeYouYachts2026!'
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
