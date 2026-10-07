import { ethers } from 'ethers';

export const REQUEST_TTL = 5 * 60_000;
export const PUBLIC_METHODS = new Set([
  'eth_accounts', 'eth_requestAccounts', 'eth_chainId',
  'eth_sendTransaction', 'personal_sign', 'eth_signTypedData_v4',
  'wallet_switchEthereumChain',
]);

export class RpcError extends Error {
  constructor(public code: number, message: string) { super(message); }
}

export interface RpcTransaction {
  from: string;
  to: string;
  value: string;
  data: string;
  gas?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce?: string;
}

export interface ApprovalRequest {
  id: string;
  clientId: string;
  method: string;
  params: unknown[];
  origin: string;
  tabId: number;
  frameId: number;
  documentId?: string;
  account: string;
  chainId: number;
  timestamp: number;
  windowId?: number;
  status?: 'processing';
  invalidated?: boolean;
  submittedHash?: string;
}

export interface TransactionReview {
  id: string;
  expiresAt: number;
  kind: 'native' | 'transfer' | 'approve' | 'contract';
  recipient: string;
  contract?: string;
  amount: string;
  symbol: string;
  nativeAmount: string;
  unlimited: boolean;
  fee: string;
}

export function quantity(value: unknown, field: string): string {
  if (typeof value !== 'string' || !/^0x(?:0|[1-9a-f][0-9a-f]*)$/i.test(value)) {
    throw new RpcError(-32602, `${field} phải là số nguyên hex theo Ethereum RPC`);
  }
  if (BigInt(value) > ethers.MaxUint256) throw new RpcError(-32602, `${field} vượt giới hạn`);
  return value.toLowerCase();
}

export function normalizeTransaction(input: unknown, account: string, chainId: number): RpcTransaction {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new RpcError(-32602, 'Giao dịch không hợp lệ');
  const tx = input as Record<string, unknown>;
  const allowed = new Set(['from', 'to', 'value', 'data', 'gas', 'gasPrice', 'maxFeePerGas', 'maxPriorityFeePerGas', 'nonce', 'chainId']);
  if (Object.keys(tx).some(key => !allowed.has(key))) throw new RpcError(-32602, 'Giao dịch có trường chưa được hỗ trợ');
  if (typeof tx.from !== 'string' || !ethers.isAddress(tx.from) || tx.from.toLowerCase() !== account.toLowerCase()) {
    throw new RpcError(4100, 'Tài khoản gửi chưa được cấp quyền');
  }
  if (typeof tx.to !== 'string' || !ethers.isAddress(tx.to)) throw new RpcError(-32602, 'Địa chỉ nhận không hợp lệ');
  if (tx.chainId !== undefined && BigInt(quantity(tx.chainId, 'chainId')) !== BigInt(chainId)) throw new RpcError(4901, 'Sai mạng giao dịch');
  const data = tx.data ?? '0x';
  if (typeof data !== 'string' || !/^0x(?:[0-9a-f]{2})*$/i.test(data) || data.length > 262146) throw new RpcError(-32602, 'Dữ liệu giao dịch không hợp lệ');
  const result: RpcTransaction = { from: ethers.getAddress(tx.from), to: ethers.getAddress(tx.to), value: quantity(tx.value ?? '0x0', 'value'), data };
  for (const field of ['gas', 'gasPrice', 'maxFeePerGas', 'maxPriorityFeePerGas', 'nonce'] as const) {
    if (tx[field] !== undefined) result[field] = quantity(tx[field], field);
  }
  if (result.gasPrice && (result.maxFeePerGas || result.maxPriorityFeePerGas)) throw new RpcError(-32602, 'Không kết hợp hai loại phí gas');
  if (result.maxPriorityFeePerGas && (!result.maxFeePerGas || BigInt(result.maxPriorityFeePerGas) > BigInt(result.maxFeePerGas))) throw new RpcError(-32602, 'Phí ưu tiên không hợp lệ');
  if (result.nonce && BigInt(result.nonce) > BigInt(Number.MAX_SAFE_INTEGER)) throw new RpcError(-32602, 'Nonce vượt giới hạn');
  return result;
}

export function toEthersTransaction(tx: RpcTransaction): ethers.TransactionRequest {
  return {
    from: tx.from, to: tx.to, value: BigInt(tx.value), data: tx.data,
    ...(tx.gas ? { gasLimit: BigInt(tx.gas) } : {}),
    ...(tx.gasPrice ? { gasPrice: BigInt(tx.gasPrice) } : {}),
    ...(tx.maxFeePerGas ? { maxFeePerGas: BigInt(tx.maxFeePerGas) } : {}),
    ...(tx.maxPriorityFeePerGas ? { maxPriorityFeePerGas: BigInt(tx.maxPriorityFeePerGas) } : {}),
    ...(tx.nonce ? { nonce: Number(BigInt(tx.nonce)) } : {}),
  };
}

const tokenInterface = new ethers.Interface([
  'function transfer(address to,uint256 amount)',
  'function approve(address spender,uint256 amount)',
]);

// Decode only canonical ERC-20 calldata; unknown calls stay explicit contract calls.
export function decodeTokenCall(data: string): { kind: 'transfer' | 'approve'; recipient: string; rawAmount: bigint } | null {
  try {
    const parsed = tokenInterface.parseTransaction({ data });
    if (!parsed || tokenInterface.encodeFunctionData(parsed.name, parsed.args).toLowerCase() !== data.toLowerCase()) return null;
    return { kind: parsed.name as 'transfer' | 'approve', recipient: parsed.args[0], rawAmount: parsed.args[1] };
  } catch { return null; }
}

// Preserve all token digits, including values larger than JavaScript's safe integer.
export function displayAmount(value: string): string {
  const [whole, fraction] = value.split('.');
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (fraction && /[1-9]/.test(fraction) ? `,${fraction.replace(/0+$/, '')}` : '');
}

export function trustedPopup(sender: chrome.runtime.MessageSender, extensionId: string, popupUrl: string): boolean {
  return sender.id === extensionId && !!sender.url && sender.url.split(/[?#]/)[0] === popupUrl;
}

export function pageOrigin(sender: chrome.runtime.MessageSender, extensionId: string): string {
  if (sender.id !== extensionId || sender.tab?.id === undefined || sender.frameId !== 0 || !sender.url) throw new RpcError(4100, 'Nguồn yêu cầu không hợp lệ');
  const url = new URL(sender.url);
  if (!['https:', 'http:'].includes(url.protocol)) throw new RpcError(4100, 'Nguồn yêu cầu không hợp lệ');
  return url.origin;
}
