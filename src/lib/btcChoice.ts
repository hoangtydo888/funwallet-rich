import { supabase } from "@/integrations/supabase/client";
import { isValidBtcAddress } from "./bitcoin";

/** A BTC address the user picked to show instead of the one derived from their FUN key
 * (for example their MetaMask Bitcoin account). It is public: balance, receive and history
 * only. Kept on the account so phone and computer agree, with a local copy for first paint. */
export interface BtcChoice { address: string; label: string }
type Choices = Record<string, BtcChoice>;

const KEY = "fun_wallet_btc_choice_v1";
export const META_KEY = "fun_btc_wallets";

const clean = (value: unknown): Choices => {
  const out: Choices = {};
  if (value && typeof value === "object") {
    for (const [evm, c] of Object.entries(value as Record<string, BtcChoice>)) {
      if (c && isValidBtcAddress(c.address)) out[evm.toLowerCase()] = { address: c.address, label: String(c.label ?? "").slice(0, 40) };
    }
  }
  return out;
};
const readLocal = (): Choices => {
  try { return clean(JSON.parse(localStorage.getItem(KEY) ?? "{}")); } catch { return {}; }
};
const writeLocal = (choices: Choices) => {
  try { localStorage.setItem(KEY, JSON.stringify(choices)); } catch { /* storage unavailable */ }
};

export function getBtcChoice(evmAddress: string, accountChoices?: unknown): BtcChoice | null {
  const evm = evmAddress.toLowerCase();
  if (accountChoices !== undefined) {
    // The account's saved choice wins over this device's copy
    const fromAccount = clean(accountChoices);
    writeLocal(fromAccount);
    return fromAccount[evm] ?? null;
  }
  return readLocal()[evm] ?? null;
}

export async function saveBtcChoice(evmAddress: string, choice: BtcChoice | null, accountChoices?: unknown): Promise<void> {
  if (choice && !isValidBtcAddress(choice.address)) throw Error("Địa chỉ BTC không hợp lệ");
  const evm = evmAddress.toLowerCase();
  const next = { ...clean(accountChoices ?? readLocal()) };
  if (choice) next[evm] = { address: choice.address.trim(), label: choice.label.trim().slice(0, 40) };
  else delete next[evm];
  writeLocal(next);
  const { error } = await supabase.auth.updateUser({ data: { [META_KEY]: next } });
  if (error) throw Error("Đã lưu trên thiết bị này; chưa đồng bộ được lên tài khoản");
}
