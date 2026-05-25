import 'dotenv/config';

import { Injectable } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';

import { getPrismaClientClass } from '../../generated/internal/class';

const PrismaClient = getPrismaClientClass();

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL is required to initialize PrismaService');
    }

    super({
      adapter: new PrismaPg({ connectionString })
    });
  }
}
