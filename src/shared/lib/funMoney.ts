import { Contract, ethers } from 'ethers';

/** FUN Money lives on BNB Smart Chain Testnet (chain 97) for now. Minted FUN arrives
 * locked; the holder activates it, then claims it into the wallet, where it can be sent.
 * Shared by the web wallet and the browser extension. */
export const FUN_MONEY = {
  address: '0x39A1b047D5d143f8874888cfa1d30Fb2AE6F0CD6',
  chainId: 97,
  decimals: 18,
  symbol: 'FUN',
  explorer: 'https://testnet.bscscan.com',
  faucet: 'https://www.bnbchain.org/en/testnet-faucet',
};
export const FUN_MIN_GAS = 300_000_000_000_000n; // 0.0003 tBNB

const RPCS = ['https://bsc-testnet-rpc.publicnode.com', 'https://data-seed-prebsc-1-s1.binance.org:8545/'];
const ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function alloc(address) view returns (uint256 locked, uint256 activated)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function activate(uint256 amount)',
  'function claim(uint256 amount)',
];

let provider: ethers.JsonRpcProvider | null = null;
let rpcIndex = 0;
export const funTestnetProvider = () => (provider ??= new ethers.JsonRpcProvider(RPCS[rpcIndex], FUN_MONEY.chainId, { staticNetwork: true }));
// Move to the next public RPC when one fails
export async function withFunRpc<T>(fn: (p: ethers.JsonRpcProvider) => Promise<T>): Promise<T> {
  try { return await fn(funTestnetProvider()); } catch (e) {
    rpcIndex = (rpcIndex + 1) % RPCS.length;
    provider = null;
    throw e;
  }
}

export interface FunMoneyState { balance: bigint; locked: bigint; activated: bigint; gas: bigint }

export const getFunMoneyState = (address: string): Promise<FunMoneyState> => withFunRpc(async p => {
  const c = new Contract(FUN_MONEY.address, ABI, p);
  const [balance, [locked, activated], gas] = await Promise.all([c.balanceOf(address), c.alloc(address), p.getBalance(address)]);
  return { balance, locked, activated, gas };
});

export const formatFun = (raw: bigint) => Number(ethers.formatUnits(raw, FUN_MONEY.decimals)).toLocaleString('en-US', { maximumFractionDigits: 4 });

/** Exact FUN amount from user text; null when empty, zero or malformed. */
export function parseFunAmount(text: string): bigint | null {
  const v = text.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,18})?$/.test(v)) return null;
  const raw = ethers.parseUnits(v, FUN_MONEY.decimals);
  return raw > 0n ? raw : null;
}

export type FunAction = 'send' | 'activate' | 'claim';

/** Sends, activates or claims FUN with a testnet signer and waits for the receipt. */
export async function runFunMoneyWith(signer: ethers.Signer, action: FunAction, amount: bigint, to?: string): Promise<string> {
  if (amount <= 0n) throw Error('Nhập số FUN lớn hơn 0');
  const c = new Contract(FUN_MONEY.address, ABI, signer);
  let tx: ethers.TransactionResponse;
  if (action === 'send') {
    if (!to || !ethers.isAddress(to)) throw Error('Địa chỉ người nhận không hợp lệ');
    if (to.toLowerCase() === (await signer.getAddress()).toLowerCase()) throw Error('Không thể gửi cho chính mình');
    tx = await c.transfer(ethers.getAddress(to), amount);
  } else {
    tx = await c[action](amount);
  }
  const receipt = await tx.wait();
  if (receipt?.status !== 1) throw Error('Giao dịch không thành công trên mạng testnet');
  return tx.hash;
}
