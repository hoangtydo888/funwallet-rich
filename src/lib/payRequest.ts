import { ethers } from 'ethers';
import { TRADE_ASSETS, NATIVE, type TradeAsset } from './marketOrder';

/** QR payment requests on BSC in the EIP-681 format that MetaMask, Trust Wallet and
 * Binance Web3 Wallet also read:
 *   BNB:   ethereum:<shop>@56?value=<wei>
 *   token: ethereum:<token>@56/transfer?address=<shop>&uint256=<raw amount> */
export const PAY_ASSETS: TradeAsset[] = TRADE_ASSETS.filter(a => a.chainId === 56);
const CHAIN_ID = 56;

export interface PayRequest { to: string; asset: TradeAsset; raw: bigint | null }

const isNative = (a: TradeAsset) => a.token === NATIVE;
const assetByToken = (token: string) => PAY_ASSETS.find(a => !isNative(a) && a.token.toLowerCase() === token.toLowerCase());
const nativeAsset = () => PAY_ASSETS.find(isNative)!;

export function buildPayUri({ to, asset, raw }: PayRequest): string {
  const addr = ethers.getAddress(to);
  if (isNative(asset)) return `ethereum:${addr}@${CHAIN_ID}${raw ? `?value=${raw}` : ''}`;
  return `ethereum:${ethers.getAddress(asset.token)}@${CHAIN_ID}/transfer?address=${addr}${raw ? `&uint256=${raw}` : ''}`;
}

// EIP-681 numbers may be written as 2.5e18
function parseUint(v: string): bigint {
  const m = /^(\d+)(?:\.(\d+))?(?:e(\d+))?$/i.exec(v.trim());
  if (!m) throw Error('Số tiền trong mã QR không hợp lệ');
  const [, int, frac = '', exp = '0'] = m;
  const e = Number(exp);
  if (frac.length > e) throw Error('Số tiền trong mã QR không hợp lệ');
  return BigInt(int + frac.padEnd(e, '0'));
}

/** Reads a payment QR: EIP-681 or a bare address. Only coins this wallet knows are
 * accepted, so a fake token cannot pose as USDT. The old JSON codes are refused: they
 * all carried a placeholder address that belongs to no FUN Wallet user. */
export function parsePayRequest(text: string, fallback: TradeAsset): PayRequest {
  const s = text.trim();
  if (s.startsWith('{')) throw Error('Mã QR kiểu cũ không còn dùng được; nhờ người bán tạo mã mới');
  if (ethers.isAddress(s)) return { to: ethers.getAddress(s), asset: fallback, raw: null };
  const m = /^ethereum:(?:pay-)?(0x[0-9a-fA-F]{40})(?:@(\d+))?(?:\/(\w+))?(?:\?(.*))?$/.exec(s);
  if (!m) throw Error('Đây không phải mã QR thanh toán');
  const [, target, chain, fn, query = ''] = m;
  if (chain && Number(chain) !== CHAIN_ID) throw Error('Mã QR này dùng mạng khác, không phải BNB Smart Chain');
  const params = new URLSearchParams(query);
  if (!fn) {
    const value = params.get('value');
    return { to: ethers.getAddress(target), asset: nativeAsset(), raw: value ? parseUint(value) : null };
  }
  if (fn !== 'transfer') throw Error('Mã QR yêu cầu một thao tác không phải thanh toán');
  const asset = assetByToken(target);
  if (!asset) throw Error('Mã QR yêu cầu một token lạ; ví chỉ trả bằng các coin quen thuộc');
  const to = params.get('address');
  if (!to || !ethers.isAddress(to)) throw Error('Mã QR không chứa địa chỉ người nhận hợp lệ');
  const amount = params.get('uint256');
  return { to: ethers.getAddress(to), asset, raw: amount ? parseUint(amount) : null };
}

/** Coin amount for a price in USD, rounded up so the shop never receives less. */
export function usdToRaw(usd: number, price: number, decimals: number): bigint {
  const places = Math.min(decimals, 6);
  const coins = Math.ceil((usd / price) * 10 ** places) / 10 ** places;
  return ethers.parseUnits(coins.toFixed(places), decimals);
}

const TRANSFER = ethers.id('Transfer(address,address,uint256)');
// The default BSC RPC refuses eth_getLogs; these public ones allow it from the browser
const LOG_RPCS = ['https://bsc-rpc.publicnode.com', 'https://1rpc.io/bnb'].map(url => new ethers.JsonRpcProvider(url, CHAIN_ID, { staticNetwork: true }));
async function getLogs(filter: ethers.Filter) {
  let last: unknown;
  for (const rpc of LOG_RPCS) {
    try { return await rpc.getLogs(filter); } catch (e) { last = e; }
  }
  throw last;
}

export interface PaymentSeen { hash: string | null; from: string | null; raw: bigint }

/** Looks for a payment of at least `raw` to `to` since `fromBlock` (tokens) or
 * above `startBalance` (BNB, which leaves no log). */
export async function findPayment(provider: ethers.Provider, req: PayRequest & { raw: bigint }, fromBlock: number, startBalance: bigint): Promise<PaymentSeen | null> {
  if (isNative(req.asset)) {
    const now = await provider.getBalance(req.to);
    return now - startBalance >= req.raw ? { hash: null, from: null, raw: now - startBalance } : null;
  }
  const logs = await getLogs({
    address: req.asset.token, fromBlock, toBlock: 'latest',
    topics: [TRANSFER, null, ethers.zeroPadValue(req.to, 32)],
  });
  const hit = logs.find(l => BigInt(l.data) >= req.raw);
  return hit ? { hash: hit.transactionHash, from: ethers.getAddress(ethers.dataSlice(hit.topics[1], 12)), raw: BigInt(hit.data) } : null;
}
