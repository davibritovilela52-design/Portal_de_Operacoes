import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../persistence/prisma.service.js';

export type ObservabilityComponentStatus = {
  status: 'up' | 'down';
  detail?: string;
};

export type ObservabilityHealthReport = {
  overallStatus: 'up' | 'down';
  components: {
    api: ObservabilityComponentStatus;
    db: ObservabilityComponentStatus;
    queue: ObservabilityComponentStatus;
    storage: ObservabilityComponentStatus;
  };
  actionableAlert?: {
    failedComponents: Array<'api' | 'db' | 'queue' | 'storage'>;
    message: string;
  };
};

export type ObservabilityHealthIndicator = {
  checkApi: () => Promise<ObservabilityComponentStatus>;
  checkDb: () => Promise<ObservabilityComponentStatus>;
  checkQueue: () => Promise<ObservabilityComponentStatus>;
  checkStorage: () => Promise<ObservabilityComponentStatus>;
};

@Injectable()
export class ObservabilityHealthIndicatorService implements ObservabilityHealthIndicator {
  constructor(
    @Inject(PrismaService)
    private readonly prismaService: PrismaService
  ) {}

  async checkApi(): Promise<ObservabilityComponentStatus> {
    try {
      const { rss, heapUsed } = process.memoryUsage();

      return {
        status: 'up',
        detail: `checkedAt=${new Date().toISOString()} rss=${rss} heapUsed=${heapUsed}`
      };
    } catch (error) {
      return {
        status: 'down',
        detail: error instanceof Error ? error.message : 'Unknown API health check error'
      };
    }
  }

  async checkDb(): Promise<ObservabilityComponentStatus> {
    try {
      await this.prismaService.$queryRaw`SELECT 1`;

      return { status: 'up' };
    } catch (error) {
      return {
        status: 'down',
        detail: error instanceof Error ? error.message : 'Unknown database health check error'
      };
    }
  }

  async checkQueue(): Promise<ObservabilityComponentStatus> {
    // Replace this with a real BullMQ probe when queue infrastructure is adopted.
    return { status: 'up', detail: 'queue not configured in phase 1' };
  }

  async checkStorage(): Promise<ObservabilityComponentStatus> {
    // Phase 1 has no S3 SDK or storage client configured in the API package yet.
    return { status: 'up', detail: 'storage check not implemented' };
  }
}

@Injectable()
export class ObservabilityHealthService {
  constructor(
    @Inject(ObservabilityHealthIndicatorService)
    private readonly indicator: ObservabilityHealthIndicator
  ) {}

  async evaluateHealth(): Promise<ObservabilityHealthReport> {
    const components = {
      api: await this.indicator.checkApi(),
      db: await this.indicator.checkDb(),
      queue: await this.indicator.checkQueue(),
      storage: await this.indicator.checkStorage()
    };
    const failedComponents = (Object.entries(components) as Array<
      ['api' | 'db' | 'queue' | 'storage', ObservabilityComponentStatus]
    >)
      .filter(([, component]) => component.status === 'down')
      .map(([name]) => name);

    if (failedComponents.length === 0) {
      return {
        overallStatus: 'up',
        components
      };
    }

    return {
      overallStatus: 'down',
      components,
      actionableAlert: {
        failedComponents,
        message: `Critical health check failure detected for ${failedComponents.join(', ')}.`
      }
    };
  }
}
