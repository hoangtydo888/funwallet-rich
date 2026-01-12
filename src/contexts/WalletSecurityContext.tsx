/**
 * FUN Wallet - Security Context
 * 
 * Global security state management for wallet operations
 * Handles session management, unlock state, and security policies
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { 
  verifyPassword, 
  getSecureStorage, 
  getEncryptedKey,
  ENCRYPTED_WALLET_STORAGE_KEY 
} from '@/lib/keyEncryption';

interface WalletSecurityState {
  isUnlocked: boolean;
  isPasswordSet: boolean;
  lastActivity: number;
  failedAttempts: number;
  isLocked: boolean; // Locked due to too many failed attempts
  lockoutEndTime: number | null;
  sessionTimeoutMinutes: number;
}

interface WalletSecurityContextValue extends WalletSecurityState {
  unlock: (password: string) => Promise<boolean>;
  lock: () => void;
  resetSession: () => void;
  updateActivity: () => void;
  checkSession: () => boolean;
  getCachedPassword: () => string | null;
  setSessionTimeout: (minutes: number) => void;
}

const SECURITY_CONFIG = {
  maxFailedAttempts: 5,
  lockoutDurationMs: 30 * 60 * 1000, // 30 minutes
  defaultSessionTimeoutMs: 15 * 60 * 1000, // 15 minutes
};

const WalletSecurityContext = createContext<WalletSecurityContextValue | null>(null);

export const WalletSecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<WalletSecurityState>({
    isUnlocked: false,
    isPasswordSet: false,
    lastActivity: Date.now(),
    failedAttempts: 0,
    isLocked: false,
    lockoutEndTime: null,
    sessionTimeoutMinutes: 15,
  });

  // Store password in memory during session (cleared on lock/timeout)
  const cachedPasswordRef = useRef<string | null>(null);
  const sessionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if password has been set up
  const checkPasswordSetup = useCallback(() => {
    try {
      const storage = getSecureStorage();
      const hasWallets = Object.keys(storage.wallets).length > 0;
      setState(prev => ({ ...prev, isPasswordSet: hasWallets }));
      return hasWallets;
    } catch {
      return false;
    }
  }, []);

  // Unlock wallet with password
  const unlock = useCallback(async (password: string): Promise<boolean> => {
    // Check lockout
    if (state.isLocked && state.lockoutEndTime && Date.now() < state.lockoutEndTime) {
      return false;
    }

    // Reset lockout if time has passed
    if (state.isLocked && state.lockoutEndTime && Date.now() >= state.lockoutEndTime) {
      setState(prev => ({
        ...prev,
        isLocked: false,
        lockoutEndTime: null,
        failedAttempts: 0,
      }));
    }

    try {
      // Get any encrypted wallet to verify password
      const storage = getSecureStorage();
      const addresses = Object.keys(storage.wallets);
      
      if (addresses.length === 0) {
        // No wallets yet, can't verify password
        return false;
      }

      const encryptedData = getEncryptedKey(addresses[0]);
      if (!encryptedData) {
        return false;
      }

      const isValid = await verifyPassword(encryptedData, password);
      
      if (isValid) {
        cachedPasswordRef.current = password;
        setState(prev => ({
          ...prev,
          isUnlocked: true,
          failedAttempts: 0,
          lastActivity: Date.now(),
          isLocked: false,
          lockoutEndTime: null,
        }));
        return true;
      } else {
        const newFailedAttempts = state.failedAttempts + 1;
        const shouldLock = newFailedAttempts >= SECURITY_CONFIG.maxFailedAttempts;
        
        setState(prev => ({
          ...prev,
          failedAttempts: newFailedAttempts,
          isLocked: shouldLock,
          lockoutEndTime: shouldLock ? Date.now() + SECURITY_CONFIG.lockoutDurationMs : null,
        }));
        return false;
      }
    } catch (error) {
      console.error('Unlock error:', error);
      return false;
    }
  }, [state.failedAttempts, state.isLocked, state.lockoutEndTime]);

  // Lock wallet
  const lock = useCallback(() => {
    cachedPasswordRef.current = null;
    setState(prev => ({
      ...prev,
      isUnlocked: false,
      lastActivity: Date.now(),
    }));
  }, []);

  // Reset session (clear failed attempts, etc.)
  const resetSession = useCallback(() => {
    cachedPasswordRef.current = null;
    setState(prev => ({
      ...prev,
      isUnlocked: false,
      failedAttempts: 0,
      isLocked: false,
      lockoutEndTime: null,
      lastActivity: Date.now(),
    }));
  }, []);

  // Update activity timestamp
  const updateActivity = useCallback(() => {
    setState(prev => ({
      ...prev,
      lastActivity: Date.now(),
    }));
  }, []);

  // Check if session is still valid
  const checkSession = useCallback((): boolean => {
    const timeoutMs = state.sessionTimeoutMinutes * 60 * 1000;
    const elapsed = Date.now() - state.lastActivity;
    
    if (elapsed > timeoutMs && state.isUnlocked) {
      lock();
      return false;
    }
    return state.isUnlocked;
  }, [state.lastActivity, state.sessionTimeoutMinutes, state.isUnlocked, lock]);

  // Get cached password for operations
  const getCachedPassword = useCallback((): string | null => {
    if (!state.isUnlocked) return null;
    return cachedPasswordRef.current;
  }, [state.isUnlocked]);

  // Set session timeout
  const setSessionTimeout = useCallback((minutes: number) => {
    setState(prev => ({
      ...prev,
      sessionTimeoutMinutes: Math.max(1, Math.min(60, minutes)),
    }));
  }, []);

  // Check password setup on mount
  useEffect(() => {
    checkPasswordSetup();
  }, [checkPasswordSetup]);

  // Session timeout checker
  useEffect(() => {
    if (state.isUnlocked) {
      sessionCheckIntervalRef.current = setInterval(() => {
        checkSession();
      }, 30000); // Check every 30 seconds
    }

    return () => {
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
      }
    };
  }, [state.isUnlocked, checkSession]);

  // Listen for storage changes (password setup)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === ENCRYPTED_WALLET_STORAGE_KEY) {
        checkPasswordSetup();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [checkPasswordSetup]);

  const value: WalletSecurityContextValue = {
    ...state,
    unlock,
    lock,
    resetSession,
    updateActivity,
    checkSession,
    getCachedPassword,
    setSessionTimeout,
  };

  return (
    <WalletSecurityContext.Provider value={value}>
      {children}
    </WalletSecurityContext.Provider>
  );
};

export const useWalletSecurity = (): WalletSecurityContextValue => {
  const context = useContext(WalletSecurityContext);
  if (!context) {
    throw new Error('useWalletSecurity must be used within WalletSecurityProvider');
  }
  return context;
};

export default WalletSecurityContext;
