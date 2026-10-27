import { useEffect, useState } from 'react';
import { getChainById } from '@shared/constants/chains';
import { ACTIVITY_KEY, ACTIVITY_LABELS, REQUIRED_CONFIRMATIONS, WalletActivity } from '../../lib/activity';
import { displayAmount } from '../../lib/approval';

export default function RecentActivity({ account, onConfirmed }: { account: string; onConfirmed: () => void }) {
  const [entries, setEntries] = useState<WalletActivity[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    let running = false;
    let previousConfirmed = '';
    setEntries([]);
    const read = async () => {
      const response = await chrome.runtime.sendMessage({ type: 'GET_ACTIVITY' });
      if (!live) return;
      if (!response?.success) { setError(response?.error || 'Chưa đọc được hoạt động ví'); return; }
      const next = (response.data as WalletActivity[]).filter(e => e.account.toLowerCase() === account.toLowerCase());
      setEntries(next); setError('');
      const confirmed = next.filter(e => e.status === 'confirmed').map(e => e.hash).sort().join(',');
      if (confirmed !== previousConfirmed) { previousConfirmed = confirmed; onConfirmed(); }
    };
    const refresh = async () => {
      if (running || !account) return;
      running = true;
      try {
        await read();
        await chrome.runtime.sendMessage({ type: 'REFRESH_ACTIVITY' });
        await read();
      } catch { if (live) setError('Chưa cập nhật được hoạt động ví'); }
      finally { running = false; }
    };
    const changed = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes[ACTIVITY_KEY]) void read().catch(() => {});
    };
    chrome.storage.onChanged.addListener(changed);
    void refresh();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 15_000);
    return () => { live = false; clearInterval(timer); chrome.storage.onChanged.removeListener(changed); };
  }, [account, onConfirmed]);
  if (!entries.length && !error) return null;
  return <section className="mb-5" aria-label="Hoạt động giao dịch">
    <h3 className="text-sm font-semibold mb-2">Hoạt động gần đây</h3>
    {error && <p role="status" className="text-xs text-amber-800 mb-2">{error}</p>}
    {entries.slice(0, 5).map(entry => <article key={`${entry.chainId}:${entry.hash}`} className="rounded-xl border border-border p-3 mb-2 bg-white">
      <div className="flex justify-between gap-2 text-sm font-medium">
        <span>{entry.kind === 'approve' ? 'Cấp quyền' : 'Giao dịch'}</span><span className="text-right break-all">{displayAmount(entry.amount)} {entry.symbol}</span>
      </div>
      <p className={`text-xs mt-2 ${entry.status === 'confirmed' && !entry.checkError ? 'text-emerald-700' : entry.status === 'failed' ? 'text-red-700' : 'text-amber-800'}`} role="status">
        {entry.checkError ? 'Trạng thái chưa cập nhật' : ACTIVITY_LABELS[entry.status]}
        {entry.status === 'confirming' && ` (${entry.confirmations}/${REQUIRED_CONFIRMATIONS})`}
      </p>
      <p className="text-xs text-muted-foreground mt-1 break-all">{entry.origin} · {getChainById(entry.chainId)?.name}</p>
      <p className="text-xs mt-1 break-all">Đến: {entry.recipient}</p>
      {entry.checkError && <p className="text-xs mt-1">{entry.checkError}</p>}
      {entry.status === 'unknown' && <p className="text-xs mt-1">Kiểm tra mã giao dịch trước khi gửi lại.</p>}
      <a href={`${getChainById(entry.chainId)?.explorer}/tx/${entry.hash}`} target="_blank" rel="noreferrer" className="text-xs text-emerald-700 underline block mt-2 break-all">{entry.hash.slice(0, 12)}…{entry.hash.slice(-8)} ↗</a>
    </article>)}
  </section>;
}
