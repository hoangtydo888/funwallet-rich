import { ethers } from "ethers";

// Backup data structure
export interface WalletBackup {
  version: string;
  timestamp: number;
  wallets: {
    name: string;
    address: string;
    encryptedPrivateKey: string;
  }[];
  checksum: string;
}

// Encryption using Web Crypto API
const deriveKey = async (password: string, salt: ArrayBuffer): Promise<CryptoKey> => {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
};

// Encrypt data
export const encryptData = async (
  data: string,
  password: string
): Promise<string> => {
  try {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt.buffer as ArrayBuffer);

    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      encoder.encode(data)
    );

    // Combine salt + iv + encrypted data
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    // Convert to base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt data");
  }
};

// Decrypt data
export const decryptData = async (
  encryptedBase64: string,
  password: string
): Promise<string> => {
  try {
    // Convert from base64
    const combined = new Uint8Array(
      atob(encryptedBase64).split("").map(c => c.charCodeAt(0))
    );

    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encrypted = combined.slice(28);

    const key = await deriveKey(password, salt.buffer as ArrayBuffer);

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Failed to decrypt data. Please check your password.");
  }
};

// Generate checksum for data integrity
const generateChecksum = (data: string): string => {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
};

// Create encrypted backup
export const createBackup = async (
  wallets: { name: string; address: string }[],
  password: string
): Promise<string> => {
  try {
    const backupWallets: WalletBackup["wallets"] = [];

    for (const wallet of wallets) {
      // Get private key from local storage
      const storedKey = localStorage.getItem(`pk_${wallet.address.toLowerCase()}`);
      if (!storedKey) {
        throw new Error(`Private key not found for ${wallet.address}`);
      }

      const encryptedPrivateKey = await encryptData(storedKey, password);
      backupWallets.push({
        name: wallet.name,
        address: wallet.address,
        encryptedPrivateKey,
      });
    }

    const backupData: Omit<WalletBackup, "checksum"> = {
      version: "1.0",
      timestamp: Date.now(),
      wallets: backupWallets,
    };

    const dataString = JSON.stringify(backupData);
    const checksum = generateChecksum(dataString);

    const fullBackup: WalletBackup = {
      ...backupData,
      checksum,
    };

    // Encrypt the entire backup
    const encryptedBackup = await encryptData(JSON.stringify(fullBackup), password);
    
    return encryptedBackup;
  } catch (error: any) {
    console.error("Backup creation error:", error);
    throw new Error(error.message || "Failed to create backup");
  }
};

// Restore from backup
export const restoreBackup = async (
  encryptedBackup: string,
  password: string
): Promise<{ name: string; address: string; privateKey: string }[]> => {
  try {
    // Decrypt the backup
    const decryptedString = await decryptData(encryptedBackup, password);
    const backup: WalletBackup = JSON.parse(decryptedString);

    // Verify checksum
    const { checksum, ...dataWithoutChecksum } = backup;
    const calculatedChecksum = generateChecksum(JSON.stringify(dataWithoutChecksum));
    
    if (checksum !== calculatedChecksum) {
      throw new Error("Backup integrity check failed");
    }

    const restoredWallets: { name: string; address: string; privateKey: string }[] = [];

    for (const wallet of backup.wallets) {
      const privateKey = await decryptData(wallet.encryptedPrivateKey, password);
      
      // Verify the private key matches the address
      const derivedWallet = new ethers.Wallet(privateKey);
      if (derivedWallet.address.toLowerCase() !== wallet.address.toLowerCase()) {
        throw new Error(`Address mismatch for wallet ${wallet.name}`);
      }

      restoredWallets.push({
        name: wallet.name,
        address: wallet.address,
        privateKey,
      });
    }

    return restoredWallets;
  } catch (error: any) {
    console.error("Restore error:", error);
    throw new Error(error.message || "Failed to restore backup");
  }
};

// Download backup as file
export const downloadBackup = (encryptedBackup: string, filename?: string): void => {
  const blob = new Blob([encryptedBackup], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `fun_wallet_backup_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Read backup from file
export const readBackupFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        resolve(content);
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
};

// Validate backup file format
export const validateBackupFile = async (
  encryptedBackup: string,
  password: string
): Promise<{ valid: boolean; walletCount?: number; error?: string }> => {
  try {
    const decryptedString = await decryptData(encryptedBackup, password);
    const backup: WalletBackup = JSON.parse(decryptedString);

    if (!backup.version || !backup.timestamp || !backup.wallets || !backup.checksum) {
      return { valid: false, error: "Invalid backup format" };
    }

    return { valid: true, walletCount: backup.wallets.length };
  } catch (error: any) {
    return { valid: false, error: error.message || "Invalid backup or wrong password" };
  }
};

// Cloud sync status
export type CloudSyncStatus = "idle" | "syncing" | "synced" | "error";

// Simulate cloud sync (in production, this would use Supabase storage or similar)
export const syncToCloud = async (
  userId: string,
  encryptedBackup: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Store in localStorage as a simulated cloud
    localStorage.setItem(`cloud_backup_${userId}`, encryptedBackup);
    localStorage.setItem(`cloud_backup_timestamp_${userId}`, Date.now().toString());
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Get cloud backup
export const getCloudBackup = async (
  userId: string
): Promise<{ backup: string | null; timestamp: number | null }> => {
  try {
    const backup = localStorage.getItem(`cloud_backup_${userId}`);
    const timestamp = localStorage.getItem(`cloud_backup_timestamp_${userId}`);
    
    return {
      backup,
      timestamp: timestamp ? parseInt(timestamp) : null,
    };
  } catch {
    return { backup: null, timestamp: null };
  }
};
