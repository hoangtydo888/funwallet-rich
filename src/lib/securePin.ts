/**
 * FUN Wallet - Secure PIN Module
 * 
 * PBKDF2-based PIN hashing with Web Crypto API
 * Replaces weak custom hash function
 * 
 * Security Features:
 * - PBKDF2 with 100,000 iterations
 * - Random 16-byte salt per PIN
 * - SHA-256 hash function
 * - Version field for future migration
 */

export interface SecurePinData {
  hash: string;        // Base64 encoded derived key
  salt: string;        // Base64 encoded salt
  iterations: number;  // Number of PBKDF2 iterations
  version: number;     // Schema version
}

const PIN_CONFIG = {
  iterations: 100000,  // OWASP minimum recommendation
  saltLength: 16,      // 128 bits
  keyLength: 256,      // 256 bits
  hash: 'SHA-256' as const,
  version: 1,
};

const SECURE_PIN_STORAGE_KEY = 'fun_wallet_secure_pin_v2';

/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Hash a PIN using PBKDF2
 * 
 * @param pin - The PIN to hash (4-8 digits)
 * @param existingSalt - Optional existing salt for verification
 * @returns Secure PIN data with hash and salt
 */
export async function hashPinSecure(
  pin: string,
  existingSalt?: Uint8Array
): Promise<SecurePinData> {
  // Validate PIN format
  if (!/^\d{4,8}$/.test(pin)) {
    throw new Error('PIN must be 4-8 digits');
  }

  // Generate or use existing salt
  const salt = existingSalt || crypto.getRandomValues(new Uint8Array(PIN_CONFIG.saltLength));

  const encoder = new TextEncoder();
  
  // Import PIN as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  // Derive bits using PBKDF2
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PIN_CONFIG.iterations,
      hash: PIN_CONFIG.hash,
    },
    keyMaterial,
    PIN_CONFIG.keyLength
  );

  // Convert salt buffer to ArrayBuffer safely
  const saltBuffer = salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength);

  return {
    hash: arrayBufferToBase64(derivedBits),
    salt: arrayBufferToBase64(saltBuffer as ArrayBuffer),
    iterations: PIN_CONFIG.iterations,
    version: PIN_CONFIG.version,
  };
}

/**
 * Verify a PIN against stored hash
 * 
 * @param pin - The PIN to verify
 * @param storedData - The stored secure PIN data
 * @returns true if PIN matches
 */
export async function verifyPinSecure(
  pin: string,
  storedData: SecurePinData
): Promise<boolean> {
  try {
    // Convert stored salt back to Uint8Array
    const salt = new Uint8Array(base64ToArrayBuffer(storedData.salt));
    
    // Hash the input PIN with same salt
    const computed = await hashPinSecure(pin, salt);
    
    // Constant-time comparison to prevent timing attacks
    return constantTimeCompare(computed.hash, storedData.hash);
  } catch {
    return false;
  }
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Save secure PIN to storage
 */
export function saveSecurePin(data: SecurePinData): void {
  localStorage.setItem(SECURE_PIN_STORAGE_KEY, JSON.stringify(data));
}

/**
 * Get secure PIN from storage
 */
export function getSecurePin(): SecurePinData | null {
  try {
    const stored = localStorage.getItem(SECURE_PIN_STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      // Validate structure
      if (data.hash && data.salt && data.iterations && data.version) {
        return data;
      }
    }
  } catch (error) {
    console.error('Error reading secure PIN:', error);
  }
  return null;
}

/**
 * Remove secure PIN from storage
 */
export function removeSecurePin(): void {
  localStorage.removeItem(SECURE_PIN_STORAGE_KEY);
}

/**
 * Check if secure PIN is enabled
 */
export function isSecurePinEnabled(): boolean {
  return getSecurePin() !== null;
}

/**
 * Migrate from old weak hash to secure hash
 * Returns true if migration was needed and successful
 */
export async function migrateFromWeakPin(
  oldPinHashKey: string,
  oldPinEnabledKey: string,
  newPin: string
): Promise<boolean> {
  try {
    const oldEnabled = localStorage.getItem(oldPinEnabledKey);
    
    if (oldEnabled === 'true') {
      // Create new secure PIN hash
      const secureData = await hashPinSecure(newPin);
      saveSecurePin(secureData);
      
      // Remove old insecure data
      localStorage.removeItem(oldPinHashKey);
      localStorage.removeItem(oldPinEnabledKey);
      
      return true;
    }
  } catch (error) {
    console.error('Error migrating PIN:', error);
  }
  
  return false;
}
