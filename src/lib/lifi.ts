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
): Promise<string> {
  const stepWithTx = step.transactionRequest
    ? step
    : await sdkGetStepTransaction(getClient(), step);
  const req = stepWithTx.transactionRequest;
  if (!req?.to || !req?.data) throw new Error('Step has no transactionRequest');

  const tx = await signer.sendTransaction({
    to: req.to,
    data: req.data,
    value: req.value ? BigInt(req.value) : undefined,
    gasLimit: req.gasLimit ? BigInt(req.gasLimit) : undefined,
    gasPrice: req.gasPrice ? BigInt(req.gasPrice) : undefined,
  });
  await tx.wait();
  return tx.hash;
}

export type { Route, LiFiStep, QuoteRequest, RoutesRequest };
