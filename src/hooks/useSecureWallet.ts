/**
 * FUN Wallet - Secure Wallet Hook
 * 
 * Handles password-protected wallet operations:
 * - Password setup and verification
 * - Secure key encryption/decryption
 * - Transaction signing
 * - Private key export
 */

import { useState, useCallback } from 'react';
import { useWalletSecurity } from '@/contexts/WalletSecurityContext';
import {
  encryptPrivateKey,
  decryptPrivateKey,
  saveEncryptedKey,
  getEncryptedKey,
  removeEncryptedKey,
  hasEncryptedKey,
  migrateToEncryptedStorage,
  getPasswordStrength,
  type EncryptedKeyData,
} from '@/lib/keyEncryption';
import {
  logPasswordSetup,
  logUnlockSuccess,
  logUnlockFailed,
  logPrivateKeyExported,
  logMigrationCompleted,
} from '@/lib/securityLogger';
import { toast } from '@/hooks/use-toast';

const OLD_STORAGE_KEY = 'fun_wallet_pk';

export interface UseSecureWalletReturn {
  // State
  isUnlocked: boolean;
  isPasswordSet: boolean;
  failedAttempts: number;
  isLocked: boolean;
  lockoutEndTime: number | null;
  
  // Password operations
  setupPassword: (password: string) => Promise<boolean>;
  unlock: (password: string) => Promise<boolean>;
  lock: () => void;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  
  // Key operations
  encryptAndSaveKey: (address: string, privateKey: string, password?: string) => Promise<boolean>;
  getDecryptedKey: (address: string, password?: string) => Promise<string | null>;
  removeKey: (address: string) => void;
  hasKey: (address: string) => boolean;
  getCachedPassword: () => string | null;
  
  // Migration
  migrateOldStorage: (password: string) => Promise<number>;
  hasOldStorageData: () => boolean;
  
  // Utils
  getPasswordStrengthInfo: (password: string) => { score: number; label: string; color: string };
}

