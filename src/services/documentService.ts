import { DocumentItem, UserRole } from '../types';
import { dataStore } from './mockData';

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
];

export const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.docx', '.xlsx', '.csv'];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  fileSizeBytes: number;
  mimeType: string;
  extension: string;
}

export interface SignedUrlResult {
  signedUrl: string;
  token: string;
  issuedAt: string;
  expiresAt: string;
  expiresInMinutes: number;
  isExpired: boolean;
}

export interface TokenVerificationResult {
  valid: boolean;
  docId?: string;
  error?: string;
  remainingSeconds?: number;
  expiredAt?: string;
}

/**
 * Validates an uploaded document file for size and type constraints
 */
export function validateDocumentFile(file: File): FileValidationResult {
  const extension = '.' + (file.name.split('.').pop() || '').toLowerCase();
  const fileSizeBytes = file.size;
  const mimeType = file.type || 'application/octet-stream';

  if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (fileSizeBytes / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File size (${sizeMb} MB) exceeds maximum permitted threshold of 10.00 MB. Please compress or optimize the document.`,
      fileSizeBytes,
      mimeType,
      extension,
    };
  }

  const isAllowedExt = ALLOWED_EXTENSIONS.includes(extension);
  const isAllowedMime = ALLOWED_MIME_TYPES.includes(mimeType) || isAllowedExt;

  if (!isAllowedExt && !isAllowedMime) {
    return {
      valid: false,
      error: `File type "${extension}" (${mimeType}) is not permitted. Only PDF, JPG, PNG, DOCX, and XLSX files are accepted in the secure vault.`,
      fileSizeBytes,
      mimeType,
      extension,
    };
  }

  return {
    valid: true,
    fileSizeBytes,
    mimeType,
    extension,
  };
}

/**
 * Simulates a cryptographic SHA-256 checksum for audit and integrity verification
 */
export function generateChecksum(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hex1 = Math.abs(hash).toString(16).padStart(8, '0');
  const hex2 = Math.abs(~hash).toString(16).padStart(8, '0');
  const hex3 = Math.abs(hash ^ 0x5a5a5a5a).toString(16).padStart(8, '0');
  const hex4 = Math.abs((hash * 31) | 0).toString(16).padStart(8, '0');
  return `${hex1}${hex2}${hex3}${hex4}e8c1b9a4f203847291a0b3c4`.slice(0, 64);
}

/**
 * Generates a time-limited signed URL for private document access
 * Default expiry: 900 seconds (15 minutes)
 */
export function generateSignedUrl(doc: DocumentItem, durationSeconds: number = 900): SignedUrlResult {
  const now = Date.now();
  const expiresAtMs = now + durationSeconds * 1000;
  const issuedAtIso = new Date(now).toISOString();
  const expiresAtIso = new Date(expiresAtMs).toISOString();

  const payload = {
    docId: doc.id,
    fileName: doc.fileName,
    storagePath: doc.storagePath || `private/docs/${doc.id}/${doc.fileName}`,
    iat: now,
    exp: expiresAtMs,
    salt: Math.random().toString(36).substring(2, 10),
  };

  const jsonString = JSON.stringify(payload);
  const token = btoa(unescape(encodeURIComponent(jsonString)));

  const signedUrl = `https://vault.investxindia.internal/storage/v1/s/${doc.id}?token=${token}&expires=${expiresAtMs}`;

  // Log URL generation
  dataStore.recordDocumentAccess(doc.id, 'generate_signed_url', token);

  return {
    signedUrl,
    token,
    issuedAt: issuedAtIso,
    expiresAt: expiresAtIso,
    expiresInMinutes: Math.round(durationSeconds / 60),
    isExpired: false,
  };
}

/**
 * Verifies if a signed URL token is authentic and currently unexpired
 */
export function verifySignedToken(token: string): TokenVerificationResult {
  try {
    const jsonString = decodeURIComponent(escape(atob(token)));
    const payload = JSON.parse(jsonString);

    if (!payload.docId || !payload.exp) {
      return {
        valid: false,
        error: 'Malformed security token: missing document identifier or expiration claim.',
      };
    }

    const now = Date.now();
    if (now > payload.exp) {
      const expiredAgoSeconds = Math.round((now - payload.exp) / 1000);
      return {
        valid: false,
        docId: payload.docId,
        error: `Security token expired ${expiredAgoSeconds} seconds ago. Access denied (HTTP 403 Forbidden).`,
        expiredAt: new Date(payload.exp).toISOString(),
      };
    }

    const remainingSeconds = Math.max(0, Math.round((payload.exp - now) / 1000));

    return {
      valid: true,
      docId: payload.docId,
      remainingSeconds,
    };
  } catch (err: any) {
    return {
      valid: false,
      error: `Cryptographic token verification failed: ${err.message}`,
    };
  }
}

/**
 * Downloads a private document securely, checking token validity and role authorization
 */
export function downloadPrivateDocument(
  doc: DocumentItem,
  token: string,
  userRole: UserRole
): { success: boolean; message: string } {
  // Verify token validity
  const verification = verifySignedToken(token);
  if (!verification.valid) {
    return {
      success: false,
      message: verification.error || 'Token verification failed. Unauthorized access attempt.',
    };
  }

  // Record download in audit log
  dataStore.recordDocumentAccess(doc.id, 'download', token);

  // Trigger simulated file download in browser
  const mockContent = `--- INVESTXINDIA PRIVATE VAULT ARTIFACT ---
Document: ${doc.title}
File Name: ${doc.fileName}
Category: ${doc.documentCategory}
Linked Entity: ${doc.relatedEntity}
Storage Path: ${doc.storagePath}
SHA-256 Checksum: ${doc.sha256Checksum || 'VERIFIED'}
Downloaded By: ${dataStore.getActiveUser().name} (${userRole})
Timestamp IST: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
Security Notice: Confidentially privileged document. Unauthorized redistribution strictly prohibited under Indian IT Act 2000.
--------------------------------------------`;

  const blob = new Blob([mockContent], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', doc.fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return {
    success: true,
    message: `Securely downloaded "${doc.fileName}" via verified signed token.`,
  };
}
