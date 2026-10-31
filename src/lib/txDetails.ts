import { Contract, ethers } from 'ethers';
import { CHAIN_TOKENS } from './chains';
import { TRADE_ASSETS } from './marketOrder';
import { formatExactTokenValue } from './tokenAmounts';

/** What a BSC transaction did for one wallet, read from its receipt: status,
 * tokens sent and received, and whether it was an approval or a contract call. */
export interface TokenMove { symbol: string; amount: string; counterparty: string }
export interface TxDetails {
  status: 'success' | 'failed';
  kind: 'approve' | 'call';
  contract: string;
  contractName: string | null;
  sent: TokenMove[];
  received: TokenMove[];
}

const TRANSFER = ethers.id('Transfer(address,address,uint256)');
const APPROVE = '0x095ea7b3';
const readable = (raw: string) => Number(raw).toLocaleString('en-US', { maximumFractionDigits: 6 });
const META_ABI = ['function symbol() view returns (string)', 'function decimals() view returns (uint8)'];

const KNOWN_CONTRACTS: Record<string, string> = {
  '0x10ed43c718714eb63d5aa57b78b54704e256024e': 'PancakeSwap',
  '0x1b81d678ffb9c0263b24a97847620c99d213eb14': 'PancakeSwap V3',
  '0x13f4ea83d0bd40e75c8222255bc855a974568dd4': 'PancakeSwap',
  '0x1231deb6f5749ef6ce6943a275a1d3e7486f4eae': 'LI.FI',
};

const tokenMeta = new Map<string, Promise<{ symbol: string; decimals: number }>>();
for (const t of CHAIN_TOKENS[56] ?? []) if (t.address) tokenMeta.set(t.address.toLowerCase(), Promise.resolve({ symbol: t.symbol, decimals: t.decimals }));
for (const a of TRADE_ASSETS) if (a.chainId === 56 && a.token.startsWith('0x') && !/^0x0+$/.test(a.token)) tokenMeta.set(a.token.toLowerCase(), Promise.resolve({ symbol: a.symbol, decimals: a.decimals }));

function metaOf(provider: ethers.Provider, address: string) {
  const key = address.toLowerCase();
  let meta = tokenMeta.get(key);
  if (!meta) {
    const c = new Contract(address, META_ABI, provider);
    meta = Promise.all([c.symbol().catch(() => 'TOKEN'), c.decimals().catch(() => 18n)]).then(([symbol, decimals]) => ({ symbol: String(symbol), decimals: Number(decimals) }));
    tokenMeta.set(key, meta);
  }
  return meta;
}

// Finished transactions never change, so their details are kept for the session
const cache = new Map<string, TxDetails>();

export async function getTxDetails(provider: ethers.Provider, hash: string, wallet: string): Promise<TxDetails | null> {
  const key = `${hash}:${wallet}`.toLowerCase();
  const hit = cache.get(key);
  if (hit) return hit;
  const [tx, receipt] = await Promise.all([provider.getTransaction(hash), provider.getTransactionReceipt(hash)]);
  if (!tx || !receipt) return null;
  const me = wallet.toLowerCase();
  const sent: TokenMove[] = [], received: TokenMove[] = [];
  if (tx.from.toLowerCase() === me && tx.value > 0n) sent.push({ symbol: 'BNB', amount: readable(ethers.formatEther(tx.value)), counterparty: tx.to ?? '' });
  for (const log of receipt.logs) {
    if (log.topics[0] !== TRANSFER || log.topics.length !== 3) continue;
    const from = ethers.getAddress(ethers.dataSlice(log.topics[1], 12)).toLowerCase();
    const to = ethers.getAddress(ethers.dataSlice(log.topics[2], 12)).toLowerCase();
    if (from !== me && to !== me) continue;
    const { symbol, decimals } = await metaOf(provider, log.address);
    const move = { symbol, amount: readable(formatExactTokenValue(BigInt(log.data).toString(), decimals)), counterparty: from === me ? to : from };
    (from === me ? sent : received).push(move);
  }
  const contract = (tx.to ?? '').toLowerCase();
  const details: TxDetails = {
    status: receipt.status === 1 ? 'success' : 'failed',
    kind: tx.data.startsWith(APPROVE) ? 'approve' : 'call',
    contract,
    contractName: KNOWN_CONTRACTS[contract] ?? (tokenMeta.has(contract) ? (await tokenMeta.get(contract)!).symbol : null),
    sent, received,
  };
  cache.set(key, details);
  return details;
}
