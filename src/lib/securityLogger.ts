/**
 * FUN Wallet - Security Logger
 * 
 * Logs security events to Supabase for audit trail
 * All events are tied to user_id for compliance
 */

import { supabase } from '@/integrations/supabase/client';

export type SecurityEventType = 
  | 'wallet_created'
  | 'wallet_imported'
  | 'wallet_deleted'
  | 'password_setup'
  | 'password_changed'
  | 'unlock_success'
  | 'unlock_failed'
  | 'backup_viewed'
  | 'backup_verified'
  | 'private_key_exported'
  | 'session_timeout'
  | 'session_locked'
  | 'suspicious_activity'
  | 'migration_completed'
  | 'dapp_connected'
  | 'dapp_disconnected'
  | 'transaction_signed'
  | 'transaction_rejected';

export interface SecurityEventDetails {
  walletAddress?: string;
  walletName?: string;
  dappUrl?: string;
  dappName?: string;
  txHash?: string;
  errorMessage?: string;
  attemptCount?: number;
  sourceDevice?: string;
  [key: string]: unknown;
}

export interface SecurityEvent {
  eventType: SecurityEventType;
  details?: SecurityEventDetails;
  success?: boolean;
}

/**
 * Log a security event to Supabase
 * 
 * @param event - The security event to log
 * @returns Promise<boolean> - true if logged successfully
 */
export async function logSecurityEvent(event: SecurityEvent): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('Cannot log security event: No authenticated user');
      return false;
    }

    const { error } = await supabase
      .from('security_logs')
      .insert([{
        user_id: user.id,
        event_type: event.eventType,
        event_details: event.details ? JSON.parse(JSON.stringify(event.details)) : null,
        success: event.success ?? true,
        user_agent: navigator.userAgent,
        ip_address: null,
      }]);

    if (error) {
      console.error('Failed to log security event:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error logging security event:', error);
    return false;
  }
}

/**
 * Log wallet creation event
 */
export async function logWalletCreated(walletAddress: string, walletName: string): Promise<void> {
  await logSecurityEvent({
    eventType: 'wallet_created',
    details: { walletAddress, walletName },
    success: true,
  });
}

/**
 * Log wallet import event
 */
export async function logWalletImported(walletAddress: string, importType: 'mnemonic' | 'privateKey'): Promise<void> {
  await logSecurityEvent({
    eventType: 'wallet_imported',
    details: { walletAddress, importType },
    success: true,
  });
}

/**
 * Log wallet deletion event
 */
export async function logWalletDeleted(walletAddress: string): Promise<void> {
  await logSecurityEvent({
    eventType: 'wallet_deleted',
    details: { walletAddress },
    success: true,
  });
}

/**
 * Log password setup event
 */
export async function logPasswordSetup(): Promise<void> {
  await logSecurityEvent({
    eventType: 'password_setup',
    success: true,
  });
}

/**
 * Log password change event
 */
export async function logPasswordChanged(): Promise<void> {
  await logSecurityEvent({
    eventType: 'password_changed',
    success: true,
  });
}

/**
 * Log successful unlock
 */
export async function logUnlockSuccess(): Promise<void> {
  await logSecurityEvent({
    eventType: 'unlock_success',
    success: true,
  });
}

/**
 * Log failed unlock attempt
 */
export async function logUnlockFailed(attemptCount: number): Promise<void> {
  await logSecurityEvent({
    eventType: 'unlock_failed',
    details: { attemptCount },
    success: false,
  });
}

/**
 * Log seed phrase backup viewed
 */
export async function logBackupViewed(walletAddress: string): Promise<void> {
  await logSecurityEvent({
    eventType: 'backup_viewed',
    details: { walletAddress },
    success: true,
  });
}

/**
 * Log seed phrase backup verified (quiz completed)
 */
export async function logBackupVerified(walletAddress: string): Promise<void> {
  await logSecurityEvent({
    eventType: 'backup_verified',
    details: { walletAddress },
    success: true,
  });
}

/**
 * Log private key export
 */
export async function logPrivateKeyExported(walletAddress: string): Promise<void> {
  await logSecurityEvent({
    eventType: 'private_key_exported',
    details: { walletAddress },
    success: true,
  });
}

/**
 * Log session timeout
 */
export async function logSessionTimeout(): Promise<void> {
  await logSecurityEvent({
    eventType: 'session_timeout',
    success: true,
  });
}

/**
 * Log migration completed
 */
export async function logMigrationCompleted(walletCount: number): Promise<void> {
  await logSecurityEvent({
    eventType: 'migration_completed',
    details: { walletCount },
    success: true,
  });
}

/**
 * Log dApp connection
 */
export async function logDappConnected(dappUrl: string, dappName?: string): Promise<void> {
  await logSecurityEvent({
    eventType: 'dapp_connected',
    details: { dappUrl, dappName },
    success: true,
  });
}

/**
 * Log transaction signed
 */
export async function logTransactionSigned(walletAddress: string, txHash?: string): Promise<void> {
  await logSecurityEvent({
    eventType: 'transaction_signed',
    details: { walletAddress, txHash },
    success: true,
  });
}

/**
 * Log transaction rejected
 */
export async function logTransactionRejected(walletAddress: string, reason?: string): Promise<void> {
  await logSecurityEvent({
    eventType: 'transaction_rejected',
    details: { walletAddress, errorMessage: reason },
    success: false,
  });
}

/**
 * Get security logs for current user
 */
export async function getSecurityLogs(limit: number = 50): Promise<{
  id: string;
  event_type: string;
  event_details: SecurityEventDetails | null;
  success: boolean;
  created_at: string;
}[]> {
  try {
    const { data, error } = await supabase
      .from('security_logs')
      .select('id, event_type, event_details, success, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    
    return (data || []).map(log => ({
      ...log,
      event_details: log.event_details as SecurityEventDetails | null,
      success: log.success ?? true,
    }));
  } catch (error) {
    console.error('Error fetching security logs:', error);
    return [];
  }
}
