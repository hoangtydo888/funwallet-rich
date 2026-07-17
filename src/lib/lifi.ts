/**
 * LiFi SDK v4 thin wrapper (read + minimal execute).
 * Full route execution with automatic multi-step + approval requires provider
 * plumbing; for MVP we expose quotes/routes/status/tokens and a minimal
 * single-step executor that submits the tx returned by getStepTransaction
 * using the user's ethers Signer.
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
} from '@lifi/sdk';
import { ethers } from 'ethers';

let initialized = false;

export function initLifi() {
  if (initialized) return;
  createClient({ integrator: 'fun-wallet' });
  initialized = true;
}

export const getLifiQuote = (req: QuoteRequest) => {
  initLifi();
  return sdkGetQuote(req);
};

export const getLifiRoutes = (req: RoutesRequest) => {
  initLifi();
  return sdkGetRoutes(req);
};

export const getLifiStatus = (opts: {
  txHash: string;
  fromChain: number;
  toChain: number;
  bridge?: string;
}) => {
  initLifi();
  return sdkGetStatus({
    txHash: opts.txHash,
    fromChain: opts.fromChain,
    toChain: opts.toChain,
    bridge: opts.bridge,
  });
};

export const getLifiTokens = (chainIds?: number[]) => {
  initLifi();
  return sdkGetTokens({ chains: chainIds });
};

export const getLifiChains = () => {
  initLifi();
  return sdkGetChains({});
};

/**
 * Execute a single LiFi step by submitting its transactionRequest via an ethers signer.
 * Returns the transaction hash on success. Multi-step routes (with approvals or bridges
 * that need multiple txs) must be iterated by the caller.
 */
export async function executeLifiStep(
  step: LiFiStep,
  signer: ethers.Signer,
): Promise<string> {
  initLifi();
  const stepWithTx = step.transactionRequest ? step : await sdkGetStepTransaction(step);
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
