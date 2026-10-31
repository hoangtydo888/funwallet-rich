import { Contract, ethers } from 'ethers';
import type { LiFiStep } from './lifi';
import { ERC20_ABI } from './wallet';
import { PANCAKE_ROUTER, PANCAKE_ROUTER_ABI, WBNB_ADDRESS } from './swap';

/** Buy orders on BSC swap straight through the PancakeSwap V2 router, so they
 * carry no aggregator service fee (only the pool's own fee, already in the price). */
export const PANCAKE_DIRECT = 'pancakeswap-direct';
const NATIVE = '0x0000000000000000000000000000000000000000';
const SWAP_GAS = 220_000n;
// PancakeSwap V3 on BSC: quoter for prices, SwapRouter for single-pool swaps
export const PANCAKE_V3_ROUTER = '0x1b81D678ffb9C0263b24A97847620C99d213eB14';
const PANCAKE_V3_QUOTER = '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997';
const V3_FEES = [100, 500, 2500, 10000];
const V3_QUOTER_ABI = ['function quoteExactInputSingle((address tokenIn,address tokenOut,uint256 amountIn,uint24 fee,uint160 sqrtPriceLimitX96)) returns (uint256 amountOut,uint160,uint32,uint256)'];
const V3_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96)) payable returns (uint256 amountOut)',
  'function unwrapWETH9(uint256 amountMinimum,address recipient) payable',
  'function multicall(bytes[] data) payable returns (bytes[] results)',
];

/** v2: a router path; v3: one pool with its fee tier. */
export type PancakeRoute = { kind: 'v2'; path: string[]; amountOut: bigint } | { kind: 'v3'; path: string[]; fee: number; amountOut: bigint };

const wrapped = (token: string) => (token.toLowerCase() === NATIVE ? WBNB_ADDRESS : token);
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export interface PancakeOrder { fromToken: string; toToken: string; amount: bigint; slippage: number; account: string; fromDecimals: number; toDecimals: number; fromSymbol: string; toSymbol: string }

/** Best output over V3 pools (every fee tier), the V2 pool, and V2 through WBNB; null when no pool exists. */
export async function bestPancakeRoute(provider: ethers.Provider, fromToken: string, toToken: string, amount: bigint): Promise<PancakeRoute | null> {
  const a = wrapped(fromToken), b = wrapped(toToken);
  const paths = [[a, b]];
  if (!same(a, WBNB_ADDRESS) && !same(b, WBNB_ADDRESS)) paths.push([a, WBNB_ADDRESS, b]);
  const router = new Contract(PANCAKE_ROUTER, PANCAKE_ROUTER_ABI, provider);
  const quoter = new Contract(PANCAKE_V3_QUOTER, V3_QUOTER_ABI, provider);
  const outs = await Promise.all([
    ...paths.map(async (path): Promise<PancakeRoute | null> => {
      try { const amounts: bigint[] = await router.getAmountsOut(amount, path); return { kind: 'v2', path, amountOut: amounts[amounts.length - 1] }; }
      catch { return null; }
    }),
    ...V3_FEES.map(async (fee): Promise<PancakeRoute | null> => {
      try { const r = await quoter.quoteExactInputSingle.staticCall({ tokenIn: a, tokenOut: b, amountIn: amount, fee, sqrtPriceLimitX96: 0 }); return { kind: 'v3', path: [a, b], fee, amountOut: r[0] }; }
      catch { return null; }
    }),
  ]);
  return outs.reduce<PancakeRoute | null>((best, r) => (r && r.amountOut > 0n && (!best || r.amountOut > best.amountOut) ? r : best), null);
}

/** A quote in the same shape as a LI.FI step, so the order screens can show either. */
export async function quotePancake(provider: ethers.Provider, o: PancakeOrder, bnbUsd: number): Promise<LiFiStep | null> {
  const route = await bestPancakeRoute(provider, o.fromToken, o.toToken, o.amount);
  if (!route) return null;
  const bps = BigInt(Math.round(o.slippage * 100));
  const toAmountMin = route.amountOut * (10_000n - bps) / 10_000n;
  const gasPrice = (await provider.getFeeData()).gasPrice ?? 1_000_000_000n;
  const gasUsd = Number(ethers.formatEther(gasPrice * SWAP_GAS)) * bnbUsd;
  return {
    type: 'swap', id: `${PANCAKE_DIRECT}-${Date.now()}`, tool: PANCAKE_DIRECT,
    toolDetails: { key: PANCAKE_DIRECT, name: `PancakeSwap ${route.kind.toUpperCase()} (trực tiếp, 0 phí dịch vụ)`, logoURI: '' },
    action: {
      fromChainId: 56, toChainId: 56, fromAmount: o.amount.toString(), slippage: o.slippage / 100, fromAddress: o.account, toAddress: o.account,
      fromToken: { address: o.fromToken, symbol: o.fromSymbol, decimals: o.fromDecimals, chainId: 56 },
      toToken: { address: o.toToken, symbol: o.toSymbol, decimals: o.toDecimals, chainId: 56 },
    },
    estimate: {
      tool: PANCAKE_DIRECT, fromAmount: o.amount.toString(), toAmount: route.amountOut.toString(), toAmountMin: toAmountMin.toString(),
      approvalAddress: route.kind === 'v3' ? PANCAKE_V3_ROUTER : PANCAKE_ROUTER, executionDuration: 5, feeCosts: [],
      gasCosts: [{ type: 'SEND', amount: (gasPrice * SWAP_GAS).toString(), amountUSD: gasUsd.toFixed(4) }],
    },
    includedSteps: [],
    pancakeRoute: { kind: route.kind, path: route.path, fee: route.kind === 'v3' ? route.fee : undefined },
  } as unknown as LiFiStep;
}

