// Encryption utilities for secure private key storage
// Uses Web Crypto API - AES-256-GCM with PBKDF2 key derivation

/**
 * Derive encryption key from PIN using PBKDF2
 */
const deriveKey = async (pin: string, salt: Uint8Array): Promise<CryptoKey> => {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pin),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt.buffer as ArrayBuffer,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
};

/**
 * Convert ArrayBuffer to hex string
 */
const bufferToHex = (buffer: ArrayBuffer): string => {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

/**
 * Convert hex string to Uint8Array
 */
const hexToBuffer = (hex: string): Uint8Array => {
  const matches = hex.match(/.{1,2}/g) || [];
  return new Uint8Array(matches.map((byte) => parseInt(byte, 16)));
};

/**
 * Encrypt private key with user PIN
 * Returns encrypted data and salt (both as hex strings)
 */
export const encryptPrivateKey = async (
  privateKey: string,
  pin: string
): Promise<{ encrypted: string; salt: string; iv: string }> => {
  // Generate random salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Derive key from PIN
  const key = await deriveKey(pin, salt);

  // Encrypt the private key
  const encoder = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    key,
    encoder.encode(privateKey)
  );

  return {
    encrypted: bufferToHex(encrypted),
    salt: bufferToHex(salt.buffer as ArrayBuffer),
    iv: bufferToHex(iv.buffer as ArrayBuffer),
  };
};

/**
 * Decrypt private key with user PIN
 */
export const decryptPrivateKey = async (
  encrypted: string,
  salt: string,
  iv: string,
  pin: string
): Promise<string> => {
  // Convert hex strings back to buffers
  const saltBuffer = hexToBuffer(salt);
  const ivBuffer = hexToBuffer(iv);
  const encryptedBuffer = hexToBuffer(encrypted);

  // Derive key from PIN
  const key = await deriveKey(pin, saltBuffer);

  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBuffer.buffer as ArrayBuffer },
    key,
    encryptedBuffer.buffer as ArrayBuffer
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
};

/**
 * Validate PIN format (6 digits)
 */
export const isValidPin = (pin: string): boolean => {
  return /^\d{6}$/.test(pin);
};
