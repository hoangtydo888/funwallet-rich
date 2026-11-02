import { useCallback, useEffect, useState } from "react";
import { cachedBtcAddress, getBtcBalance, rememberBtcAddress, type BtcBalance } from "@/lib/bitcoin";
import { getBtcPriceUsd } from "@/lib/btcSwap";
import { getBtcChoice, saveBtcChoice, META_KEY, type BtcChoice } from "@/lib/btcChoice";
import { useAuth } from "@/contexts/AuthContext";

/** BTC address, balance and USD price for the active wallet. The address is
 * derived once the vault is unlocked and cached (it is public) for later visits.
 * With showChosen, a BTC wallet the user picked (watch-only) replaces it for display;
 * signing paths (send, swap) leave it off and always use the derived wallet. */
export function useBitcoin(evmAddress: string | undefined, getPrivateKey: (address: string) => string | null, showChosen = false) {
  const keyReady = !!(evmAddress && getPrivateKey(evmAddress));
  const [ownAddress, setOwnAddress] = useState<string | null>(null);
  const { user } = useAuth();
  const accountChoices = user?.user_metadata?.[META_KEY];
  const [choice, setChoice] = useState<BtcChoice | null>(null);
  useEffect(() => {
    setChoice(showChosen && evmAddress ? getBtcChoice(evmAddress, accountChoices) : null);
  }, [showChosen, evmAddress, accountChoices]);
  const chooseBtc = useCallback(async (next: BtcChoice | null) => {
    if (!evmAddress) return;
    setChoice(next);
    await saveBtcChoice(evmAddress, next, accountChoices);
  }, [evmAddress, accountChoices]);
  const address = choice?.address ?? ownAddress;
  const [balance, setBalance] = useState<BtcBalance | null>(null);
  const [priceUsd, setPriceUsd] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!evmAddress) { setOwnAddress(null); return; }
    const key = getPrivateKey(evmAddress);
    setOwnAddress(key ? rememberBtcAddress(evmAddress, key) : cachedBtcAddress(evmAddress));
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

  return { address, ownAddress, choice, chooseBtc, balance, priceUsd, loading, error, refresh };
}
