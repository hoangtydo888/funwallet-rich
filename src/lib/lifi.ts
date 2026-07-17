import {
  createConfig,
  EVM,
  getQuote as sdkGetQuote,
  getRoutes as sdkGetRoutes,
  getStatus as sdkGetStatus,
  executeRoute as sdkExecuteRoute,
  getTokens as sdkGetTokens,
  ChainType,
  type QuoteRequest,
  type RoutesRequest,
  type Route,
  type LiFiStep,
} from '@lifi/sdk';
import { ethers } from 'ethers';

let configured = false;

/**
 * Initialize LiFi SDK with an ethers v6 signer.
 * Call before any getQuote / executeRoute request that requires a signer.
 */
export function initLifi(signer?: ethers.Signer) {
  if (configured && !signer) return;
  createConfig({
    integrator: 'fun-wallet',
    providers: signer
      ? [
          EVM({
            getWalletClient: async () => signer as any,
            switchChain: async () => signer as any,
          }),
        ]
      : [],
  });
  configured = true;
}

export const getLifiQuote = (req: QuoteRequest) => sdkGetQuote(req);
export const getLifiRoutes = (req: RoutesRequest) => sdkGetRoutes(req);
export const getLifiStatus = (opts: { txHash: string; fromChain: number; toChain: number; bridge?: string }) =>
  sdkGetStatus({
    txHash: opts.txHash,
    fromChain: opts.fromChain,
    toChain: opts.toChain,
    bridge: opts.bridge,
  });
export const executeLifiRoute = (route: Route, updateCallback: (r: Route) => void) =>
  sdkExecuteRoute(route, { updateRouteHook: updateCallback });
export const getLifiTokens = (chainIds?: number[]) =>
  sdkGetTokens({ chainTypes: [ChainType.EVM], chains: chainIds });

export type { Route, LiFiStep, QuoteRequest, RoutesRequest };
