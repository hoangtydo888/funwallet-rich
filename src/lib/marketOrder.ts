import { isAddress } from 'ethers';
import { executeLifiSwap, getLifiQuote, type LiFiStep } from './lifi';
import { validateLifiIntent, type LifiIntent } from './lifiValidation';
import { BTC_ASSET, executeBtcBuy, executeBtcSell, quoteBtcSwap, type BtcSwapIntent, type SwapAsset } from './btcSwap';
import { BTC_EXPLORER, isValidBtcAddress } from './bitcoin';
import { createSessionSigner } from './guardedSigner';
import { getChainById, getProviderForChain } from './chains';

/** Market orders that settle in the user's own wallet: BEP20 ↔ BEP20 swaps on
 * BSC through LI.FI, and native Bitcoin through LI.FI's BTC routes. Order-book
 * prices come from Binance's public market data and are shown for reference. */
export const NATIVE = '0x0000000000000000000000000000000000000000';
export interface TradeAsset extends SwapAsset { binance?: string }

const bsc = (key: string, symbol: string, name: string, token: string, decimals: number, logo: string, binance?: string): TradeAsset =>
  ({ key, symbol, name, chainId: 56, chainName: 'BSC', token, decimals, logo, explorer: 'https://bscscan.com', binance });

export const QUOTE_ASSET = bsc('usdt', 'USDT', 'Tether USD', '0x55d398326f99059fF775485246999027B3197955', 18, '/tokens/usdt.svg');
export const TRADE_ASSETS: TradeAsset[] = [
  { ...BTC_ASSET, key: 'btc', binance: 'BTCUSDT' },
  bsc('bnb', 'BNB', 'BNB', NATIVE, 18, '/tokens/bnb.png', 'BNBUSDT'),
  bsc('eth', 'ETH', 'Ethereum (BEP20)', '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', 18, '/tokens/eth.svg', 'ETHUSDT'),
  bsc('sol', 'SOL', 'Solana (BEP20)', '0x570A5D26f7765Ecb712C0924E4De545B89fD43dF', 18, '/tokens/sol.svg', 'SOLUSDT'),
  bsc('xrp', 'XRP', 'XRP (BEP20)', '0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE', 18, '/tokens/xrp.svg', 'XRPUSDT'),
  bsc('doge', 'DOGE', 'Dogecoin (BEP20)', '0xbA2aE424d960c26247Dd6c32edC70B295c744C43', 8, '/tokens/doge.svg', 'DOGEUSDT'),
  bsc('ada', 'ADA', 'Cardano (BEP20)', '0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47', 18, '/tokens/ada.svg', 'ADAUSDT'),
  bsc('link', 'LINK', 'Chainlink (BEP20)', '0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD', 18, '/tokens/link.svg', 'LINKUSDT'),
  bsc('avax', 'AVAX', 'Avalanche (BEP20)', '0x1CE0c2827e2eF14D5C4f29a091d735A204794041', 18, '/tokens/avax.svg', 'AVAXUSDT'),
  bsc('cake', 'CAKE', 'PancakeSwap', '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', 18, '/tokens/cake.svg', 'CAKEUSDT'),
  bsc('camly', 'CAMLY', 'CAMLY COIN', '0x0910320181889fefde0bb1ca63962b0a8882e413', 3, '/tokens/camly.png'),
  bsc('usdc', 'USDC', 'USD Coin', '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', 18, '/tokens/usdc.svg', 'USDCUSDT'),
  QUOTE_ASSET,
];
export const assetByKey = (key: string) => TRADE_ASSETS.find(a => a.key === key);
export const isBtc = (a: TradeAsset) => a.key === 'btc';

// ---- Market data (Binance public API, no key, CORS enabled) ----
const BINANCE = 'https://data-api.binance.vision/api/v3';
export interface Ticker { symbol: string; price: number; changePct: number; high: number; low: number; quoteVolume: number }
export interface Depth { bids: [number, number][]; asks: [number, number][] }

const getJson = async (url: string) => {
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw Error(`HTTP ${res.status}`);
  return res.json();
};

export async function getTickers(symbols: string[]): Promise<Record<string, Ticker>> {
  if (!symbols.length) return {};
  const rows = await getJson(`${BINANCE}/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(symbols))}`);
  const out: Record<string, Ticker> = {};
  for (const r of Array.isArray(rows) ? rows : []) {
    out[r.symbol] = { symbol: r.symbol, price: Number(r.lastPrice), changePct: Number(r.priceChangePercent), high: Number(r.highPrice), low: Number(r.lowPrice), quoteVolume: Number(r.quoteVolume) };
  }
  return out;
}

