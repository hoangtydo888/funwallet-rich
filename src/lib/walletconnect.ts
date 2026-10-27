import { Core } from '@walletconnect/core';
import { WalletKit, type WalletKitTypes } from '@reown/walletkit';

// Public relay identifier for Cha's existing Reown project (not a secret).
export const WALLETCONNECT_PROJECT_ID = '438c4373fc7f4c3b5561f0d2d2b2aa0e';
export { PROFILE_ORIGIN, isProfilePeer } from './profileOrigins';
export const WC_METHODS = ['personal_sign', 'eth_sendTransaction', 'wallet_switchEthereumChain'];
export type Proposal = {id:number;params:WalletKitTypes.SessionProposal['params'];verifyContext?:WalletKitTypes.SessionProposal['verifyContext']};
export type Request = WalletKitTypes.SessionRequest;
let instance: Promise<Awaited<ReturnType<typeof WalletKit.init>>> | undefined;
export function getWalletKit() {
  return instance ??= WalletKit.init({
    core: new Core({ projectId: WALLETCONNECT_PROJECT_ID, customStoragePrefix: 'fun-wallet-web-v1' }),
    metadata: { name: 'FUN Wallet', description: 'FUN Ecosystem Wallet', url: 'https://wallet.fun.rich', icons: ['https://wallet.fun.rich/favicon.ico'] },
  }).catch(error => { instance = undefined; throw error; });
}
export function validPairingUri(uri: string): boolean {
  if (uri.length > 4096) return false;
  const match = /^wc:([a-f0-9]{64})@2\?(.+)$/i.exec(uri);
  if (!match) return false;
  const params = new URLSearchParams(match[2]);
  return params.get('relay-protocol') === 'irn' && /^[a-f0-9]{64}$/i.test(params.get('symKey') ?? '');
}

export const rejected = { code: 5000, message: 'User rejected request' };
