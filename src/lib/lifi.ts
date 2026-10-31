/**
 * LiFi SDK v4 thin wrapper. v4 requires an SDKClient as the first arg of every action;
 * we cache one shared client for read calls and expose typed helpers.
 */
import {
  createClient,
  getQuote as sdkGetQuote,
  getRoutes as sdkGetRoutes,
  getStatus as sdkGetStatus,
  getStepTransaction as sdkGetStepTransaction,
  getTokens as sdkGetTokens,
  getChains as sdkGetChains,
  type QuoteRequest,
  type RoutesRequest,
  type Route,
  type LiFiStep,
  type SDKClient,
} from '@lifi/sdk';
import { ethers, Contract } from 'ethers';
import {validateLifiIntent,validateLifiRequest,type LifiIntent} from './lifiValidation';
import { ERC20_ABI } from './wallet';

/** LI.FI's contract (same address on every supported EVM chain). Token approvals go only here. */
export const LIFI_DIAMOND = '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE';
const NATIVE = '0x0000000000000000000000000000000000000000';

let client: SDKClient | null = null;

function getClient(): SDKClient {
  if (!client) {
    client = createClient({ integrator: 'fun-wallet' });
  }
  return client;
}

export const getLifiQuote = (req: QuoteRequest) =>
  sdkGetQuote(getClient(), req as any);

export const getLifiRoutes = (req: RoutesRequest) =>
  sdkGetRoutes(getClient(), req);

export const getLifiStatus = (opts: {
  txHash: string;
  fromChain: number;
  toChain: number;
  bridge?: string;
}) =>
  sdkGetStatus(getClient(), {
    txHash: opts.txHash,
    fromChain: opts.fromChain,
    toChain: opts.toChain,
    bridge: opts.bridge,
  });

export const getLifiStepTransaction = (step: LiFiStep) => sdkGetStepTransaction(getClient(), step);

export const getLifiTokens = (chainIds?: number[]) =>
  sdkGetTokens(getClient(), { chains: chainIds as any });

export const getLifiChains = () => sdkGetChains(getClient());

/**
 * Execute a single LiFi step by submitting its transactionRequest via an ethers signer.
 * Returns tx hash. Multi-step routes (approvals + swap) must be iterated by caller.
 */
export async function executeLifiStep(
  step: LiFiStep,
  signer: ethers.Signer,
  intent: LifiIntent,
): Promise<string> {
  validateLifiIntent(step,intent);
  if(!signer.provider || (await signer.provider.getNetwork()).chainId!==BigInt(intent.fromChainId) || (await signer.getAddress()).toLowerCase()!==intent.account.toLowerCase())throw Error('Ví hoặc mạng đã thay đổi');
  // Always refresh the transaction payload; never replay a stale API payload.
  const stepWithTx=await sdkGetStepTransaction(getClient(),step);
  validateLifiIntent(stepWithTx,intent);
  const request=validateLifiRequest(stepWithTx.transactionRequest,intent);
  // Read-only simulation before signing. RPC execution success is not a fraud guarantee.
  await signer.provider.call(request);
  const gasLimit=await signer.provider.estimateGas(request);
  validateLifiIntent(stepWithTx,intent);
  const tx=await signer.sendTransaction({...request,gasLimit:gasLimit*120n/100n});
  await tx.wait();
  return tx.hash;
}

/** Approve exactly `amount` of an ERC20 to the LI.FI contract, and only when the
 * quote names that contract as the spender. Native coins need no approval. */
export async function approveLifiExact(step: LiFiStep, signer: ethers.Signer, token: string, owner: string, amount: bigint, symbol: string, onProgress: (msg: string) => void = () => {}) {
  if (token.toLowerCase() === NATIVE) return;
  const spender = step.estimate?.approvalAddress;
  if (typeof spender !== 'string' || spender.toLowerCase() !== LIFI_DIAMOND.toLowerCase()) throw Error('Địa chỉ cấp quyền token không phải LI.FI; đã dừng');
  const contract = new Contract(token, ERC20_ABI, signer);
  const allowance: bigint = await contract.allowance(owner, LIFI_DIAMOND);
  if (allowance >= amount) return;
  // USDT on Ethereum refuses to change a non-zero allowance directly.
  if (allowance > 0n) { onProgress('Đang đặt lại quyền token...'); await (await contract.approve(LIFI_DIAMOND, 0n)).wait(); }
  onProgress(`Đang cấp quyền đúng số ${symbol} cần đổi...`);
  await (await contract.approve(LIFI_DIAMOND, amount)).wait();
}

/** Approval (when needed) followed by the swap itself. */
export async function executeLifiSwap(step: LiFiStep, signer: ethers.Signer, intent: LifiIntent, symbol: string, onProgress: (msg: string) => void = () => {}): Promise<string> {
  validateLifiIntent(step, intent);
  await approveLifiExact(step, signer, intent.fromToken, intent.account, BigInt(intent.amount), symbol, onProgress);
  onProgress('Đang gửi giao dịch đổi...');
  return executeLifiStep(step, signer, intent);
}

export type { Route, LiFiStep, QuoteRequest, RoutesRequest };
