import { ethers } from 'ethers';
import { getChainById } from '@shared/constants/chains';
import { ACTIVITY_KEY, WalletActivity, reconcileReceipt } from '../lib/activity';

// Serialize writes without holding the storage lock while awaiting a slow RPC.
let writing: Promise<unknown> = Promise.resolve();
let refreshing: Promise<void> | null = null;
let lastRefresh = 0;
async function all(): Promise<WalletActivity[]> {
  const value = (await chrome.storage.local.get(ACTIVITY_KEY))[ACTIVITY_KEY];
  return Array.isArray(value) ? value : [];
}
export function putActivity(entry: WalletActivity): Promise<void> {
  const operation = writing.catch(() => {}).then(async () => {
    const entries = await all();
    const remaining = entries.filter(e => !(e.chainId === entry.chainId && e.hash === entry.hash));
    await chrome.storage.local.set({ [ACTIVITY_KEY]: [entry, ...remaining].sort((a, b) => b.createdAt - a.createdAt) });
  });
  writing = operation;
  return operation;
}
export async function accountActivity(account: string) {
  await writing.catch(() => {});
  return (await all()).filter(entry => entry.account.toLowerCase() === account.toLowerCase());
}
export async function refreshActivity(): Promise<void> {
  if (refreshing) return refreshing;
  if (Date.now() - lastRefresh < 10_000) return;
  lastRefresh = Date.now();
  refreshing = (async () => {
    // Continue checking terminal receipts for an hour after submission. Older
    // unresolved entries remain visible; refresh their status on the explorer.
    const entries = (await all()).filter(e => Date.now() - e.createdAt < 24 * 60 * 60_000 &&
      (!['confirmed', 'failed'].includes(e.status) || Date.now() - e.createdAt < 60 * 60_000));
    await Promise.all(entries.slice(0, 20).map(async entry => {
      const chain = getChainById(entry.chainId);
      if (!chain) return;
      const connection = new ethers.FetchRequest(chain.rpcUrl);
      connection.timeout = 10_000;
      const provider = new ethers.JsonRpcProvider(connection);
      let next: WalletActivity;
      try {
        if ((await provider.getNetwork()).chainId !== BigInt(entry.chainId)) throw new Error('RPC trả về sai mạng');
        const receipt = await provider.getTransactionReceipt(entry.hash);
        if (receipt) {
          const [head, block] = await Promise.all([provider.getBlockNumber(), provider.getBlock(receipt.blockNumber)]);
          next = reconcileReceipt(entry, receipt, head, block?.hash ?? null);
        } else next = reconcileReceipt(entry, null, 0, null);
      } catch {
        // A transport failure is not an on-chain failure. Retain the last
        // evidence but clearly mark it stale in the UI.
        next = { ...entry, checkedAt: Date.now(), checkError: 'Chưa cập nhật được trạng thái mạng. Hãy kiểm tra explorer.' };
      } finally { provider.destroy(); }
      await putActivity(next);
    }));
  })();
  try { await refreshing; } finally { refreshing = null; }
}
