import { useCallback, useEffect, useState } from 'react';
import { Globe2, LogOut } from 'lucide-react';
import type { DAppConnection } from '@shared/types';

interface Site { origin: string; icon?: string; connected: boolean }

// Shows whether the site in the current tab is connected, like MetaMask's site bar.
export function ConnectedSiteBar() {
  const [site, setSite] = useState<Site | null>(null);

  const refresh = useCallback(async () => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab?.url || !/^https?:/.test(tab.url)) { setSite(null); return; }
    const origin = new URL(tab.url).origin;
    const response = await chrome.runtime.sendMessage({ type: 'GET_CONNECTED_DAPPS' });
    const connections = (response?.success ? response.data : []) as DAppConnection[];
    setSite({
      origin,
      icon: tab.favIconUrl?.startsWith('https://') ? tab.favIconUrl : undefined,
      connected: connections.some(c => c.origin === origin),
    });
  }, []);

  useEffect(() => {
    void refresh();
    const onActivated = () => void refresh();
    const onUpdated = (_id: number, info: chrome.tabs.OnUpdatedInfo) => { if (info.status === 'complete' || info.url) void refresh(); };
    chrome.tabs.onActivated.addListener(onActivated);
    chrome.tabs.onUpdated.addListener(onUpdated);
    return () => {
      chrome.tabs.onActivated.removeListener(onActivated);
      chrome.tabs.onUpdated.removeListener(onUpdated);
    };
  }, [refresh]);

  if (!site) return null;
  const disconnect = async () => {
    await chrome.runtime.sendMessage({ type: 'DISCONNECT_DAPP', payload: { origin: site.origin } });
    await refresh();
  };

  return (
    <div className="mx-4 mb-3 flex items-center gap-3 rounded-xl border border-border px-3 py-2">
      <span className="relative shrink-0">
        {site.icon ? <img src={site.icon} alt="" className="w-7 h-7 rounded-full" referrerPolicy="no-referrer" />
          : <Globe2 className="w-7 h-7 text-muted-foreground" />}
        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background ${site.connected ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium truncate">{new URL(site.origin).host}</span>
        <span className="block text-xs text-muted-foreground">{site.connected ? 'Đã kết nối' : 'Chưa kết nối'}</span>
      </span>
      {site.connected && (
        <button onClick={disconnect} title="Ngắt kết nối" aria-label="Ngắt kết nối trang này" className="p-2 rounded-lg text-red-600 hover:bg-muted">
          <LogOut className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