export const useSecureWallet = (): UseSecureWalletReturn => {
  const security = useWalletSecurity();
  const [, forceUpdate] = useState({});

  // Setup new password
  const setupPassword = useCallback(async (
    password: string
  ): Promise<boolean> => {
    if (password.length < 6) {
      toast({
        title: 'Mật khẩu quá ngắn',
        description: 'Mật khẩu phải có ít nhất 6 ký tự',
        variant: 'destructive',
      });
      return false;
    }

    try {
      // If there's old storage data, migrate it
      const oldData = localStorage.getItem(OLD_STORAGE_KEY);
      if (oldData) {
        const count = await migrateToEncryptedStorage(OLD_STORAGE_KEY, password);
        if (count > 0) {
          await logMigrationCompleted(count);
        }
      }

      await logPasswordSetup();
      
      // Unlock with new password
      await security.unlock(password);
      
      toast({
        title: 'Thiết lập thành công',
        description: 'Mật khẩu đã được thiết lập để bảo vệ ví của bạn',
      });
      
      forceUpdate({});
      return true;
    } catch (error) {
      console.error('Password setup error:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể thiết lập mật khẩu. Vui lòng thử lại.',
        variant: 'destructive',
      });
      return false;
    }
  }, [security]);

  // Unlock wallet
  const unlock = useCallback(async (password: string): Promise<boolean> => {
    const success = await security.unlock(password);
    
    if (success) {
      await logUnlockSuccess();
    } else {
      await logUnlockFailed(security.failedAttempts + 1);
      
      if (security.failedAttempts + 1 >= 5) {
        toast({
          title: 'Tài khoản bị khóa',
          description: 'Quá nhiều lần thử sai. Vui lòng đợi 30 phút.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Mật khẩu sai',
          description: `Còn ${5 - security.failedAttempts - 1} lần thử`,
          variant: 'destructive',
        });
      }
    }
    
    return success;
  }, [security]);

  // Lock wallet
  const lock = useCallback(() => {
    security.lock();
    toast({
      title: 'Ví đã khóa',
      description: 'Nhập mật khẩu để mở khóa',
    });
  }, [security]);

  // Change password
  const changePassword = useCallback(async (
    oldPassword: string, 
    newPassword: string
  ): Promise<boolean> => {
    try {
      // Verify old password
      const isValid = await security.unlock(oldPassword);
      if (!isValid) {
        toast({
          title: 'Mật khẩu cũ không đúng',
          variant: 'destructive',
        });
        return false;
      }

      // Re-encrypt all keys with new password
      const storage = localStorage.getItem('fun_wallet_encrypted_v2');
      if (!storage) return false;

      const parsed = JSON.parse(storage);
      const addresses = Object.keys(parsed.wallets || {});

      for (const address of addresses) {
        const encryptedData = getEncryptedKey(address);
        if (encryptedData) {
          const privateKey = await decryptPrivateKey(encryptedData, oldPassword);
          const newEncrypted = await encryptPrivateKey(privateKey, newPassword);
          saveEncryptedKey(address, newEncrypted);
        }
      }

      // Re-unlock with new password
      await security.unlock(newPassword);

      toast({
        title: 'Đổi mật khẩu thành công',
      });
      return true;
    } catch (error) {
      console.error('Change password error:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể đổi mật khẩu',
        variant: 'destructive',
      });
      return false;
    }
  }, [security]);

  // Encrypt and save a private key
  const encryptAndSaveKey = useCallback(async (
    address: string,
    privateKey: string,
    password?: string
  ): Promise<boolean> => {
    const pwd = password || security.getCachedPassword();
    if (!pwd) {
      toast({
        title: 'Chưa mở khóa',
        description: 'Vui lòng nhập mật khẩu để tiếp tục',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const encrypted = await encryptPrivateKey(privateKey, pwd);
      saveEncryptedKey(address, encrypted);
      return true;
    } catch (error) {
      console.error('Encrypt key error:', error);
      return false;
    }
  }, [security]);

  // Get decrypted private key
  const getDecryptedKey = useCallback(async (
    address: string,
    password?: string
  ): Promise<string | null> => {
    const pwd = password || security.getCachedPassword();
    if (!pwd) {
      return null;
    }

    try {
      const encryptedData = getEncryptedKey(address);
      if (!encryptedData) {
        // Fallback to old storage
        const oldData = localStorage.getItem(OLD_STORAGE_KEY);
        if (oldData) {
          const keys = JSON.parse(oldData);
          const key = keys[address] || keys[address.toLowerCase()];
          if (key) return key;
        }
        return null;
      }

      const privateKey = await decryptPrivateKey(encryptedData, pwd);
      await logPrivateKeyExported(address);
      return privateKey;
    } catch (error) {
      console.error('Decrypt key error:', error);
      return null;
    }
  }, [security]);

  // Remove encrypted key
  const removeKey = useCallback((address: string) => {
    removeEncryptedKey(address);
    
    // Also remove from old storage if exists
    try {
      const oldData = localStorage.getItem(OLD_STORAGE_KEY);
      if (oldData) {
        const keys = JSON.parse(oldData);
        delete keys[address];
        delete keys[address.toLowerCase()];
        localStorage.setItem(OLD_STORAGE_KEY, JSON.stringify(keys));
      }
    } catch {
      // Ignore
    }
  }, []);

  // Check if key exists
  const hasKey = useCallback((address: string): boolean => {
    if (hasEncryptedKey(address)) return true;
    
    // Check old storage
    try {
      const oldData = localStorage.getItem(OLD_STORAGE_KEY);
      if (oldData) {
        const keys = JSON.parse(oldData);
        return !!(keys[address] || keys[address.toLowerCase()]);
      }
    } catch {
      // Ignore
    }
    
    return false;
  }, []);

  // Migrate old storage to encrypted
  const migrateOldStorage = useCallback(async (password: string): Promise<number> => {
    try {
      const count = await migrateToEncryptedStorage(OLD_STORAGE_KEY, password);
      if (count > 0) {
        await logMigrationCompleted(count);
        toast({
          title: 'Di chuyển thành công',
          description: `${count} ví đã được mã hóa bảo mật`,
        });
      }
      return count;
    } catch (error) {
      console.error('Migration error:', error);
      toast({
        title: 'Lỗi di chuyển',
        description: 'Không thể di chuyển dữ liệu cũ',
        variant: 'destructive',
      });
      return 0;
    }
  }, []);

  // Check if old storage has data
  const hasOldStorageData = useCallback((): boolean => {
    try {
      const oldData = localStorage.getItem(OLD_STORAGE_KEY);
      if (!oldData) return false;
      const keys = JSON.parse(oldData);
      return Object.keys(keys).length > 0;
    } catch {
      return false;
    }
  }, []);

  // Get cached password
  const getCachedPassword = useCallback((): string | null => {
    return security.getCachedPassword();
  }, [security]);

  return {
    isUnlocked: security.isUnlocked,
    isPasswordSet: security.isPasswordSet,
    failedAttempts: security.failedAttempts,
    isLocked: security.isLocked,
    lockoutEndTime: security.lockoutEndTime,
    
    setupPassword,
    unlock,
    lock,
    changePassword,
    
    encryptAndSaveKey,
    getDecryptedKey,
    removeKey,
    hasKey,
    getCachedPassword,
    
    migrateOldStorage,
    hasOldStorageData,
    
    getPasswordStrengthInfo: getPasswordStrength,
  };
};
