import { validPairingUri } from './walletconnect';

// Receiving a session proposal is automatic; approving it always stays in the UI.
// A failed URI is not retried automatically, including React effect replays.
export function createPopupPairingGate() {
  const attempted = new Set<string>();
  return (uri: string, pair: (uri: string) => Promise<unknown>): Promise<boolean> => {
    if (!validPairingUri(uri) || attempted.has(uri)) return Promise.resolve(false);
    attempted.add(uri);
    return Promise.resolve().then(() => pair(uri)).then(() => true);
  };
}
