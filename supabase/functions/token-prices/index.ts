import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const ADDR_RE = /^0x[a-fA-F0-9]{40}$/;
const MAX_ITEMS = 30;

interface PriceInfo {
  symbol: string;
  name: string;
  priceUsd: string | null;
  priceChange24h: number | null;
  liquidityUsd: number | null;
  chainId: string | null;
  pairUrl: string | null;
}

function bestPair(pairs: any[]): PriceInfo | null {
  if (!Array.isArray(pairs) || pairs.length === 0) return null;
  const sorted = [...pairs].sort((a, b) => (Number(b?.liquidity?.usd) || 0) - (Number(a?.liquidity?.usd) || 0));
  const p = sorted[0];
  if (!p) return null;
  return {
    symbol: p.baseToken?.symbol ?? p.quoteToken?.symbol ?? "",
    name: p.baseToken?.name ?? "",
    priceUsd: p.priceUsd ?? null,
    priceChange24h: p.priceChange?.h24 ?? null,
    liquidityUsd: Number(p.liquidity?.usd) || null,
    chainId: p.chainId ?? null,
    pairUrl: p.url ?? null,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST" && req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  try {
    // Require an authenticated Supabase user (protects upstream quota)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || claimsData?.claims?.role !== "authenticated") return json({ error: "Unauthorized" }, 401);

    let addresses: string[] = [];
    let symbols: string[] = [];

    if (req.method === "GET") {
      const url = new URL(req.url);
      addresses = (url.searchParams.get("addresses") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
      symbols = (url.searchParams.get("symbols") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    } else {
      const body = await req.json().catch(() => ({}));
      if (body && typeof body === "object") {
        addresses = Array.isArray((body as any).addresses) ? (body as any).addresses.map(String) : [];
        symbols = Array.isArray((body as any).symbols) ? (body as any).symbols.map(String) : [];
      }
    }

    addresses = [...new Set(addresses.filter((a) => ADDR_RE.test(a)))].slice(0, MAX_ITEMS);
    symbols = [...new Set(symbols.map((s) => s.toUpperCase()).filter((s) => s.length >= 2 && s.length <= 32))].slice(0, MAX_ITEMS);
    if (addresses.length === 0 && symbols.length === 0) {
      return json({ error: "Provide at least one valid token address (0x…) or symbol" }, 400);
    }

    const prices: Record<string, PriceInfo | null> = {};

    if (addresses.length > 0) {
      const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${addresses.join(",")}`, {
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        const pairs: any[] = Array.isArray(data?.pairs) ? data.pairs : [];
        const byAddress = new Map<string, any[]>();
        for (const p of pairs) {
          const a = String(p?.baseToken?.address ?? "").toLowerCase();
          if (!a) continue;
          if (!byAddress.has(a)) byAddress.set(a, []);
          byAddress.get(a)!.push(p);
        }
        for (const addr of addresses) {
          const match = byAddress.get(addr.toLowerCase());
          prices[addr] = match ? bestPair(match) : null;
        }
      } else {
        for (const addr of addresses) prices[addr] = null;
      }
    }

    for (const sym of symbols) {
      const res = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(sym)}`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        prices[sym] = null;
        continue;
      }
      const data = await res.json().catch(() => null);
      const pairs: any[] = Array.isArray(data?.pairs) ? data.pairs : [];
      const matching = pairs.filter(
        (p) =>
          String(p?.baseToken?.symbol ?? "").toUpperCase() === sym ||
          String(p?.quoteToken?.symbol ?? "").toUpperCase() === sym
      );
      prices[sym] = matching.length > 0 ? bestPair(matching) : null;
    }

    return json({ prices });
  } catch (err) {
    console.error("token-prices error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
