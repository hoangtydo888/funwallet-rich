// USD total of every wallet, for the Bitget-style wallet list in Settings.
// Same tokens and prices as the Dashboard total (common + imported tokens on BSC).
import { useEffect, useState } from "react";
import { COMMON_TOKENS, getAllBalances, getTokenBalance } from "@/lib/wallet";
import { loadCustomTokens } from "@/components/wallet/ImportTokenDialog";
import { fetchTokenPrices, type TokenPrice } from "@/lib/priceTracker";

const FRESH_MS = 60_000;
const cache = new Map<string, { usd: number; at: number }>();

async function walletUsd(address: string, prices: Map<string, number>): Promise<number> {
  const common = await getAllBalances(address);
  const custom = await Promise.all(
    loadCustomTokens().map(async (t) => ({ symbol: t.symbol, balance: await getTokenBalance(t.address, address) })),
  );
  return [...common, ...custom].reduce(
    (sum, t) => sum + (parseFloat(t.balance) || 0) * (prices.get(t.symbol.toUpperCase()) ?? 0),
    0,
  );
}

/** Keys are lowercase addresses; a missing key means the total is still loading. */
export function useWalletTotals(addresses: string[]): Record<string, number> {
  const key = addresses.map((a) => a.toLowerCase()).join(",");
  const [totals, setTotals] = useState<Record<string, number>>(() =>
    Object.fromEntries(addresses.flatMap((a) => {
      const hit = cache.get(a.toLowerCase());
      return hit ? [[a.toLowerCase(), hit.usd]] : [];
    })),
  );

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    (async () => {
      const list = key.split(",");
      const symbols = [...getSymbols()];
      // A failed price request leaves totals unset (still loading) rather than a wrong $0.
      const quotes = await fetchTokenPrices(symbols).catch((): TokenPrice[] => []);
      const prices = new Map(quotes.map((p): [string, number] => [p.symbol.toUpperCase(), p.price]));
      if (prices.size === 0) return;
      // One wallet at a time: four wallets at once would burst the public BSC RPC.
      for (const address of list) {
        const hit = cache.get(address);
        if (hit && Date.now() - hit.at < FRESH_MS) {
          if (!cancelled) setTotals((t) => ({ ...t, [address]: hit.usd }));
          continue;
        }
        try {
          const usd = await walletUsd(address, prices);
          cache.set(address, { usd, at: Date.now() });
          if (!cancelled) setTotals((t) => ({ ...t, [address]: usd }));
        } catch {
          // Leave this wallet without a total rather than showing a wrong $0.
        }
        if (cancelled) return;
      }
    })();
    return () => { cancelled = true; };
  }, [key]);

  return totals;
}

function getSymbols(): Set<string> {
  return new Set([...COMMON_TOKENS, ...loadCustomTokens()].map((t) => t.symbol.toUpperCase()));
}