export const isPancakeStep = (step: LiFiStep) => step.tool === PANCAKE_DIRECT;

/** Approves exactly the amount to the PancakeSwap router used, simulates, then swaps.
 * The minimum received is the one shown in the confirmation, never lowered. */
export async function executePancake(step: LiFiStep, o: PancakeOrder, signer: ethers.Signer, onProgress: (msg: string) => void = () => {}): Promise<string> {
  const route = (step as unknown as { pancakeRoute?: { kind: 'v2' | 'v3'; path: string[]; fee?: number } }).pancakeRoute;
  const minOut = BigInt(step.estimate.toAmountMin);
  if (!route || route.path.length < 2 || !same(route.path[0], wrapped(o.fromToken)) || !same(route.path[route.path.length - 1], wrapped(o.toToken))
    || (route.kind === 'v3' && (route.path.length !== 2 || !V3_FEES.includes(route.fee ?? -1)))
    || step.estimate.fromAmount !== o.amount.toString() || minOut <= 0n) throw Error('Báo giá không khớp lệnh; lấy báo giá mới');
  if ((await signer.getAddress()).toLowerCase() !== o.account.toLowerCase()) throw Error('Ví đã thay đổi');

  const nativeIn = same(o.fromToken, NATIVE), nativeOut = same(o.toToken, NATIVE);
  const spender = route.kind === 'v3' ? PANCAKE_V3_ROUTER : PANCAKE_ROUTER;
  if (!nativeIn) {
    const token = new Contract(o.fromToken, ERC20_ABI, signer);
    const allowance: bigint = await token.allowance(o.account, spender);
    if (allowance < o.amount) {
      onProgress(`Đang cấp quyền dùng đúng ${ethers.formatUnits(o.amount, o.fromDecimals)} ${o.fromSymbol} cho PancakeSwap...`);
      await (await token.approve(spender, o.amount)).wait();
    }
  }
  const deadline = Math.floor(Date.now() / 1000) + 300;
  const value = nativeIn ? o.amount : 0n;
  let contract: Contract, fn: string, args: unknown[];
  if (route.kind === 'v3') {
    contract = new Contract(PANCAKE_V3_ROUTER, V3_ROUTER_ABI, signer);
    // Native BNB out: swap WBNB to the router, then unwrap to the wallet in the same transaction
    const params = { tokenIn: route.path[0], tokenOut: route.path[1], fee: route.fee, recipient: nativeOut ? PANCAKE_V3_ROUTER : o.account, deadline, amountIn: o.amount, amountOutMinimum: minOut, sqrtPriceLimitX96: 0 };
    if (nativeOut) {
      fn = 'multicall';
      args = [[contract.interface.encodeFunctionData('exactInputSingle', [params]), contract.interface.encodeFunctionData('unwrapWETH9', [minOut, o.account])]];
    } else { fn = 'exactInputSingle'; args = [params]; }
  } else {
    contract = new Contract(PANCAKE_ROUTER, PANCAKE_ROUTER_ABI, signer);
    [fn, args] = nativeIn
      ? ['swapExactETHForTokensSupportingFeeOnTransferTokens', [minOut, route.path, o.account, deadline]]
      : nativeOut
        ? ['swapExactTokensForETHSupportingFeeOnTransferTokens', [o.amount, minOut, route.path, o.account, deadline]]
        : ['swapExactTokensForTokensSupportingFeeOnTransferTokens', [o.amount, minOut, route.path, o.account, deadline]];
  }
  onProgress('Đang kiểm tra lệnh...');
  try { await contract[fn].staticCall(...args, { value }); }
  catch { throw Error('Giá đã thay đổi quá mức trượt giá; bấm làm mới báo giá rồi thử lại'); }
  const gasLimit: bigint = await contract[fn].estimateGas(...args, { value });
  onProgress('Đang gửi lệnh...');
  const tx = await contract[fn](...args, { value, gasLimit: gasLimit * 120n / 100n });
  await tx.wait();
  return tx.hash;
}
