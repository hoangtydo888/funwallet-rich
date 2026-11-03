// Encrypted recovery phrases kept on this device, so Settings can show
// "Xem cụm từ ghi nhớ" after the user re-enters the wallet password.
// Only wallets created or imported by phrase on this device have one.
import { encryptRecoveryPhrase, decryptRecoveryPhrase, type EncryptedKeyData } from "@/lib/keyEncryption";

const STORAGE_KEY = "fun_wallet_recovery_v1";

function readAll(): Record<string, EncryptedKeyData> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function hasRecoveryPhrase(address: string): boolean {
  return !!readAll()[address.toLowerCase()];
}

export async function storeRecoveryPhrase(address: string, phrase: string, password: string): Promise<void> {
  const data = await encryptRecoveryPhrase(phrase, password);
  if (data.address !== address.toLowerCase()) throw Error("Recovery phrase không khớp địa chỉ");
  const all = readAll();
  all[data.address] = data;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export async function revealRecoveryPhrase(address: string, password: string): Promise<string | null> {
  const data = readAll()[address.toLowerCase()];
  return data ? decryptRecoveryPhrase(data, password, address) : null;
}
