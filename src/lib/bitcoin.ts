import * as btc from '@scure/btc-signer';
import { hex } from '@scure/base';
import { formatUnits } from 'ethers';
import { exactTokenUnits } from './tokenAmounts';

/** Native Bitcoin (mainnet) for the web wallet. The BTC key is the wallet's own
 * secp256k1 private key, so every wallet (seed or private-key import) gets one
 * native SegWit address (bc1q…) without storing any new secret. */
export const BTC_DECIMALS = 8;
export const BTC_EXPLORER = 'https://mempool.space';
// 546 sats is the dust limit of the most expensive standard output (P2PKH).
export const BTC_DUST = 546n;
export const MAX_FEE_RATE = 500;
const NET = btc.NETWORK;
const ESPLORA = ['https://mempool.space/api', 'https://blockstream.info/api'];
const RBF_SEQUENCE = 0xfffffffd;

export interface BtcAccount { address: string; script: Uint8Array; priv: Uint8Array }
export interface BtcUtxo { txid: string; vout: number; value: number; confirmed: boolean }
export interface BtcBalance { confirmed: bigint; unconfirmed: bigint }
export interface BtcFeeRates { minimum: number; economy: number; normal: number; fast: number }
export interface SignedBtcTx { hex: string; txid: string; fee: bigint; vsize: number; amount: bigint }

export function btcAccount(privateKey: string): BtcAccount {
  if (!/^(0x)?[a-f0-9]{64}$/i.test(privateKey)) throw Error('Khóa riêng không hợp lệ');
  const priv = hex.decode(privateKey.replace(/^0x/i, '').toLowerCase());
  const address = btc.getAddress('wpkh', priv, NET);
  if (!address) throw Error('Không tạo được địa chỉ BTC');
  return { address, script: btcScript(address), priv };
}

/** Mainnet addresses only: legacy (1…), P2SH (3…), SegWit (bc1q…) and Taproot (bc1p…). */
export function isValidBtcAddress(address: string): boolean {
  if (typeof address !== 'string' || address.length < 26 || address.length > 90 || address.trim() !== address) return false;
  try { return ['pkh', 'sh', 'wpkh', 'wsh', 'tr'].includes(btc.Address(NET).decode(address).type); } catch { return false; }
}
export const btcScript = (address: string) => btc.OutScript.encode(btc.Address(NET).decode(address));
export const parseBtc = (value: string) => exactTokenUnits(value, BTC_DECIMALS);
export const formatBtc = (sats: bigint) => formatUnits(sats, BTC_DECIMALS);

async function esplora(path: string, init?: RequestInit): Promise<Response> {
  let last: unknown;
  for (const base of ESPLORA) {
    try {
      const res = await fetch(base + path, { ...init, signal: AbortSignal.timeout(15_000) });
      if (res.ok) return res;
      last = Error((await res.text()).slice(0, 200) || `HTTP ${res.status}`);
    } catch (e) { last = e; }
  }
  throw last instanceof Error ? last : Error('Không kết nối được mạng Bitcoin');
}
const addressPath = (address: string) => {
  if (!isValidBtcAddress(address)) throw Error('Địa chỉ BTC không hợp lệ');
  return `/address/${address}`;
};

export async function getBtcBalance(address: string): Promise<BtcBalance> {
  const d = await (await esplora(addressPath(address))).json();
  const sum = (s?: { funded_txo_sum?: number; spent_txo_sum?: number }) => BigInt(s?.funded_txo_sum ?? 0) - BigInt(s?.spent_txo_sum ?? 0);
  return { confirmed: sum(d.chain_stats), unconfirmed: sum(d.mempool_stats) };
}

export async function getBtcUtxos(address: string): Promise<BtcUtxo[]> {
  const list = await (await esplora(`${addressPath(address)}/utxo`)).json();
  if (!Array.isArray(list)) throw Error('Dữ liệu UTXO không hợp lệ');
  return list.map((u: { txid?: string; vout?: number; value?: number; status?: { confirmed?: boolean } }) => {
    if (!/^[0-9a-f]{64}$/.test(u?.txid) || !Number.isInteger(u?.vout) || !Number.isSafeInteger(u?.value) || u.value <= 0) throw Error('Dữ liệu UTXO không hợp lệ');
    return { txid: u.txid, vout: u.vout, value: u.value, confirmed: !!u.status?.confirmed };
  });
}

