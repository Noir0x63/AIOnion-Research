import crypto from 'crypto';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load dotenv using absolute path to prevent CWD resolution errors
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Helper to ensure encryption key exists in .env
function getOrGenerateKey() {
  let key = process.env.DB_ENCRYPTION_KEY;
  
  if (!key) {
    // Generate a 32-byte key (hex format)
    key = crypto.randomBytes(32).toString('hex');
    const envPath = path.join(__dirname, '../../.env');
    
    try {
      if (fs.existsSync(envPath)) {
        fs.appendFileSync(envPath, `\n# SQLite Database Encryption Key (Auto-Generated)\nDB_ENCRYPTION_KEY=${key}\n`);
        process.env.DB_ENCRYPTION_KEY = key;
        console.log('[Crypto] Generated and appended new DB_ENCRYPTION_KEY to .env');
      }
    } catch (err) {
      console.error('[Crypto] Failed to write key to .env:', err.message);
    }
  }

  return Buffer.from(key, 'hex');
}

const ENCRYPTION_KEY = getOrGenerateKey();
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

/**
 * Encrypts cleartext into a secure cipher string with an IV and Auth Tag.
 * Pure function.
 * 
 * @param {string} text 
 * @returns {string} iv:authTag:encryptedText
 */
export function encrypt(text) {
  if (typeof text !== 'string') {
    return text;
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a cipher string back into cleartext.
 * Pure function.
 * 
 * @param {string} encryptedText iv:authTag:encryptedText
 * @returns {string} Decrypted text
 */
export function decrypt(encryptedText) {
  if (!encryptedText || !encryptedText.includes(':')) {
    return encryptedText;
  }

  try {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('[Crypto] Decryption failed:', error.message);
    return '[Error Decrypting Content]';
  }
}
