import {readBoundedJson,upstreamJson,requireScanBudget,scannerFailure} from '../_shared/scannerSafety.ts';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
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

function boundedProvider(url:string) {
 const request=new ethers.FetchRequest(url);request.timeout=5000;
 return new ethers.JsonRpcProvider(request);
}
async function rpcWork<T>(url:string,chainId:number,work:(provider:ethers.JsonRpcProvider)=>Promise<T>):Promise<T> {
 const provider=boundedProvider(url);let timer:ReturnType<typeof setTimeout>|undefined;
 try{return await Promise.race([(async()=>{if((await provider.getNetwork()).chainId!==BigInt(chainId))throw Error('RPC chain mismatch');return await work(provider);})(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('RPC deadline exceeded')),8000);})]);}
 finally{clearTimeout(timer);provider.destroy();}
}

async function scanBSC(address: string): Promise<DetectedToken[]> {
  const apiKey = Deno.env.get('BSCSCAN_API_KEY');
  if (!apiKey) return [];
  try {
    const url = `https://api.bscscan.com/api?module=account&action=tokentx&address=${address}&page=1&offset=100&sort=desc&apikey=${apiKey}`;
    const data = await upstreamJson(url);
    if (data.status !== '1' || !Array.isArray(data.result)) return [];
    // Get unique tokens
    const seen = new Map<string, { symbol: string; name: string; decimals: number }>();
    for (const tx of data.result) {
      const addr = String(tx.contractAddress).toLowerCase();
      const decimals=parseInt(tx.tokenDecimal || '18');
      if (!ethers.isAddress(addr)||!Number.isInteger(decimals)||decimals<0||decimals>36)continue;
      if (!seen.has(addr)) {
        seen.set(addr, {
          symbol: tx.tokenSymbol,
          name: tx.tokenName,
          decimals,
        });
      }
    }
    // Check current balance for each
    return await rpcWork(DEFAULT_RPC[56],56,async(provider)=>{
      const results=await Promise.all([...seen].slice(0,30).map(async([addr,meta])=>{
       try{
        const c=new ethers.Contract(addr,ERC20_ABI,provider);
        const [bal,rawDecimals]=await Promise.all([c.balanceOf(address),c.decimals()]);
        if(typeof bal!=='bigint'||bal<=0n||BigInt(rawDecimals)>36n)return null;
        const decimals=parseInt(String(rawDecimals),10);
        return {address:addr,symbol:String(meta.symbol).slice(0,32),name:String(meta.name).slice(0,120),decimals,balance:ethers.formatUnits(bal,decimals)};
       }catch{return null;}
      }));return results.filter((value):value is NonNullable<typeof value>=>value!==null);
    });
  } catch (e) {
    console.error('BSC scan failed');
    return [];
  }
}

async function scanCommonTokens(address: string, chainId: number, rpcUrl: string): Promise<DetectedToken[]> {
  const tokens = COMMON_TOKENS[chainId] || [];
  if (tokens.length === 0) return [];
  return await rpcWork(rpcUrl,chainId,async(provider)=>{
  const results: DetectedToken[] = [];
  await Promise.all(
    tokens.map(async (t) => {
      try {
        const c = new ethers.Contract(t.address, ERC20_ABI, provider);
        const [bal,rawDecimals]=await Promise.all([c.balanceOf(address),c.decimals()]);
        const decimals=parseInt(String(rawDecimals),10);
        if (typeof bal==='bigint'&&bal>0n&&Number.isInteger(decimals)&&decimals>=0&&decimals<=36) {
          results.push({
            address: t.address,
            symbol: t.symbol,
            name: t.name,
            decimals,
            balance: ethers.formatUnits(bal,decimals),
          });
        }
      } catch {
        /* skip */
      }
    }),
  );
  return results;
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (req.method !== 'POST') return new Response('POST only', { status:405, headers:corsHeaders });
  try {
    const authorization=req.headers.get('Authorization');
    if(!authorization?.startsWith('Bearer ')) return new Response('Unauthorized',{status:401,headers:corsHeaders});
    const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!);
    const {data,error}=await client.auth.getClaims(authorization.slice(7));
    if(error || typeof data?.claims?.sub !== 'string' || data.claims.role !== 'authenticated') return new Response('Unauthorized',{status:401,headers:corsHeaders});
    const budgetClient=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
    await requireScanBudget(budgetClient,data.claims.sub,'token-scanner');
    if(Number(req.headers.get('Content-Length')||0)>4096)return new Response('Payload too large',{status:413,headers:corsHeaders});
    const body = (await readBoundedJson(req) as any) as Req;
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

    if(!Number.isInteger(body.chainId)||!DEFAULT_RPC[body.chainId])return new Response('Unsupported chain',{status:400,headers:corsHeaders});
    let tokens: DetectedToken[] = [];
    if (body.chainId === 56) {
      tokens = await scanBSC(body.address);
    }
    if (tokens.length === 0) {
      const rpc = DEFAULT_RPC[body.chainId];
      if (rpc) tokens = await scanCommonTokens(body.address, body.chainId, rpc);
    }

    return new Response(JSON.stringify({ tokens, chainId: body.chainId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return scannerFailure(e,corsHeaders);
  }
});
