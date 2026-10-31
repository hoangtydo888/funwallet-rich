import { isAddress, type Signer } from 'ethers';
import { approveLifiExact, getLifiQuote, getLifiStepTransaction, LIFI_DIAMOND, type LiFiStep } from './lifi';
import { validateLifiRequest, type LifiIntent } from './lifiValidation';
import { btcAccount, broadcastBtcTx, getBtcFeeRates, isValidBtcAddress, signProviderPsbt } from './bitcoin';

/** Market-price swaps between native Bitcoin and EVM assets through LI.FI. Money
 * only moves between this wallet's own BTC address and its own EVM address. */
export const BTC_CHAIN_ID = 20000000000001;
export { LIFI_DIAMOND };
const NATIVE = '0x0000000000000000000000000000000000000000';

export interface SwapAsset { key: string; symbol: string; name: string; chainId: number; chainName: string; token: string; decimals: number; logo: string; explorer: string }
export const BTC_ASSET: SwapAsset = { key: 'btc', symbol: 'BTC', name: 'Bitcoin', chainId: BTC_CHAIN_ID, chainName: 'Bitcoin', token: 'bitcoin', decimals: 8, logo: '/tokens/btc.svg', explorer: 'https://mempool.space' };
export const EVM_SWAP_ASSETS: SwapAsset[] = [
  { key: 'bsc-usdt', symbol: 'USDT', name: 'Tether USD', chainId: 56, chainName: 'BSC', token: '0x55d398326f99059fF775485246999027B3197955', decimals: 18, logo: '/tokens/usdt.svg', explorer: 'https://bscscan.com' },
  { key: 'bsc-bnb', symbol: 'BNB', name: 'BNB', chainId: 56, chainName: 'BSC', token: NATIVE, decimals: 18, logo: '/tokens/bnb.png', explorer: 'https://bscscan.com' },
  { key: 'bsc-usdc', symbol: 'USDC', name: 'USD Coin', chainId: 56, chainName: 'BSC', token: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', decimals: 18, logo: '/tokens/usdc.svg', explorer: 'https://bscscan.com' },
  { key: 'eth-eth', symbol: 'ETH', name: 'Ethereum', chainId: 1, chainName: 'Ethereum', token: NATIVE, decimals: 18, logo: '/tokens/eth.svg', explorer: 'https://etherscan.io' },
  { key: 'eth-usdt', symbol: 'USDT', name: 'Tether USD', chainId: 1, chainName: 'Ethereum', token: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6, logo: '/tokens/usdt.svg', explorer: 'https://etherscan.io' },
];

export async function getBtcPriceUsd(): Promise<number | null> {
  try {
    const t = await (await fetch(`https://li.quest/v1/token?chain=${BTC_CHAIN_ID}&token=bitcoin`, { signal: AbortSignal.timeout(10_000) })).json();
    const price = Number(t?.priceUSD);
    return Number.isFinite(price) && price > 0 ? price : null;
  } catch { return null; }
}

/** sell = BTC → EVM asset, buy = EVM asset → BTC. `amount` is in the paying asset's base units. */
export interface BtcSwapIntent { side: 'sell' | 'buy'; btcAddress: string; evmAddress: string; asset: SwapAsset; amount: string; slippage: number; quotedAt: number }

const legs = (i: BtcSwapIntent) => i.side === 'sell'
  ? { from: BTC_ASSET, to: i.asset, fromAddress: i.btcAddress, toAddress: i.evmAddress }
  : { from: i.asset, to: BTC_ASSET, fromAddress: i.evmAddress, toAddress: i.btcAddress };
const sameToken = (a: unknown, b: string) => typeof a === 'string' && (isAddress(b) ? isAddress(a) && a.toLowerCase() === b.toLowerCase() : a === b);
const sameAccount = (a: unknown, b: string) => typeof a === 'string' && (isAddress(b) ? isAddress(a) && a.toLowerCase() === b.toLowerCase() : a === b);

export async function quoteBtcSwap(intent: BtcSwapIntent): Promise<LiFiStep> {
  if (!isValidBtcAddress(intent.btcAddress) || !isAddress(intent.evmAddress) || !/^[1-9][0-9]*$/.test(intent.amount)) throw Error('Yêu cầu đổi không hợp lệ');
  const l = legs(intent);
  let step: LiFiStep;
  try { step = await getLifiQuote({ fromChain: l.from.chainId, toChain: l.to.chainId, fromToken: l.from.token, toToken: l.to.token, fromAmount: intent.amount, fromAddress: l.fromAddress, toAddress: l.toAddress, slippage: intent.slippage / 100 }); }
  catch (e) { throw Error(quoteErrorMessage(e, intent.side)); }
  validateBtcSwap(step, intent);
  return step;
}

function quoteErrorMessage(e: unknown, side: BtcSwapIntent['side']): string {
  const text = e instanceof Error ? e.message : String(e);
  if (/utxo/i.test(text)) return 'Ví BTC chưa có BTC đã xác nhận để bán';
  if (/insufficient|balance/i.test(text)) return side === 'sell' ? 'Số dư BTC không đủ' : 'Số dư token không đủ';
  if (/minimum|too (low|small)|amount/i.test(text)) return 'Số lượng quá nhỏ để đổi; hãy tăng số lượng';
  return 'Chưa có báo giá cho số lượng này; thử lại sau ít phút';
}

/** Bind a LI.FI response to exactly what the user saw: assets, amount, both own
 * addresses and a fresh quote. For BTC sells the PSBT deposit must match too. */
interface QuoteLike {
  action?: { fromChainId?: number; toChainId?: number; fromToken?: { address?: string }; toToken?: { address?: string }; fromAddress?: string; toAddress?: string; fromAmount?: string; slippage?: number };
  estimate?: { toAmountMin?: string };
  transactionRequest?: { to?: string; value?: string | number | bigint; data?: string };
}
export function validateBtcSwap(step: QuoteLike, intent: BtcSwapIntent, now = Date.now()) {
  const a = step?.action, l = legs(intent);
  if (!a || now < intent.quotedAt || now - intent.quotedAt > 60_000) throw Error('Báo giá đã hết hạn; hãy lấy báo giá mới');
  if (a.fromChainId !== l.from.chainId || a.toChainId !== l.to.chainId || !sameToken(a.fromToken?.address, l.from.token) || !sameToken(a.toToken?.address, l.to.token)
    || !sameAccount(a.fromAddress, l.fromAddress) || !sameAccount(a.toAddress, l.toAddress) || a.fromAmount !== intent.amount || !(Math.abs(Number(a.slippage) - intent.slippage / 100) < 1e-9)) throw Error('Báo giá không khớp yêu cầu đổi');
  if (!/^[0-9]+$/.test(step.estimate?.toAmountMin ?? '') || BigInt(step.estimate.toAmountMin) <= 0n) throw Error('Báo giá không có số nhận tối thiểu');
  if (intent.side === 'sell') {
    const tr = step.transactionRequest;
    if (!tr || !isValidBtcAddress(tr.to ?? '') || String(BigInt(tr.value ?? -1)) !== intent.amount || typeof tr.data !== 'string') throw Error('Giao dịch BTC của báo giá không hợp lệ');
  }
}

/** BTC → EVM: check, sign and broadcast the provider's PSBT ourselves. */
export async function executeBtcSell(step: LiFiStep, intent: BtcSwapIntent, privateKey: string): Promise<string> {
  validateBtcSwap(step, intent);
  if (intent.side !== 'sell' || btcAccount(privateKey).address !== intent.btcAddress) throw Error('Ví BTC không khớp');
  const tr = step.transactionRequest as { to: string; data: string };
  const fees = await getBtcFeeRates();
  const signed = signProviderPsbt(tr.data, privateKey, { to: tr.to, spend: BigInt(intent.amount), maxFeeRate: Math.max(fees.fast * 2, 20) });
  validateBtcSwap(step, intent);
  return broadcastBtcTx(signed.hex);
}

/** EVM → BTC: exact-amount approval to the LI.FI contract only, then the swap. */
export async function executeBtcBuy(step: LiFiStep, intent: BtcSwapIntent, signer: Signer, onProgress: (msg: string) => void = () => {}): Promise<string> {
  validateBtcSwap(step, intent);
  const provider = signer.provider;
  if (intent.side !== 'buy' || !provider || (await signer.getAddress()).toLowerCase() !== intent.evmAddress.toLowerCase() || (await provider.getNetwork()).chainId !== BigInt(intent.asset.chainId)) throw Error('Ví hoặc mạng đã thay đổi');
  const fresh = await getLifiStepTransaction(step);
  validateBtcSwap(fresh, intent);
  const lifiIntent: LifiIntent = { account: intent.evmAddress, fromChainId: intent.asset.chainId, toChainId: BTC_CHAIN_ID, fromToken: intent.asset.token, toToken: 'bitcoin', amount: intent.amount, slippage: intent.slippage, quotedAt: intent.quotedAt };
  const request = validateLifiRequest(fresh.transactionRequest, lifiIntent);
  if (request.to.toLowerCase() !== LIFI_DIAMOND.toLowerCase()) throw Error('Hợp đồng swap không phải LI.FI; đã dừng');
  await approveLifiExact(fresh, signer, intent.asset.token, intent.evmAddress, BigInt(intent.amount), intent.asset.symbol, onProgress);
  onProgress('Đang gửi giao dịch đổi...');
  await provider.call(request);
  const gasLimit = await provider.estimateGas(request);
  validateBtcSwap(fresh, intent);
  const tx = await signer.sendTransaction({ ...request, gasLimit: gasLimit * 120n / 100n });
  await tx.wait();
  return tx.hash;
}
