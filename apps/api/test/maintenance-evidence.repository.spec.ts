import { describe, expect, it, vi } from 'vitest';

import { PrismaMaintenanceEvidenceRepository } from '../src/modules/maintenance/maintenance-evidence.repository.js';

describe('PrismaMaintenanceEvidenceRepository', () => {
  it('maps evidence metadata into the Prisma create payload with tenant and ticket scope', async () => {
    const create = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'evidence-1',
      tenantId: data.tenantId,
      maintenanceTicketId: data.maintenanceTicketId,
      type: data.type,
      fileName: data.fileName,
      mimeType: data.mimeType,
      fileSizeBytes: data.fileSizeBytes,
      storageKey: data.storageKey,
      sha256: data.sha256,
      antivirusStatus: data.antivirusStatus,
      uploadedBy: data.uploadedBy,
      uploadedAt: data.uploadedAt,
      createdAt: new Date('2026-05-13T12:03:00.000Z')
    }));

    const repository = new PrismaMaintenanceEvidenceRepository({
      maintenanceEvidence: {
        create,
        findMany: vi.fn()
      }
    });

    const evidence = {
      type: 'diagnostic' as const,
      fileName: 'diagnostic-photo.jpg',
      mimeType: 'image/jpeg',
      fileSizeBytes: 1024,
      storageKey: 'maintenance/mt-1/diagnostic-photo.jpg',
      sha256: 'a'.repeat(64),
      antivirusStatus: 'clean' as const,
      uploadedBy: 'field-1',
      uploadedAt: new Date('2026-05-13T12:02:00.000Z')
    };

    const result = await repository.create('tenant-a', 'mt-1', evidence);

    expect(create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-a',
        maintenanceTicketId: 'mt-1',
        type: 'diagnostic',
        fileName: 'diagnostic-photo.jpg',
        mimeType: 'image/jpeg',
        fileSizeBytes: 1024,
        storageKey: 'maintenance/mt-1/diagnostic-photo.jpg',
        sha256: 'a'.repeat(64),
        antivirusStatus: 'clean',
        uploadedBy: 'field-1',
        uploadedAt: new Date('2026-05-13T12:02:00.000Z')
      }
    });
    expect(result).toEqual({
      id: 'evidence-1',
      tenantId: 'tenant-a',
      ticketId: 'mt-1',
      type: 'diagnostic',
      fileName: 'diagnostic-photo.jpg',
      mimeType: 'image/jpeg',
      fileSizeBytes: 1024,
      storageKey: 'maintenance/mt-1/diagnostic-photo.jpg',
      sha256: 'a'.repeat(64),
      antivirusStatus: 'clean',
      uploadedBy: 'field-1',
      uploadedAt: new Date('2026-05-13T12:02:00.000Z'),
      createdAt: new Date('2026-05-13T12:03:00.000Z')
    });
  });

  it('lists evidence already attached to a maintenance ticket', async () => {
    const findMany = vi.fn(async () => [
      {
        id: 'evidence-1',
        tenantId: 'tenant-a',
        maintenanceTicketId: 'mt-1',
        type: 'diagnostic',
        fileName: 'diagnostic-photo.jpg',
        mimeType: 'image/jpeg',
        fileSizeBytes: 1024,
        storageKey: 'maintenance/mt-1/diagnostic-photo.jpg',
        sha256: 'a'.repeat(64),
        antivirusStatus: 'clean',
        uploadedBy: 'field-1',
        uploadedAt: new Date('2026-05-13T12:02:00.000Z'),
        createdAt: new Date('2026-05-13T12:03:00.000Z')
      }
    ]);

    const repository = new PrismaMaintenanceEvidenceRepository({
      maintenanceEvidence: {
        create: vi.fn(),
        findMany
      }
    });

    const result = await repository.listByTicket('tenant-a', 'mt-1');

    expect(findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-a',
        maintenanceTicketId: {
          in: ['mt-1']
        }
      },
      orderBy: {
        uploadedAt: 'asc'
      }
    });
    expect(result).toEqual([
      {
        id: 'evidence-1',
        tenantId: 'tenant-a',
        ticketId: 'mt-1',
        type: 'diagnostic',
        fileName: 'diagnostic-photo.jpg',
        mimeType: 'image/jpeg',
        fileSizeBytes: 1024,
        storageKey: 'maintenance/mt-1/diagnostic-photo.jpg',
        sha256: 'a'.repeat(64),
        antivirusStatus: 'clean',
        uploadedBy: 'field-1',
        uploadedAt: new Date('2026-05-13T12:02:00.000Z'),
        createdAt: new Date('2026-05-13T12:03:00.000Z')
      }
    ]);
  });

  it('finds a single evidence record by tenant, ticket and evidence id', async () => {
    const findFirst = vi.fn(async () => ({
      id: 'evidence-1',
      tenantId: 'tenant-a',
      maintenanceTicketId: 'mt-1',
      type: 'diagnostic',
      fileName: 'diagnostic-photo.jpg',
      mimeType: 'image/jpeg',
      fileSizeBytes: 1024,
      storageKey: 'maintenance/mt-1/diagnostic-photo.jpg',
      sha256: 'a'.repeat(64),
      antivirusStatus: 'clean',
      uploadedBy: 'field-1',
      uploadedAt: new Date('2026-05-13T12:02:00.000Z'),
      createdAt: new Date('2026-05-13T12:03:00.000Z')
    }));

    const repository = new PrismaMaintenanceEvidenceRepository({
      maintenanceEvidence: {
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst
      }
    });

    const result = await repository.findById('tenant-a', 'mt-1', 'evidence-1');

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: 'evidence-1',
        tenantId: 'tenant-a',
        maintenanceTicketId: 'mt-1'
      }
    });
    expect(result).toEqual({
      id: 'evidence-1',
      tenantId: 'tenant-a',
      ticketId: 'mt-1',
      type: 'diagnostic',
      fileName: 'diagnostic-photo.jpg',
      mimeType: 'image/jpeg',
      fileSizeBytes: 1024,
      storageKey: 'maintenance/mt-1/diagnostic-photo.jpg',
      sha256: 'a'.repeat(64),
      antivirusStatus: 'clean',
      uploadedBy: 'field-1',
      uploadedAt: new Date('2026-05-13T12:02:00.000Z'),
      createdAt: new Date('2026-05-13T12:03:00.000Z')
    });
  });
});
