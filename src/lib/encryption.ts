/**
 * AES-256-GCM encryption for cloud storage tokens.
 *
 * Uses CLOUD_ENCRYPTION_KEY env var (32 bytes, hex or base64).
 * Each encrypted value includes a random 12-byte IV prepended to the ciphertext.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const raw = process.env.CLOUD_ENCRYPTION_KEY;
  if (!raw) throw new Error("CLOUD_ENCRYPTION_KEY not configured");

  // Hex-encoded (64 chars = 32 bytes)
  if (raw.length === 64 && /^[0-9a-fA-F]+$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }

  // Base64-encoded (44 chars = 32 bytes)
  if (raw.length === 44 && /^[A-Za-z0-9+/]+=*$/.test(raw)) {
    const buf = Buffer.from(raw, "base64");
    if (buf.length === 32) return buf;
  }

  // Fallback: UTF-8 string (must be exactly 32 bytes for AES-256)
  const buf = Buffer.from(raw, "utf8");
  if (buf.length < 32) {
    throw new Error("CLOUD_ENCRYPTION_KEY must be 64 hex chars, 44 base64 chars, or at least 32 UTF-8 bytes");
  }
  return buf.subarray(0, 32);
}

/** Encrypt a plaintext string. Returns a base64 string (iv + ciphertext + authTag). */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // iv (12) + encrypted + authTag (16)
  return Buffer.concat([iv, encrypted, authTag]).toString("base64");
}

/** Decrypt a base64 string produced by encrypt(). */
export function decrypt(encoded: string): string {
  const key = getKey();
  const data = Buffer.from(encoded, "base64");

  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(data.length - AUTH_TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH, data.length - AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  return decipher.update(ciphertext) + decipher.final("utf8");
}

/** Try to decrypt, falling back to plaintext if decryption fails (migration compat). */
export function decryptOrPlaintext(value: string): string {
  try {
    return decrypt(value);
  } catch {
    return value;
  }
}
