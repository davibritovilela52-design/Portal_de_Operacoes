import 'dotenv/config';
import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';

export function configureApp(app: { setGlobalPrefix(prefix: string): void }): void {
  app.setGlobalPrefix('v1');
}

export function resolveAppPort(
  env: Partial<Record<'PORT', string | undefined>> = process.env
): number {
  const rawPort = env.PORT;
  const parsedPort = rawPort ? Number.parseInt(rawPort, 10) : Number.NaN;

  return Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 3001;
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  await app.listen(resolveAppPort());
}

if (!process.env.VITEST) {
  void bootstrap();
}
