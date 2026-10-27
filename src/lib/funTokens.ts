export interface DexPrice {
  priceUsd: number;
  change24h: number;
}

/** Best (highest-liquidity) DexScreener pair price for a BSC token. */
export async function fetchDexPrice(address: string): Promise<DexPrice | null> {
  try {
    const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`);
    const j = await r.json();
    return pickBestPair(j?.pairs ?? []);
  } catch {
    return null;
  }
}

export function pickBestPair(pairs: any[]): DexPrice | null {
  const valid = pairs.filter((p) => p?.priceUsd && Number(p.priceUsd) > 0);
  if (!valid.length) return null;
  valid.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));
  return { priceUsd: Number(valid[0].priceUsd), change24h: Number(valid[0].priceChange?.h24 ?? 0) };
}

/** Sum of rewards still waiting to be claimed (status = pending only). */
export function sumPendingRewards(rewards: { reward_amount: string; status: string }[]): number {
  return rewards
    .filter((r) => r.status === "pending")
    .reduce((acc, r) => acc + (parseFloat(r.reward_amount) || 0), 0);
}

export function formatUsd(v: number): string {
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
