import 'reflect-metadata';

import { SELF_DECLARED_DEPS_METADATA } from '@nestjs/common/constants';
import { describe, expect, it, vi } from 'vitest';

import {
  ObservabilityHealthIndicatorService,
  ObservabilityHealthService
} from '../src/modules/observability/observability-health.service.js';
import { PrismaService } from '../src/modules/persistence/prisma.service.js';

describe('ObservabilityHealthService', () => {
  it('declares a concrete Nest injection token for the health indicator dependency', () => {
    const [indicatorDependency] =
      Reflect.getMetadata(SELF_DECLARED_DEPS_METADATA, ObservabilityHealthService) ?? [];

    expect(indicatorDependency?.param).toBe(ObservabilityHealthIndicatorService);
  });

  it('returns a healthy report when all critical components are up', async () => {
    const service = new ObservabilityHealthService({
      checkApi: async () => ({ status: 'up' }),
      checkDb: async () => ({ status: 'up' }),
      checkQueue: async () => ({ status: 'up' }),
      checkStorage: async () => ({ status: 'up' })
    });

    await expect(service.evaluateHealth()).resolves.toEqual({
      overallStatus: 'up',
      components: {
        api: { status: 'up' },
        db: { status: 'up' },
        queue: { status: 'up' },
        storage: { status: 'up' }
      }
    });
  });

  it('emits an actionable alert when a critical component health check fails', async () => {
    const service = new ObservabilityHealthService({
      checkApi: async () => ({ status: 'up' }),
      checkDb: async () => ({ status: 'down', detail: 'database connection timeout' }),
      checkQueue: async () => ({ status: 'up' }),
      checkStorage: async () => ({ status: 'down', detail: 'storage backend unavailable' })
    });

    await expect(service.evaluateHealth()).resolves.toEqual({
      overallStatus: 'down',
      components: {
        api: { status: 'up' },
        db: { status: 'down', detail: 'database connection timeout' },
        queue: { status: 'up' },
        storage: { status: 'down', detail: 'storage backend unavailable' }
      },
      actionableAlert: {
        failedComponents: ['db', 'storage'],
        message: 'Critical health check failure detected for db, storage.'
      }
    });
  });
});

describe('ObservabilityHealthIndicatorService', () => {
  it('declares PrismaService as the concrete Nest dependency for database health checks', () => {
    const [prismaDependency] =
      Reflect.getMetadata(SELF_DECLARED_DEPS_METADATA, ObservabilityHealthIndicatorService) ?? [];

    expect(prismaDependency?.param).toBe(PrismaService);
  });

  it('reports api health using live process memory data', async () => {
    const indicator = new ObservabilityHealthIndicatorService({
      $queryRaw: vi.fn()
    } as unknown as PrismaService);

    await expect(indicator.checkApi()).resolves.toMatchObject({
      status: 'up',
      detail: expect.stringContaining('checkedAt=')
    });
  });

  it('reports database health as up when SELECT 1 succeeds', async () => {
    const prisma = {
      $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }])
    } as unknown as PrismaService;
    const indicator = new ObservabilityHealthIndicatorService(prisma);

    await expect(indicator.checkDb()).resolves.toEqual({ status: 'up' });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('marks the overall report as down and emits an actionable alert when the database probe fails', async () => {
    const prisma = {
      $queryRaw: vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED invalid-db-host'))
    } as unknown as PrismaService;
    const indicator = new ObservabilityHealthIndicatorService(prisma);
    const service = new ObservabilityHealthService(indicator);

    await expect(service.evaluateHealth()).resolves.toEqual({
      overallStatus: 'down',
      components: {
        api: {
          status: 'up',
          detail: expect.stringContaining('checkedAt=')
        },
        db: { status: 'down', detail: 'connect ECONNREFUSED invalid-db-host' },
        queue: { status: 'up', detail: 'queue not configured in phase 1' },
        storage: { status: 'up', detail: 'storage check not implemented' }
      },
      actionableAlert: {
        failedComponents: ['db'],
        message: 'Critical health check failure detected for db.'
      }
    });
  });

  it('documents the phase 1 queue and storage checks explicitly', async () => {
    const indicator = new ObservabilityHealthIndicatorService({
      $queryRaw: vi.fn()
    } as unknown as PrismaService);

    await expect(indicator.checkQueue()).resolves.toEqual({
      status: 'up',
      detail: 'queue not configured in phase 1'
    });
    await expect(indicator.checkStorage()).resolves.toEqual({
      status: 'up',
      detail: 'storage check not implemented'
    });
  });
});
