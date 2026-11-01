import { decryptPrivateKey } from '@shared/lib/encryption';
import { STORAGE_KEYS } from '@shared/storage/types';
import { btcAccount } from '../../../lib/bitcoin';

/** The wallet's native Bitcoin address (bc1q…) comes from the same private key as the
 * web wallet's, so it needs the password once. Only the public address is kept. */
const KEY = 'fun_wallet_btc_addresses';

export async function getSavedBtcAddress(evmAddress: string): Promise<string | null> {
  const saved = (await chrome.storage.local.get(KEY))[KEY] as Record<string, string> | undefined;
  return saved?.[evmAddress.toLowerCase()] ?? null;
}

export async function deriveBtcAddress(password: string): Promise<string> {
  const stored = await chrome.storage.local.get([STORAGE_KEYS.ENCRYPTED_KEYS, STORAGE_KEYS.ACTIVE_WALLET]);
  const vault = stored[STORAGE_KEYS.ENCRYPTED_KEYS];
  const active = stored[STORAGE_KEYS.ACTIVE_WALLET];
  if (typeof vault !== 'string' || typeof active !== 'string') throw Error('Không tìm thấy ví');
  const keyData = JSON.parse(vault).wallets?.[active];
  if (!keyData) throw Error('Không tìm thấy khóa ví');
  const key = await decryptPrivateKey(keyData, password).catch(() => { throw Error('Mật khẩu không đúng'); });
  const address = btcAccount(key).address;
  const saved = ((await chrome.storage.local.get(KEY))[KEY] as Record<string, string> | undefined) ?? {};
  await chrome.storage.local.set({ [KEY]: { ...saved, [active.toLowerCase()]: address } });
  return address;
}
