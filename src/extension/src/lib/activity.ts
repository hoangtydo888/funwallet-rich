export const ACTIVITY_KEY = 'fun_wallet_dapp_activity_v1';
// A release policy, not a guarantee of finality. Continue checking recent
// receipts so a reorg can move an entry back to pending.
export const REQUIRED_CONFIRMATIONS = 2;
export type ActivityStatus = 'pending' | 'confirming' | 'confirmed' | 'failed' | 'unknown';
export interface WalletActivity {
  hash: string;
  chainId: number;
  account: string;
  origin: string;
  recipient: string;
  contract?: string;
  kind: 'native' | 'transfer' | 'approve' | 'contract';
  amount: string;
  symbol: string;
  createdAt: number;
  status: ActivityStatus;
  confirmations: number;
  blockNumber?: number;
  blockHash?: string;
  checkedAt?: number;
  checkError?: string;
}
export interface ReceiptEvidence {
  hash: string;
  blockNumber: number;
  blockHash: string;
  status: number | null;
}
export function reconcileReceipt(entry: WalletActivity, receipt: ReceiptEvidence | null, head: number, canonicalHash: string | null): WalletActivity {
  const next = { ...entry, checkedAt: Date.now(), checkError: undefined };
  if (!receipt || receipt.hash.toLowerCase() !== entry.hash.toLowerCase() || !canonicalHash || receipt.blockHash.toLowerCase() !== canonicalHash.toLowerCase() || head < receipt.blockNumber) {
    return { ...next, status: entry.status === 'unknown' ? 'unknown' : 'pending', confirmations: 0, blockNumber: undefined, blockHash: undefined };
  }
  const confirmations = head - receipt.blockNumber + 1;
  const status: ActivityStatus = receipt.status !== 0 && receipt.status !== 1 ? 'unknown'
    : confirmations < REQUIRED_CONFIRMATIONS ? 'confirming' : receipt.status === 1 ? 'confirmed' : 'failed';
  return { ...next, status, confirmations, blockNumber: receipt.blockNumber, blockHash: receipt.blockHash };
}
export const ACTIVITY_LABELS: Record<ActivityStatus, string> = {
  pending: 'Đang chờ xác nhận', confirming: 'Đang xác nhận', confirmed: 'Giao dịch thành công',
  failed: 'Giao dịch thất bại', unknown: 'Chưa xác định kết quả',
};
