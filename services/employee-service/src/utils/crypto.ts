import crypto from 'crypto';
import { config } from '../config/env';

const ALGORITHM = 'aes-256-gcm';

export function encryptField(plainText?: string | null): string | undefined {
  if (!plainText) return undefined;
  const key = Buffer.from(config.encryptionKey, 'hex');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptField(cipherText?: string | null): string | undefined {
  if (!cipherText || !cipherText.includes(':')) return cipherText || undefined;
  try {
    const [ivHex, authTagHex, encryptedHex] = cipherText.split(':');
    const key = Buffer.from(config.encryptionKey, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    // If decryption fails (e.g. unencrypted mock or corrupted), return safe placeholder
    return '***REDACTED***';
  }
}