const rate = (v: unknown) => Math.min(MAX_FEE_RATE, Math.max(1, Math.ceil(Number(v) || 1)));
/** Whole sat/vB, never below 1: sub-1 rates are not relayed by every node and can strand a payment. */
export async function getBtcFeeRates(): Promise<BtcFeeRates> {
  try {
    const r = await (await fetch(`${ESPLORA[0]}/v1/fees/recommended`, { signal: AbortSignal.timeout(10_000) })).json();
    return { minimum: rate(r.minimumFee), economy: rate(r.economyFee), normal: rate(r.hourFee), fast: rate(r.fastestFee) };
  } catch {
    const e = await (await esplora('/fee-estimates')).json();
    return { minimum: 1, economy: rate(e['144']), normal: rate(e['6']), fast: rate(e['1']) };
  }
}

export async function broadcastBtcTx(rawHex: string): Promise<string> {
  if (!/^(?:[0-9a-f]{2})+$/.test(rawHex)) throw Error('Giao dịch BTC không hợp lệ');
  const txid = (await (await esplora('/tx', { method: 'POST', body: rawHex })).text()).trim();
  if (!/^[0-9a-f]{64}$/.test(txid)) throw Error('Mạng Bitcoin không nhận giao dịch');
  return txid;
}

const sameBytes = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((v, i) => v === b[i]);
const isOpReturn = (script: Uint8Array) => script[0] === 0x6a;

function finalize(tx: btc.Transaction, acc: BtcAccount, inputTotal: bigint, maxRate: number) {
  if (tx.sign(acc.priv) !== tx.inputsLength) throw Error('Không ký được toàn bộ đầu vào');
  tx.finalize();
  let out = 0n;
  for (let i = 0; i < tx.outputsLength; i++) out += tx.getOutput(i).amount!;
  const fee = inputTotal - out;
  if (fee <= 0n) throw Error('Phí mạng không hợp lệ');
  if (Number(fee) / tx.vsize > maxRate) throw Error('Phí mạng cao bất thường; đã dừng giao dịch');
  return { hex: tx.hex, txid: tx.id, fee, vsize: tx.vsize };
}

/** Build and sign a payment from this wallet. Only confirmed coins are spent, the
 * change always returns to the same address and RBF stays on so a stuck low-fee
 * payment can be sped up later. `amount: 'max'` sends everything minus the fee. */
export function buildBtcSend(opts: { privateKey: string; to: string; amount: bigint | 'max'; feeRate: number; utxos: BtcUtxo[] }): SignedBtcTx {
  const acc = btcAccount(opts.privateKey);
  if (!isValidBtcAddress(opts.to)) throw Error('Địa chỉ BTC nhận không hợp lệ');
  if (!Number.isInteger(opts.feeRate) || opts.feeRate < 1 || opts.feeRate > MAX_FEE_RATE) throw Error('Mức phí không hợp lệ');
  const max = opts.amount === 'max';
  if (!max && (typeof opts.amount !== 'bigint' || opts.amount < BTC_DUST)) throw Error(`Số BTC gửi tối thiểu là ${formatBtc(BTC_DUST)} BTC`);
  const coins = opts.utxos.filter(u => u.confirmed);
  if (!coins.length) throw Error('Chưa có BTC đã xác nhận để gửi');
  const inputs = coins.map(u => ({ txid: u.txid, index: u.vout, sequence: RBF_SEQUENCE, witnessUtxo: { script: acc.script, amount: BigInt(u.value) } }));
  const common = { feePerByte: BigInt(opts.feeRate), network: NET, createTx: true, bip69: true };
  const sel = max
    ? btc.selectUTXO(inputs, [], 'all', { ...common, changeAddress: opts.to })
    : btc.selectUTXO(inputs, [{ address: opts.to, amount: opts.amount as bigint }], 'default', { ...common, changeAddress: acc.address });
  if (!sel?.tx) throw Error('Số dư không đủ để trả số tiền và phí mạng');
  const tx = sel.tx;
  let inputTotal = 0n, paid = 0n;
  for (let i = 0; i < tx.inputsLength; i++) {
    const input = tx.getInput(i);
    if (!input.witnessUtxo || !sameBytes(input.witnessUtxo.script, acc.script)) throw Error('Đầu vào không thuộc ví này');
    inputTotal += input.witnessUtxo.amount;
  }
  const toScript = btcScript(opts.to);
  for (let i = 0; i < tx.outputsLength; i++) {
    const o = tx.getOutput(i);
    if (sameBytes(o.script!, toScript)) paid += o.amount!;
    else if (!sameBytes(o.script!, acc.script)) throw Error('Giao dịch có đầu ra lạ; đã dừng');
  }
  const signed = finalize(tx, acc, inputTotal, opts.feeRate * 2 + 1);
  if (max ? paid !== inputTotal - signed.fee : paid !== opts.amount) throw Error('Số BTC gửi không khớp');
  if (!max && signed.fee > paid) throw Error('Phí mạng lớn hơn số BTC gửi');
  return { ...signed, amount: paid };
}

