import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../persistence/prisma.service.js';
import type { AccessAssignmentInput } from './access-application.service.js';
import type { PortalRole } from './access-policy.service.js';

export type PersistedAccessAssignment = Omit<AccessAssignmentInput, 'revokedAt'> & {
  id: string;
  tenantId: string;
  role: PortalRole;
  createdAt: Date;
  updatedAt: Date;
  revokedAt: Date | null;
};

export type AccessAssignmentWriter = {
  upsert(
    tenantId: string,
    assignment: AccessAssignmentInput,
    assignmentId?: string
  ): Promise<PersistedAccessAssignment>;
  listByTenant(tenantId: string): Promise<PersistedAccessAssignment[]>;
  findActiveByEmail(
    tenantId: string,
    email: string
  ): Promise<PersistedAccessAssignment[]>;
  findActiveByUserIdAndRole(
    tenantId: string,
    userId: string,
    role: string
  ): Promise<PersistedAccessAssignment | null>;
  findById(tenantId: string, assignmentId: string): Promise<PersistedAccessAssignment | null>;
  revoke(
    tenantId: string,
    assignmentId: string,
    revokedAt: Date
  ): Promise<PersistedAccessAssignment>;
};

@Injectable()
export class PrismaAccessAssignmentRepository implements AccessAssignmentWriter {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: {
      accessAssignment: {
        upsert(args: {
          where: Record<string, unknown>;
          create: Record<string, unknown>;
          update: Record<string, unknown>;
        }): Promise<Record<string, unknown>>;
        findMany(args: {
          where: Record<string, unknown>;
          orderBy: Record<string, unknown>;
        }): Promise<Record<string, unknown>[]>;
        findFirst(args: { where: Record<string, unknown> }): Promise<Record<string, unknown> | null>;
        update(args: {
          where: Record<string, unknown>;
          data: Record<string, unknown>;
        }): Promise<Record<string, unknown>>;
      };
    }
  ) {}

  async upsert(
    tenantId: string,
    assignment: AccessAssignmentInput,
    assignmentId?: string
  ): Promise<PersistedAccessAssignment> {
    if (assignmentId) {
      const existing = await this.prisma.accessAssignment.findFirst({
        where: {
          tenantId,
          id: assignmentId
        }
      });

      if (!existing) {
        throw new Error('NOT_FOUND');
      }

      const persisted = await this.prisma.accessAssignment.update({
        where: {
          id: assignmentId
        },
        data: {
          userId: assignment.userId,
          displayName: assignment.displayName,
          email: assignment.email,
          role: assignment.role,
          assetIds: assignment.assetIds,
          mfaEnabled: assignment.mfaEnabled,
          lastReviewedAt: assignment.lastReviewedAt,
          revokedAt: assignment.revokedAt ?? existing.revokedAt
        }
      });

      return persisted as PersistedAccessAssignment;
    }

    const persisted = await this.prisma.accessAssignment.upsert({
      where: {
        tenantId_userId_role: {
          tenantId,
          userId: assignment.userId,
          role: assignment.role
        }
      },
      create: {
        tenantId,
        userId: assignment.userId,
        displayName: assignment.displayName,
        email: assignment.email,
        role: assignment.role,
        assetIds: assignment.assetIds,
        mfaEnabled: assignment.mfaEnabled,
        lastReviewedAt: assignment.lastReviewedAt,
        ...(assignment.revokedAt ? { revokedAt: assignment.revokedAt } : {})
      },
      update: {
        displayName: assignment.displayName,
        email: assignment.email,
        assetIds: assignment.assetIds,
        mfaEnabled: assignment.mfaEnabled,
        lastReviewedAt: assignment.lastReviewedAt,
        ...(assignment.revokedAt ? { revokedAt: assignment.revokedAt } : {})
      }
    });

    return persisted as PersistedAccessAssignment;
  }

  async listByTenant(tenantId: string): Promise<PersistedAccessAssignment[]> {
    const found = await this.prisma.accessAssignment.findMany({
      where: {
        tenantId
      },
      orderBy: {
        displayName: 'asc'
      }
    });

    return found as PersistedAccessAssignment[];
  }

  async findActiveByEmail(
    tenantId: string,
    email: string
  ): Promise<PersistedAccessAssignment[]> {
    const found = await this.prisma.accessAssignment.findMany({
      where: {
        tenantId,
        email,
        revokedAt: null
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return found as PersistedAccessAssignment[];
  }

  async findActiveByUserIdAndRole(
    tenantId: string,
    userId: string,
    role: string
  ): Promise<PersistedAccessAssignment | null> {
    const found = await this.prisma.accessAssignment.findFirst({
      where: {
        tenantId,
        userId,
        role,
        revokedAt: null
      }
    });

    return (found as PersistedAccessAssignment | null) ?? null;
  }

  async findById(
    tenantId: string,
    assignmentId: string
  ): Promise<PersistedAccessAssignment | null> {
    const found = await this.prisma.accessAssignment.findFirst({
      where: {
        tenantId,
        id: assignmentId
      }
    });

    return (found as PersistedAccessAssignment | null) ?? null;
  }

  async revoke(
    tenantId: string,
    assignmentId: string,
    revokedAt: Date
  ): Promise<PersistedAccessAssignment> {
    const persisted = await this.prisma.accessAssignment.update({
      where: {
        id: assignmentId,
        tenantId
      },
      data: {
        revokedAt
      }
    });

    return persisted as PersistedAccessAssignment;
  }
}
