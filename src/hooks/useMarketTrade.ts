import { useCallback, useEffect, useRef, useState } from "react";
import { Contract, formatUnits } from "ethers";
import { ERC20_ABI } from "@/lib/wallet";
import { getChainById, getProviderForChain } from "@/lib/chains";
import { getBtcFeeRates, type BtcBalance } from "@/lib/bitcoin";
import { decimalIsPositive, exactTokenUnits } from "@/lib/tokenAmounts";
import type { LiFiStep } from "@/lib/lifi";
import { NATIVE, TRADE_ASSETS, isBtc, quoteMarketOrder, type MarketOrder, type TradeAsset } from "@/lib/marketOrder";

/** Balances of every tradable asset in base units, keyed by asset key. */
export function useAssetBalances(evmAddress: string | undefined, btcBalance: BtcBalance | null) {
  const [balances, setBalances] = useState<Record<string, bigint>>({});
  const refresh = useCallback(async () => {
    if (!evmAddress) return;
    const provider = getProviderForChain(getChainById(56)!);
    const evm = TRADE_ASSETS.filter(a => !isBtc(a));
    const results = await Promise.allSettled(evm.map(a => a.token === NATIVE
      ? provider.getBalance(evmAddress)
      : new Contract(a.token, ERC20_ABI, provider).balanceOf(evmAddress) as Promise<bigint>));
    const next: Record<string, bigint> = {};
    results.forEach((r, i) => { if (r.status === "fulfilled") next[evm[i].key] = r.value; });
    setBalances(prev => ({ ...prev, ...next }));
  }, [evmAddress]);
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 30_000);
    return () => clearInterval(timer);
  }, [refresh]);
  const all = btcBalance ? { ...balances, btc: btcBalance.confirmed } : balances;
  return { balances: all, refresh };
}

/** Largest amount that can be spent, leaving gas: 0.002 BNB, or a BTC fee at the fast rate. */
export async function maxSpendable(asset: TradeAsset, balance: bigint | undefined): Promise<bigint> {
  if (!balance) return 0n;
  let reserve = 0n;
  if (isBtc(asset)) reserve = BigInt(((await getBtcFeeRates().catch(() => null))?.fast ?? 5) * 300);
  else if (asset.token === NATIVE) reserve = 2n * 10n ** 15n;
  return balance > reserve ? balance - reserve : 0n;
}

export const fmtUnits = (raw: bigint | string | undefined, decimals: number, digits = 6) =>
  raw === undefined ? "…" : Number(formatUnits(raw, decimals)).toLocaleString("en-US", { maximumFractionDigits: digits });

interface QuoteInput { from: TradeAsset; to: TradeAsset; amount: string; slippage: number; evmAddress?: string; btcAddress: string | null; paused?: boolean }

/** Debounced market quote that refreshes every 30 s, like an exchange's live price. */
export function useMarketQuote({ from, to, amount, slippage, evmAddress, btcAddress, paused }: QuoteInput) {
  const [quote, setQuote] = useState<LiFiStep | null>(null);
  const [order, setOrder] = useState<MarketOrder | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const generation = useRef(0);

  const fetchQuote = useCallback(async () => {
    const id = ++generation.current;
    if (!evmAddress || !decimalIsPositive(amount) || from.key === to.key) { setQuote(null); setOrder(null); setError(""); return; }
    let raw: bigint;
    try { raw = exactTokenUnits(amount, from.decimals); } catch { setQuote(null); setOrder(null); setError("Số lượng có quá nhiều chữ số thập phân"); return; }
    const next: MarketOrder = { from, to, amount: raw.toString(), slippage, evmAddress, btcAddress, quotedAt: Date.now() };
    setLoading(true);
    try {
      const q = await quoteMarketOrder(next);
      if (id === generation.current) { setQuote(q); setOrder(next); setError(""); }
    } catch (e) {
      if (id === generation.current) { setQuote(null); setOrder(null); setError(e instanceof Error ? e.message.slice(0, 200) : "Không có báo giá"); }
    } finally { if (id === generation.current) setLoading(false); }
  }, [from, to, amount, slippage, evmAddress, btcAddress]);

  useEffect(() => {
    setQuote(null); setOrder(null);
    if (paused) return;
    const debounce = setTimeout(() => void fetchQuote(), 600);
    const refresh = setInterval(() => void fetchQuote(), 30_000);
    return () => { clearTimeout(debounce); clearInterval(refresh); generation.current++; };
  }, [fetchQuote, paused]);

  return { quote, order, error, loading, refresh: fetchQuote };
}

/** Summary numbers of a quote for display. */
export function quoteSummary(quote: LiFiStep | null, from: TradeAsset, to: TradeAsset) {
  const est = quote?.estimate;
  if (!est) return null;
  const fromAmount = Number(formatUnits(est.fromAmount, from.decimals));
  const toAmount = Number(formatUnits(est.toAmount, to.decimals));
  const sumUsd = (rows: { amountUSD?: string }[] | undefined) => (rows ?? []).reduce((sum, f) => sum + Number(f.amountUSD ?? 0), 0);
  const serviceUsd = sumUsd(est.feeCosts), gasUsd = sumUsd(est.gasCosts);
  return {
    fromAmount, toAmount, toAmountMin: est.toAmountMin, feesUsd: serviceUsd + gasUsd, serviceUsd, gasUsd,
    rate: fromAmount > 0 ? toAmount / fromAmount : 0,
    minutes: Math.max(1, Math.round((est.executionDuration ?? 0) / 60)),
    route: quote.toolDetails?.name ?? quote.tool,
  };
}

/** "1 ETH ≈ 2,254 USDT" rather than "1 USDT ≈ 0.00044 ETH": quote the side worth more. */
export function rateLabel(rate: number, from: TradeAsset, to: TradeAsset) {
  if (!(rate > 0)) return "";
  const [a, b, r] = rate >= 1 ? [from, to, rate] : [to, from, 1 / rate];
  return `1 ${a.symbol} ≈ ${r.toLocaleString("en-US", { maximumFractionDigits: r >= 100 ? 2 : r >= 1 ? 4 : 8 })} ${b.symbol}`;
}
