import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

export type EvidenceAntivirusStatus = 'pending' | 'clean' | 'flagged';

export type EvidenceUploadPolicyInput = {
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  sha256: string;
};

export type EvidenceUploadPolicyDecision =
  | {
      allowed: true;
      reason: 'ALLOWED';
    }
  | {
      allowed: false;
      reason:
        | 'MIME_TYPE_NOT_ALLOWED'
        | 'FILE_TOO_LARGE'
        | 'HASH_REQUIRED'
        | 'HASH_FORMAT_INVALID';
      maxFileSizeBytes?: number;
    };

export type PreparedEvidenceUpload = {
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  storageKey: string;
  sha256: string;
  antivirusStatus: EvidenceAntivirusStatus;
};

export type EvidenceAccessGrant = {
  storageKey: string;
  requestedBy: string;
  token: string;
  expiresAt: Date;
};

const allowedMimeTypes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
  'video/mp4'
]);

const maxFileSizeBytes = 25 * 1024 * 1024;

@Injectable()
export class EvidenceSecurityService {
  validateUpload(input: EvidenceUploadPolicyInput): EvidenceUploadPolicyDecision {
    const normalizedHash = input.sha256.trim().toLowerCase();

    if (!normalizedHash) {
      return {
        allowed: false,
        reason: 'HASH_REQUIRED'
      };
    }

    if (!/^[a-f0-9]{64}$/.test(normalizedHash)) {
      return {
        allowed: false,
        reason: 'HASH_FORMAT_INVALID'
      };
    }

    if (!allowedMimeTypes.has(input.mimeType.trim().toLowerCase())) {
      return {
        allowed: false,
        reason: 'MIME_TYPE_NOT_ALLOWED'
      };
    }

    if (input.fileSizeBytes > maxFileSizeBytes) {
      return {
        allowed: false,
        reason: 'FILE_TOO_LARGE',
        maxFileSizeBytes
      };
    }

    return {
      allowed: true,
      reason: 'ALLOWED'
    };
  }

  prepareEvidenceUpload(
    ticketId: string,
    input: EvidenceUploadPolicyInput
  ): PreparedEvidenceUpload {
    const normalizedHash = input.sha256.trim().toLowerCase();
    const normalizedMimeType = input.mimeType.trim().toLowerCase();
    const safeFileName = sanitizeFileName(input.fileName);

    return {
      fileName: safeFileName,
      mimeType: normalizedMimeType,
      fileSizeBytes: input.fileSizeBytes,
      storageKey: `maintenance/${ticketId}/${normalizedHash.slice(0, 12)}-${safeFileName}`,
      sha256: normalizedHash,
      antivirusStatus: 'pending'
    };
  }

  issueAccessGrant(input: {
    storageKey: string;
    requestedBy: string;
    ttlSeconds: number;
  }): EvidenceAccessGrant {
    const ttlSeconds = Math.max(1, Math.min(input.ttlSeconds, 60));

    return {
      storageKey: input.storageKey,
      requestedBy: input.requestedBy,
      token: randomUUID(),
      expiresAt: new Date(Date.now() + ttlSeconds * 1000)
    };
  }
}

function sanitizeFileName(value: string): string {
  const normalized = value.trim().replace(/\s+/g, '-');
  const safe = normalized.replace(/[^A-Za-z0-9._-]/g, '-').replace(/-+/g, '-');

  return safe.length > 0 ? safe : 'attachment';
}
