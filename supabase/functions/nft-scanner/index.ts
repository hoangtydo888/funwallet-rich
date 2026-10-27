import {nftOwnershipCalls,ownedNftResults} from '../_shared/nftOwnership.ts';
import {readBoundedJson,upstreamJson,requireScanBudget,scannerFailure} from '../_shared/scannerSafety.ts';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3.23.8';

const BodySchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  chainIds: z.array(z.number().int().positive()).min(1).max(10),
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
      const j=await upstreamJson(url);
      if (j.status !== '1' || !Array.isArray(j.result)) continue;
      // History only supplies candidates. Current on-chain ownership decides display.
      const owned = new Map<string, NFTResult>();
      for (const tx of j.result) {
        const key = `${tx.contractAddress}-${tx.tokenID}`;
        if (!/^0x[\da-f]{40}$/i.test(tx.contractAddress)||!/^\d+$/.test(tx.tokenID)||BigInt(tx.tokenID)>=1n<<256n)continue;
        if (!owned.has(key)) {
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
        }
      }
      const candidates=[...owned.values()].slice(0,40);
      if(candidates.length){const proof=await upstreamJson('https://bsc-dataseed.binance.org/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(nftOwnershipCalls(candidates,address))});results.push(...ownedNftResults(candidates,proof,address));}
    } catch (e) {
      console.error('Upstream scanner failed');
    }
  }
  return results;
}

async function scanAlchemy(address: string, chainId: number): Promise<NFTResult[]> {
  const key = Deno.env.get('ALCHEMY_API_KEY');
  const network = ALCHEMY_NETWORKS[chainId];
  if (!key || !network) return [];
  const url = `https://${network}.g.alchemy.com/nft/v3/${key}/getNFTsForOwner?owner=${address}&withMetadata=true&pageSize=100`;
  try {
    const j=await upstreamJson(url);
    return (j.ownedNfts || []).map((n: any): NFTResult => ({
      contractAddress: n.contract?.address ?? '',
      tokenId: n.tokenId ?? '',
      standard: (n.tokenType === 'ERC1155' ? 'ERC1155' : 'ERC721'),
      name: n.name || n.contract?.name || `#${n.tokenId}`,
      image: n.image?.cachedUrl || n.image?.originalUrl || n.image?.thumbnailUrl || '',
      collection: n.contract?.name || 'Unknown',
      chainId,
      balance: n.balance ?? '1',
    }));
  } catch (e) {
    console.error('Upstream scanner failed');
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if(req.method!=='POST')return new Response('POST only',{status:405,headers:corsHeaders});

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
    if (authError || typeof claimData?.claims?.sub !== 'string' || claimData.claims.role !== 'authenticated') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const budgetClient=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
    await requireScanBudget(budgetClient,claimData.claims.sub,'nft-scanner');
    const parsed = BodySchema.safeParse(await readBoundedJson(req));
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { address, chainIds } = parsed.data;

    const perChain = await Promise.all([...new Set(chainIds)].map(async (chainId) => {
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
    return scannerFailure(e,corsHeaders);
  }
});