/** Check a PSBT built by a swap provider before signing: every input must be this
 * wallet's coin, BTC may leave only as `spend` sats (deposit `to` plus disclosed
 * provider fees), the rest returns as change, and the network fee stays sane. */
export function signProviderPsbt(psbtHex: string, privateKey: string, expected: { to: string; spend: bigint; maxFeeRate: number }): SignedBtcTx {
  const acc = btcAccount(privateKey);
  if (!/^(?:[0-9a-f]{2})+$/i.test(psbtHex) || !isValidBtcAddress(expected.to) || expected.spend < BTC_DUST) throw Error('Giao dịch BTC của nhà cung cấp không hợp lệ');
  const tx = btc.Transaction.fromPSBT(hex.decode(psbtHex.toLowerCase()), { allowUnknownOutputs: true });
  let inputTotal = 0n, external = 0n, toDeposit = 0n;
  for (let i = 0; i < tx.inputsLength; i++) {
    const input = tx.getInput(i);
    if (!input.witnessUtxo || !sameBytes(input.witnessUtxo.script, acc.script)) throw Error('PSBT dùng BTC không thuộc ví này');
    if (input.sighashType !== undefined && input.sighashType !== btc.SigHash.ALL) throw Error('PSBT yêu cầu kiểu ký không an toàn');
    inputTotal += input.witnessUtxo.amount;
  }
  const toScript = btcScript(expected.to);
  for (let i = 0; i < tx.outputsLength; i++) {
    const o = tx.getOutput(i);
    if (sameBytes(o.script!, acc.script)) continue;
    if (isOpReturn(o.script!)) { if (o.amount !== 0n) throw Error('PSBT đốt BTC qua OP_RETURN'); continue; }
    if (btc.OutScript.decode(o.script!).type === 'unknown') throw Error('PSBT có đầu ra không chuẩn');
    external += o.amount!;
    if (sameBytes(o.script!, toScript)) toDeposit += o.amount!;
  }
  if (toDeposit <= 0n) throw Error('PSBT không gửi tới địa chỉ nạp đã báo giá');
  if (external !== expected.spend) throw Error('PSBT chuyển số BTC khác với báo giá; đã dừng');
  return { ...finalize(tx, acc, inputTotal, expected.maxFeeRate), amount: external };
}

/** Public address cache so the BTC address and balance show while the vault is locked. */
const CACHE_KEY = 'fun_wallet_btc_addresses';
export function cachedBtcAddress(evmAddress: string): string | null {
  try { const v = JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}')[evmAddress.toLowerCase()]; return isValidBtcAddress(v) ? v : null; } catch { return null; }
}
export function rememberBtcAddress(evmAddress: string, privateKey: string): string {
  const address = btcAccount(privateKey).address;
  try {
    const map = JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}');
    if (map[evmAddress.toLowerCase()] !== address) localStorage.setItem(CACHE_KEY, JSON.stringify({ ...map, [evmAddress.toLowerCase()]: address }));
  } catch { /* cache is optional */ }
  return address;
}
