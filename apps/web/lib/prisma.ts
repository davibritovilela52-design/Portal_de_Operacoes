import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '@ops-portal/prisma-client';

type PrismaClientInstance = InstanceType<typeof PrismaClient>;

const globalForPrisma = globalThis as typeof globalThis & {
  __opsPortalPrisma?: PrismaClientInstance;
};

function readDatabaseUrl(): string {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is required to initialize the web Prisma client.');
  }

  return connectionString;
}

export const prisma =
  globalForPrisma.__opsPortalPrisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: readDatabaseUrl() })
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__opsPortalPrisma = prisma;
}
