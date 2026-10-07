import { RpcError } from './approval';

// The unlocked signer lives only in this worker's memory. No password, key or
// signer is written to storage. Worker suspension/restart requires unlocking.
export class SigningSession<T extends { address: string }> {
  private signer: T | null = null;
  private expiresAt = 0;
  constructor(private lifetime = 15 * 60_000) {}
  unlock(signer: T) { this.signer = signer; this.expiresAt = Date.now() + this.lifetime; }
  lock() { this.signer = null; this.expiresAt = 0; }
  isUnlocked() {
    if (Date.now() >= this.expiresAt) this.lock();
    return this.signer !== null;
  }
  get(account: string): T {
    if (!this.isUnlocked() || this.signer!.address.toLowerCase() !== account.toLowerCase()) {
      throw new RpcError(4100, 'Ví đã khóa. Vui lòng mở khóa để tiếp tục.');
    }
    return this.signer!;
  }
}
