import { useCallback, useEffect, useState } from "react";
import { cachedBtcAddress, getBtcBalance, rememberBtcAddress, type BtcBalance } from "@/lib/bitcoin";
import { getBtcPriceUsd } from "@/lib/btcSwap";

/** BTC address, balance and USD price for the active wallet. The address is
 * derived once the vault is unlocked and cached (it is public) for later visits. */
export function useBitcoin(evmAddress: string | undefined, getPrivateKey: (address: string) => string | null) {
  const keyReady = !!(evmAddress && getPrivateKey(evmAddress));
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<BtcBalance | null>(null);
  const [priceUsd, setPriceUsd] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!evmAddress) { setAddress(null); return; }
    const key = getPrivateKey(evmAddress);
    setAddress(key ? rememberBtcAddress(evmAddress, key) : cachedBtcAddress(evmAddress));
    // getPrivateKey is recreated every render; keyReady captures the change that matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evmAddress, keyReady]);

  const refresh = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const [b, p] = await Promise.all([getBtcBalance(address), getBtcPriceUsd()]);
      setBalance(b); if (p) setPriceUsd(p); setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không đọc được số dư BTC");
    } finally { setLoading(false); }
  }, [address]);

  useEffect(() => {
    setBalance(null);
    void refresh();
    const timer = setInterval(() => void refresh(), 60_000);
    return () => clearInterval(timer);
  }, [refresh]);

  return { address, balance, priceUsd, loading, error, refresh };
}
