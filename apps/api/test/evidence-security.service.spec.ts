import { describe, expect, it } from 'vitest';

import { EvidenceSecurityService } from '../src/modules/governance/evidence-security.service.js';

describe('EvidenceSecurityService', () => {
  it('allows supported evidence uploads with a valid sha256 hash', () => {
    const service = new EvidenceSecurityService();

    expect(
      service.validateUpload({
        fileName: 'diagnostic-report.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 10 * 1024 * 1024,
        sha256: 'a'.repeat(64)
      })
    ).toEqual({
      allowed: true,
      reason: 'ALLOWED'
    });
  });

  it('allows common office and text attachments', () => {
    const service = new EvidenceSecurityService();

    expect(
      service.validateUpload({
        fileName: 'checklist.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileSizeBytes: 2 * 1024 * 1024,
        sha256: 'c'.repeat(64)
      })
    ).toEqual({
      allowed: true,
      reason: 'ALLOWED'
    });
  });

  it('blocks uploads above the 25 MB limit', () => {
    const service = new EvidenceSecurityService();

    expect(
      service.validateUpload({
        fileName: 'walkthrough.mp4',
        mimeType: 'video/mp4',
        fileSizeBytes: 26 * 1024 * 1024,
        sha256: 'b'.repeat(64)
      })
    ).toEqual({
      allowed: false,
      reason: 'FILE_TOO_LARGE',
      maxFileSizeBytes: 25 * 1024 * 1024
    });
  });

  it('blocks uploads with missing or malformed hash and prepares server-owned evidence metadata', () => {
    const service = new EvidenceSecurityService();

    expect(
      service.validateUpload({
        fileName: 'diagnostic-report.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 1024,
        sha256: ''
      })
    ).toEqual({
      allowed: false,
      reason: 'HASH_REQUIRED'
    });

    expect(
      service.validateUpload({
        fileName: 'diagnostic-report.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 1024,
        sha256: 'invalid-hash'
      })
    ).toEqual({
      allowed: false,
      reason: 'HASH_FORMAT_INVALID'
    });

    expect(
      service.prepareEvidenceUpload('mt-1', {
        fileName: 'Diagnostic Report.pdf',
        mimeType: 'APPLICATION/PDF',
        fileSizeBytes: 1024,
        sha256: 'A'.repeat(64)
      })
    ).toEqual({
      fileName: 'Diagnostic-Report.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 1024,
      storageKey: `maintenance/mt-1/${'a'.repeat(12)}-Diagnostic-Report.pdf`,
      sha256: 'a'.repeat(64),
      antivirusStatus: 'pending'
    });

    const grant = service.issueAccessGrant({
      storageKey: 'maintenance/mt-1/diagnostic-report.pdf',
      requestedBy: 'field-1',
      ttlSeconds: 60
    });

    expect(grant.token).toBeTruthy();
    expect(grant.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(grant.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 60_000);
  });
});
