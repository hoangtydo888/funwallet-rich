import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { ethers } from 'npm:ethers@6.13.4';

interface Req {
  address: string;
  chainId: number;
  rpcUrl?: string;
}

interface DetectedToken {
  symbol: string;
  name: string;
  address: string | null;
  decimals: number;
  balance: string;
  logo?: string;
}

// Minimal common-token list per chain for on-chain scanning fallback
const COMMON_TOKENS: Record<number, { address: string; symbol: string; name: string; decimals: number }[]> = {
  56: [
    { address: '0x55d398326f99059fF775485246999027B3197955', symbol: 'USDT', name: 'Tether USD', decimals: 18 },
    { address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', symbol: 'USDC', name: 'USD Coin', decimals: 18 },
    { address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', symbol: 'BUSD', name: 'Binance USD', decimals: 18 },
    { address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', symbol: 'CAKE', name: 'PancakeSwap', decimals: 18 },
  ],
  1: [
    { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
    { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { address: '0x6B175474E89094C44Da98b954EesC2dbccb0E7F6', symbol: 'DAI', name: 'Dai', decimals: 18 },
  ],
  137: [
    { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
    { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  ],
  42161: [
    { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
    { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { address: '0x912CE59144191C1204E64559FE8253a0e49E6548', symbol: 'ARB', name: 'Arbitrum', decimals: 18 },
  ],
  10: [
    { address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
    { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { address: '0x4200000000000000000000000000000000000042', symbol: 'OP', name: 'Optimism', decimals: 18 },
  ],
  8453: [
    { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  ],
  43114: [
    { address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
    { address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  ],
};

const DEFAULT_RPC: Record<number, string> = {
  56: 'https://bsc-dataseed.binance.org/',
  1: 'https://eth.llamarpc.com',
  137: 'https://polygon-rpc.com',
  42161: 'https://arb1.arbitrum.io/rpc',
  10: 'https://mainnet.optimism.io',
  8453: 'https://mainnet.base.org',
  43114: 'https://api.avax.network/ext/bc/C/rpc',
  250: 'https://rpc.ftm.tools/',
  59144: 'https://rpc.linea.build',
  324: 'https://mainnet.era.zksync.io',
  534352: 'https://rpc.scroll.io',
  25: 'https://evm.cronos.org',
  100: 'https://rpc.gnosischain.com',
  42220: 'https://forno.celo.org',
  34443: 'https://mainnet.mode.network',
  81457: 'https://rpc.blast.io',
  5000: 'https://rpc.mantle.xyz',
  146: 'https://rpc.soniclabs.com',
  204: 'https://opbnb-mainnet-rpc.bnbchain.org',
};

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function decimals() view returns (uint8)',
];

async function scanBSC(address: string): Promise<DetectedToken[]> {
  const apiKey = Deno.env.get('BSCSCAN_API_KEY');
  if (!apiKey) return [];
  try {
    const url = `https://api.bscscan.com/api?module=account&action=tokentx&address=${address}&sort=desc&apikey=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== '1' || !Array.isArray(data.result)) return [];
    // Get unique tokens
    const seen = new Map<string, { symbol: string; name: string; decimals: number }>();
    for (const tx of data.result) {
      const addr = String(tx.contractAddress).toLowerCase();
      if (!seen.has(addr)) {
        seen.set(addr, {
          symbol: tx.tokenSymbol,
          name: tx.tokenName,
          decimals: parseInt(tx.tokenDecimal || '18'),
        });
      }
    }
    // Check current balance for each
    const provider = new ethers.JsonRpcProvider(DEFAULT_RPC[56]);
    const results: DetectedToken[] = [];
    for (const [addr, meta] of seen) {
      try {
        const c = new ethers.Contract(addr, ERC20_ABI, provider);
        const bal = (await c.balanceOf(address)) as bigint;
        if (bal > 0n) {
          results.push({
            address: addr,
            symbol: meta.symbol,
            name: meta.name,
            decimals: meta.decimals,
            balance: ethers.formatUnits(bal, meta.decimals),
          });
        }
      } catch {
        /* skip */
      }
      if (results.length >= 30) break;
    }
    return results;
  } catch (e) {
    console.error('BSC scan error', e);
    return [];
  }
}

async function scanCommonTokens(address: string, chainId: number, rpcUrl: string): Promise<DetectedToken[]> {
  const tokens = COMMON_TOKENS[chainId] || [];
  if (tokens.length === 0) return [];
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const results: DetectedToken[] = [];
  await Promise.all(
    tokens.map(async (t) => {
      try {
        const c = new ethers.Contract(t.address, ERC20_ABI, provider);
        const bal = (await c.balanceOf(address)) as bigint;
        if (bal > 0n) {
          results.push({
            address: t.address,
            symbol: t.symbol,
            name: t.name,
            decimals: t.decimals,
            balance: ethers.formatUnits(bal, t.decimals),
          });
        }
      } catch {
        /* skip */
      }
    }),
  );
  return results;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = (await req.json()) as Req;
    if (!body.address || !body.chainId) {
      return new Response(JSON.stringify({ error: 'address and chainId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!ethers.isAddress(body.address)) {
      return new Response(JSON.stringify({ error: 'invalid address' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let tokens: DetectedToken[] = [];
    if (body.chainId === 56) {
      tokens = await scanBSC(body.address);
    }
    if (tokens.length === 0) {
      const rpc = body.rpcUrl || DEFAULT_RPC[body.chainId];
      if (rpc) tokens = await scanCommonTokens(body.address, body.chainId, rpc);
    }

    return new Response(JSON.stringify({ tokens, chainId: body.chainId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('token-scanner error', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'unknown' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
