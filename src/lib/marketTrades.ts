/** On-chain trades of a BSC token from GeckoTerminal's public API: who bought or
 * sold, how much, at what price — the "Lịch sử" tab of wallet apps like Bitget. */
import { BINANCE_SYMBOLS } from './priceTracker';

const API = 'https://api.geckoterminal.com/api/v2/networks/bsc';
export const WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
export const BTCB = '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c';

/** The BSC token whose pools carry a coin's trades: BTCB for BTC, WBNB for BNB; none for USDT. */
export function bscTradeToken(asset: { key: string; token: string; chainId: number }): string | null {
  if (asset.key === 'btc') return BTCB;
  if (asset.key === 'usdt' || asset.chainId !== 56) return null;
  return asset.token === '0x0000000000000000000000000000000000000000' ? WBNB : asset.token;
}

export interface MarketTrade { hash: string; time: number; side: 'buy' | 'sell'; amount: number; priceUsd: number; valueUsd: number; wallet: string }
export interface TokenMarketInfo { holders: number | null; liquidityUsd: number; volume24hUsd: number }
interface Pool { address: string; reserveUsd: number; volumeUsd: number }

const getJson = async (url: string) => {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw Error(`HTTP ${res.status}`);
  return res.json();
};

// Shared, in-flight-aware cache: the chart and the trade list ask for the same pools at once
const poolCache = new Map<string, { at: number; pools: Promise<Pool[]> }>();
function topPools(token: string): Promise<Pool[]> {
  const key = token.toLowerCase();
  const hit = poolCache.get(key);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.pools;
  const pools = fetchPools(key);
  poolCache.set(key, { at: Date.now(), pools });
  pools.catch(() => poolCache.delete(key));
  return pools;
}
async function fetchPools(key: string): Promise<Pool[]> {
  const d = await getJson(`${API}/tokens/${key}/pools?page=1`);
  const pools: Pool[] = (d?.data ?? []).map((p: { attributes: { address: string; reserve_in_usd: string; volume_usd?: { h24?: string } } }) => ({
    address: p.attributes.address, reserveUsd: Number(p.attributes.reserve_in_usd) || 0, volumeUsd: Number(p.attributes.volume_usd?.h24) || 0,
  })).sort((a: Pool, b: Pool) => b.reserveUsd - a.reserveUsd);
  return pools;
}

export async function getTokenMarketInfo(token: string): Promise<TokenMarketInfo> {
  const [pools, info] = await Promise.all([topPools(token), getJson(`${API}/tokens/${token.toLowerCase()}/info`).catch(() => null)]);
  return {
    holders: Number(info?.data?.attributes?.holders?.count) || null,
    liquidityUsd: pools.reduce((s, p) => s + p.reserveUsd, 0),
    volume24hUsd: pools.reduce((s, p) => s + p.volumeUsd, 0),
  };
}

/** Latest trades across the token's three deepest pools (skipping dust pools), newest first. */
export async function getTokenTrades(token: string, limit = 40): Promise<MarketTrade[]> {
  const t = token.toLowerCase();
  const all = await topPools(t);
  const pools = all.filter((p, i) => i === 0 || p.reserveUsd >= 50).slice(0, 3);
  const lists = await Promise.all(pools.map(p => getJson(`${API}/pools/${p.address}/trades`).catch(() => null)));
  const trades: MarketTrade[] = [];
  for (const list of lists) for (const row of list?.data ?? []) {
    const a = row.attributes;
    if (a.is_anomalous) continue;
    const sell = a.from_token_address?.toLowerCase() === t;
    if (!sell && a.to_token_address?.toLowerCase() !== t) continue;
    trades.push({
      hash: a.tx_hash, time: Date.parse(a.block_timestamp), side: sell ? 'sell' : 'buy',
      amount: Number(sell ? a.from_token_amount : a.to_token_amount) || 0,
      priceUsd: Number(sell ? a.price_from_in_usd : a.price_to_in_usd) || 0,
      valueUsd: Number(a.volume_in_usd) || 0, wallet: a.tx_from_address,
    });
  }
  const seen = new Set<string>();
  return trades.sort((x, y) => y.time - x.time).filter(x => { const k = `${x.hash}:${x.side}:${x.amount}`; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, limit);
}

export const compactAmount = (n: number) => n.toLocaleString('en-US', { notation: n >= 10_000 ? 'compact' : 'standard', maximumFractionDigits: n >= 10_000 ? 2 : n >= 1 ? 4 : 8 });

export function timeAgo(ms: number) {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return `${s} giây trước`;
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  return `${Math.floor(s / 86400)} ngày trước`;
}

export type PriceRange = '24h' | '7d' | '30d';
export interface PricePoint { timestamp: number; price: number }

/** Real price history: Binance candles for listed coins, otherwise the token's deepest BSC pool. */
export async function getPriceHistory(symbol: string, token: string | null, range: PriceRange): Promise<PricePoint[]> {
  const pair = BINANCE_SYMBOLS[symbol.toUpperCase()];
  if (pair) {
    const [interval, limit] = range === '24h' ? ['1h', 24] : range === '7d' ? ['4h', 42] : ['1d', 30];
    const rows: string[][] = await getJson(`https://data-api.binance.vision/api/v3/klines?symbol=${pair}&interval=${interval}&limit=${limit}`);
    return rows.map(r => ({ timestamp: Number(r[0]), price: Number(r[4]) }));
  }
  if (!token) return [];
  const pool = (await topPools(token))[0];
  if (!pool) return [];
  const [frame, aggregate, limit] = range === '24h' ? ['hour', 1, 24] : range === '7d' ? ['hour', 4, 42] : ['day', 1, 30];
  const d = await getJson(`${API}/pools/${pool.address}/ohlcv/${frame}?aggregate=${aggregate}&limit=${limit}&token=${token.toLowerCase()}&currency=usd`);
  return ((d?.data?.attributes?.ohlcv_list ?? []) as number[][]).map(r => ({ timestamp: r[0] * 1000, price: r[4] })).sort((a, b) => a.timestamp - b.timestamp);
}
