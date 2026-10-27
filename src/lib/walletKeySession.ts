import { decryptVaultKeys, ENCRYPTED_WALLET_STORAGE_KEY } from './keyEncryption';

/** Memory-only signing session. No key/password is persisted. Lock invalidates
 * an in-flight decrypt, and every key read checks expiry synchronously. */
export class WalletKeySession {
  private keys: Record<string,string> = {};
  private password: string | null = null;
  private generation = 0;
  private busy = false;
  private lastActivity = 0;
  private timeout = 15 * 60_000;
  constructor(private now: () => number = Date.now, private decrypt: typeof decryptVaultKeys = decryptVaultKeys) {}
  lock() { this.generation++; this.keys = {}; this.password = null; }
  async unlock(password: string): Promise<boolean> {
    if (this.busy) return false;
    this.lock(); const generation = this.generation; this.busy = true;
    const revision = localStorage.getItem(ENCRYPTED_WALLET_STORAGE_KEY);
    try {
      const keys = await this.decrypt(password);
      if (generation !== this.generation || !Object.keys(keys).length || localStorage.getItem(ENCRYPTED_WALLET_STORAGE_KEY) !== revision) return false;
      this.keys = keys; this.password = password; this.lastActivity = this.now(); return true;
    } catch { return false; }
    finally { this.busy = false; }
  }
  isOpen(): boolean {
    if (!this.password) return false;
    if (this.now() - this.lastActivity >= this.timeout) { this.lock(); return false; }
    return true;
  }
  touch() { if (this.isOpen()) this.lastActivity = this.now(); }
  setTimeout(minutes: number) { if (Number.isFinite(minutes)) this.timeout = Math.max(1,Math.min(60,minutes))*60_000; }
  getPassword() { return this.isOpen() ? this.password : null; }
  getKey(address: string): string | null { return this.isOpen() ? this.keys[address.toLowerCase()] ?? null : null; }
}

export const walletKeySession = new WalletKeySession();