export async function getDepth(symbol: string, limit = 10): Promise<Depth> {
  const d = await getJson(`${BINANCE}/depth?symbol=${encodeURIComponent(symbol)}&limit=${limit}`);
  const rows = (x: unknown): [number, number][] => (Array.isArray(x) ? x : []).map((r: string[]) => [Number(r[0]), Number(r[1])]);
  return { bids: rows(d.bids), asks: rows(d.asks) };
}

/** USD price for tokens Binance does not list (e.g. CAMLY). */
export async function getLifiPriceUsd(asset: TradeAsset): Promise<number | null> {
  try {
    const t = await getJson(`https://li.quest/v1/token?chain=${asset.chainId}&token=${asset.token}`);
    const p = Number(t?.priceUSD);
    return Number.isFinite(p) && p > 0 ? p : null;
  } catch { return null; }
}

// ---- Orders ----
export interface MarketOrder { from: TradeAsset; to: TradeAsset; amount: string; slippage: number; evmAddress: string; btcAddress: string | null; quotedAt: number }
export interface OrderResult { hash: string; explorer: string; crossChain: boolean }

const btcIntent = (o: MarketOrder): BtcSwapIntent => ({
  side: isBtc(o.from) ? 'sell' : 'buy', btcAddress: o.btcAddress ?? '', evmAddress: o.evmAddress,
  asset: isBtc(o.from) ? o.to : o.from, amount: o.amount, slippage: o.slippage, quotedAt: o.quotedAt,
});
const lifiIntent = (o: MarketOrder): LifiIntent => ({
  account: o.evmAddress, fromChainId: o.from.chainId, toChainId: o.to.chainId, fromToken: o.from.token, toToken: o.to.token,
  amount: o.amount, slippage: o.slippage, quotedAt: o.quotedAt,
});

function quoteError(e: unknown): string {
  const text = e instanceof Error ? e.message : String(e);
  if (/insufficient|balance/i.test(text)) return 'Số dư không đủ';
  if (/minimum|too (low|small)/i.test(text)) return 'Số lượng quá nhỏ; hãy tăng số lượng';
  if (/no (available )?(quotes?|routes?)|not found/i.test(text)) return 'Chưa có thanh khoản cho cặp này; thử số lượng khác';
  return 'Chưa lấy được báo giá; thử lại sau ít phút';
}

export function checkOrder(o: MarketOrder) {
  if (o.from.key === o.to.key) throw Error('Chọn hai đồng coin khác nhau');
  if (!isAddress(o.evmAddress) || !/^[1-9][0-9]*$/.test(o.amount)) throw Error('Lệnh không hợp lệ');
  if ((isBtc(o.from) || isBtc(o.to)) && !isValidBtcAddress(o.btcAddress ?? '')) throw Error('Mở khóa ví để dùng ví Bitcoin');
}

export async function quoteMarketOrder(o: MarketOrder): Promise<LiFiStep> {
  checkOrder(o);
  if (isBtc(o.from) || isBtc(o.to)) return quoteBtcSwap(btcIntent(o));
  let step: LiFiStep;
  try {
    step = await getLifiQuote({ fromChain: o.from.chainId, toChain: o.to.chainId, fromToken: o.from.token, toToken: o.to.token, fromAmount: o.amount, fromAddress: o.evmAddress, toAddress: o.evmAddress, slippage: o.slippage / 100 });
  } catch (e) { throw Error(quoteError(e)); }
  validateLifiIntent(step, lifiIntent(o));
  return step;
}

/** Signs and sends the quoted order. Approvals are exact-amount and only to LI.FI. */
export async function executeMarketOrder(step: LiFiStep, o: MarketOrder, privateKey: string, onProgress: (msg: string) => void = () => {}): Promise<OrderResult> {
  checkOrder(o);
  if (isBtc(o.from)) {
    onProgress('Đang ký và gửi BTC...');
    return { hash: await executeBtcSell(step, btcIntent(o), privateKey), explorer: BTC_EXPLORER, crossChain: true };
  }
  const chain = getChainById(o.from.chainId);
  if (!chain) throw Error('Mạng không được hỗ trợ');
  const signer = createSessionSigner(privateKey, getProviderForChain(chain), chain.chainId);
  if (isBtc(o.to)) return { hash: await executeBtcBuy(step, btcIntent(o), signer, onProgress), explorer: o.from.explorer, crossChain: true };
  return { hash: await executeLifiSwap(step, signer, lifiIntent(o), o.from.symbol, onProgress), explorer: o.from.explorer, crossChain: false };
}
