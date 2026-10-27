import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { getSecureStorage, ENCRYPTED_WALLET_STORAGE_KEY } from '@/lib/keyEncryption';
import { walletKeySession } from '@/lib/walletKeySession';
import { useAuth } from '@/contexts/AuthContext';

interface WalletSecurityState {
  isUnlocked:boolean; isPasswordSet:boolean; lastActivity:number; failedAttempts:number;
  isLocked:boolean; lockoutEndTime:number|null; sessionTimeoutMinutes:number;
}
interface WalletSecurityContextValue extends WalletSecurityState {
  unlock:(password:string)=>Promise<boolean>; lock:()=>void; resetSession:()=>void;
  updateActivity:()=>void; checkSession:()=>boolean; getCachedPassword:()=>string|null;
  getUnlockedKey:(address:string)=>string|null; setSessionTimeout:(minutes:number)=>void;
}
const WalletSecurityContext = createContext<WalletSecurityContextValue|null>(null);
export const WalletSecurityProvider:React.FC<{children:React.ReactNode}> = ({children}) => {
  const {user} = useAuth();
  const session = useRef(walletKeySession);
  const attempts = useRef({count:0,until:0});
  const unlocking = useRef(false);
  const [state,setState] = useState<WalletSecurityState>({isUnlocked:false,isPasswordSet:false,lastActivity:Date.now(),failedAttempts:0,isLocked:false,lockoutEndTime:null,sessionTimeoutMinutes:15});
  const checkPasswordSetup = useCallback(() => {
    try { const exists = Object.keys(getSecureStorage().wallets).length > 0; setState(s=>({...s,isPasswordSet:exists})); return exists; }
    catch { session.current.lock(); setState(s=>({...s,isUnlocked:false,isPasswordSet:true})); return true; }
  },[]);
  const lock = useCallback(() => { session.current.lock(); setState(s=>({...s,isUnlocked:false})); },[]);
  const unlock = useCallback(async (password:string) => {
    if (unlocking.current || Date.now() < attempts.current.until) return false;
    unlocking.current = true;
    try {
      if (attempts.current.until && Date.now() >= attempts.current.until) attempts.current = {count:0,until:0};
      const valid = await session.current.unlock(password);
      if (valid) {
        attempts.current = {count:0,until:0};
        setState(s=>({...s,isUnlocked:true,isPasswordSet:true,failedAttempts:0,isLocked:false,lockoutEndTime:null,lastActivity:Date.now()}));
      } else {
        attempts.current.count++;
        if (attempts.current.count >= 5) attempts.current.until = Date.now()+30*60_000;
        setState(s=>({...s,isUnlocked:false,failedAttempts:attempts.current.count,isLocked:attempts.current.until>Date.now(),lockoutEndTime:attempts.current.until || null}));
      }
      return valid;
    } finally { unlocking.current = false; }
  },[]);
  const checkSession = useCallback(() => { const open = session.current.isOpen(); if (!open) setState(s=>s.isUnlocked ? {...s,isUnlocked:false} : s); return open; },[]);
  const getCachedPassword = useCallback(() => session.current.getPassword(),[]);
  const getUnlockedKey = useCallback((address:string) => session.current.getKey(address),[]);
  const updateActivity = useCallback(() => { session.current.touch(); },[]);
  const setSessionTimeout = useCallback((minutes:number) => {
    if (!Number.isFinite(minutes)) return;
    session.current.setTimeout(minutes); setState(s=>({...s,sessionTimeoutMinutes:Math.max(1,Math.min(60,minutes))}));
  },[]);
  useEffect(() => { lock(); checkPasswordSetup(); },[user?.id,lock,checkPasswordSetup]);
  useEffect(() => {
    try { const saved=JSON.parse(localStorage.getItem('fun_wallet_settings')??'{}'); if(Number.isFinite(saved.autoLock))setSessionTimeout(saved.autoLock); } catch { /* Keep a safe default. */ }
  },[setSessionTimeout]);
  useEffect(() => {
    const storage = (event:StorageEvent) => { if (!event.key || event.key===ENCRYPTED_WALLET_STORAGE_KEY || event.key==='fun_wallet_lock_signal') { lock(); checkPasswordSetup(); } };
    const timer = setInterval(checkSession,5000);
    const pagehide = () => lock();
    window.addEventListener('fun-wallet-lock',lock); window.addEventListener('storage',storage); window.addEventListener('pagehide',pagehide);
    for (const event of ['pointerdown','keydown'] as const) window.addEventListener(event,updateActivity,{passive:true});
    return () => {
      clearInterval(timer); session.current.lock();
      window.removeEventListener('fun-wallet-lock',lock); window.removeEventListener('storage',storage); window.removeEventListener('pagehide',pagehide);
      for (const event of ['pointerdown','keydown'] as const) window.removeEventListener(event,updateActivity);
    };
  },[checkSession,lock,checkPasswordSetup,updateActivity]);
  const lockAllTabs = useCallback(() => { lock(); try { localStorage.setItem('fun_wallet_lock_signal',String(Date.now())); } catch { /* local lock already applied */ } },[lock]);
  return <WalletSecurityContext.Provider value={{...state,unlock,lock:lockAllTabs,resetSession:lockAllTabs,updateActivity,checkSession,getCachedPassword,getUnlockedKey,setSessionTimeout}}>{children}</WalletSecurityContext.Provider>;
};
export const useWalletSecurity = () => { const context = useContext(WalletSecurityContext); if (!context) throw Error('WalletSecurityProvider is required'); return context; };
export default WalletSecurityContext;
