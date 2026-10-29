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
import { ethers } from 'ethers';
import {validateLifiIntent,validateLifiRequest,type LifiIntent} from './lifiValidation';

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

export type { Route, LiFiStep, QuoteRequest, RoutesRequest };
