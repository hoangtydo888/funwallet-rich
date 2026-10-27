import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3.23.8';

const BodySchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  chainIds: z.array(z.number()).min(1).max(10),
});

// Alchemy network slug per chainId
const ALCHEMY_NETWORKS: Record<number, string> = {
  1: 'eth-mainnet',
  137: 'polygon-mainnet',
  42161: 'arb-mainnet',
  10: 'opt-mainnet',
  8453: 'base-mainnet',
};

interface NFTResult {
  contractAddress: string;
  tokenId: string;
  standard: 'ERC721' | 'ERC1155';
  name: string;
  image: string;
  collection: string;
  chainId: number;
  balance: string;
  floorPrice?: number | null;
  explorerUrl?: string;
}

async function scanBSC(address: string): Promise<NFTResult[]> {
  const key = Deno.env.get('BSCSCAN_API_KEY');
  if (!key) return [];
  const results: NFTResult[] = [];
  const endpoints: Array<[string, 'ERC721' | 'ERC1155']> = [
    ['tokennfttx', 'ERC721'],
    ['token1155tx', 'ERC1155'],
  ];
  for (const [action, standard] of endpoints) {
    const url = `https://api.bscscan.com/api?module=account&action=${action}&address=${address}&page=1&offset=100&sort=desc&apikey=${key}`;
    try {
      const r = await fetch(url);
      const j = await r.json();
      if (j.status !== '1' || !Array.isArray(j.result)) continue;
      // Aggregate: keep NFTs currently owned (incoming - outgoing != 0)
      const owned = new Map<string, NFTResult>();
      for (const tx of j.result) {
        const key = `${tx.contractAddress}-${tx.tokenID}`;
        if (tx.to?.toLowerCase() === address.toLowerCase()) {
          owned.set(key, {
            contractAddress: tx.contractAddress,
            tokenId: tx.tokenID,
            standard,
            name: `${tx.tokenName || 'NFT'} #${tx.tokenID}`,
            image: '',
            collection: tx.tokenName || 'Unknown',
            chainId: 56,
            balance: '1',
          });
        } else if (tx.from?.toLowerCase() === address.toLowerCase()) {
          owned.delete(key);
        }
      }
      results.push(...owned.values());
    } catch (e) {
      console.error(`BSC ${action} error:`, e);
    }
  }
  return results;
}

const EXPLORERS: Record<number, string> = {
  1: 'https://etherscan.io',
  56: 'https://bscscan.com',
  137: 'https://polygonscan.com',
  42161: 'https://arbiscan.io',
  10: 'https://optimistic.etherscan.io',
  8453: 'https://basescan.org',
};

function explorerUrl(chainId: number, contract: string, tokenId: string) {
  const base = EXPLORERS[chainId];
  return base ? `${base}/nft/${contract}/${tokenId}` : '';
}

function ipfsToHttp(u: string) {
  return u?.startsWith('ipfs://') ? `https://ipfs.io/ipfs/${u.slice(7)}` : u;
}

async function floorPrice(network: string, key: string, contract: string): Promise<number | null> {
  try {
    const r = await fetch(`https://${network}.g.alchemy.com/nft/v3/${key}/getFloorPrice?contractAddress=${contract}`);
    if (!r.ok) return null;
    const j = await r.json();
    const vals = [j?.openSea?.floorPrice, j?.looksRare?.floorPrice].filter((v) => typeof v === 'number');
    return vals.length ? Math.min(...vals) : null;
  } catch { return null; }
}

async function scanAlchemy(address: string, chainId: number): Promise<NFTResult[]> {
  const key = Deno.env.get('ALCHEMY_API_KEY');
  const network = ALCHEMY_NETWORKS[chainId];
  if (!key || !network) return [];
  const url = `https://${network}.g.alchemy.com/nft/v3/${key}/getNFTsForOwner?owner=${address}&withMetadata=true&pageSize=100`;
  try {
    const r = await fetch(url);
    if (!r.ok) {
      console.error(`Alchemy ${network} ${r.status}: ${await r.text()}`);
      return [];
    }
    const j = await r.json();
    const owned = (j.ownedNfts || []).filter((n: any) => !n.contract?.isSpam);
    // Floor price per collection (Alchemy only reliably supports Ethereum)
    const floors = new Map<string, number | null>();
    const contracts = [...new Set(owned.map((n: any) => n.contract?.address).filter(Boolean))] as string[];
    if (chainId === 1) {
      await Promise.all(contracts.slice(0, 20).map(async (c) => floors.set(c, await floorPrice(network, key, c))));
    }
    return owned.map((n: any): NFTResult => {
      const contract = n.contract?.address ?? '';
      const tokenId = n.tokenId ?? '';
      const osFloor = n.contract?.openSeaMetadata?.floorPrice;
      return {
        contractAddress: contract,
        tokenId,
        standard: (n.tokenType === 'ERC1155' ? 'ERC1155' : 'ERC721'),
        name: n.name || n.contract?.name || `#${tokenId}`,
        image: ipfsToHttp(n.image?.cachedUrl || n.image?.thumbnailUrl || n.image?.originalUrl || n.raw?.metadata?.image || ''),
        collection: n.contract?.name || n.contract?.openSeaMetadata?.collectionName || 'Unknown',
        chainId,
        balance: n.balance ?? '1',
        floorPrice: floors.get(contract) ?? (typeof osFloor === 'number' ? osFloor : null),
        explorerUrl: explorerUrl(chainId, contract, tokenId),
      };
    });
  } catch (e) {
    console.error(`Alchemy ${network} error:`, e);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Validate JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claimData, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !claimData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { address, chainIds } = parsed.data;

    const perChain = await Promise.all(chainIds.map(async (chainId) => {
      if (chainId === 56) {
        return { chainId, nfts: await scanBSC(address), unsupported: false };
      }
      if (ALCHEMY_NETWORKS[chainId]) {
        return { chainId, nfts: await scanAlchemy(address, chainId), unsupported: !Deno.env.get('ALCHEMY_API_KEY') };
      }
      return { chainId, nfts: [] as NFTResult[], unsupported: true };
    }));

    const all = perChain.flatMap((p) => p.nfts);
    const unsupportedChains = perChain.filter((p) => p.unsupported).map((p) => p.chainId);

    return new Response(
      JSON.stringify({ nfts: all, perChain, unsupportedChains }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('nft-scanner error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'unknown' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
