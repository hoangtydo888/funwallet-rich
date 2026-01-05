// AES-256-GCM encryption for private keys using Web Crypto API
// Mã hóa private key với PIN của user

// Convert string to ArrayBuffer
const stringToArrayBuffer = (str: string): ArrayBuffer => {
  const encoder = new TextEncoder();
  return encoder.encode(str).buffer as ArrayBuffer;
};

// Convert ArrayBuffer to Base64
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

// Convert Base64 to ArrayBuffer
const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
};

// Derive encryption key from PIN using PBKDF2
const deriveKey = async (pin: string, salt: ArrayBuffer): Promise<CryptoKey> => {
  const pinBuffer = stringToArrayBuffer(pin);
  
  // Import PIN as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    pinBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  // Derive AES-256 key using PBKDF2 with 100,000 iterations
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

// Encrypt private key with PIN
export const encryptPrivateKey = async (
  privateKey: string,
  pin: string
): Promise<{ encrypted: string; salt: string; iv: string }> => {
  // Generate random salt and IV
  const saltArray = crypto.getRandomValues(new Uint8Array(16));
  const ivArray = crypto.getRandomValues(new Uint8Array(12));
  
  // Convert to ArrayBuffer
  const salt = saltArray.buffer as ArrayBuffer;
  const iv = ivArray.buffer as ArrayBuffer;
  
  // Derive key from PIN
  const key = await deriveKey(pin, salt);
  
  // Encrypt private key
  const privateKeyBuffer = stringToArrayBuffer(privateKey);
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: ivArray },
    key,
    privateKeyBuffer
  );
  
  return {
    encrypted: arrayBufferToBase64(encryptedBuffer),
    salt: arrayBufferToBase64(salt),
    iv: arrayBufferToBase64(iv),
  };
};

// Decrypt private key with PIN
export const decryptPrivateKey = async (
  encrypted: string,
  salt: string,
  iv: string,
  pin: string
): Promise<string> => {
  try {
    const saltBuffer = base64ToArrayBuffer(salt);
    const ivBuffer = base64ToArrayBuffer(iv);
    const encryptedBuffer = base64ToArrayBuffer(encrypted);
    
    // Derive key from PIN
    const key = await deriveKey(pin, saltBuffer);
    
    // Decrypt
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(ivBuffer) },
      key,
      encryptedBuffer
    );
    
    return new TextDecoder().decode(decryptedBuffer);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('PIN không đúng hoặc dữ liệu bị hỏng');
  }
};

// Validate PIN format (6 digits)
export const isValidPin = (pin: string): boolean => {
  return /^\d{6}$/.test(pin);
};
