import { Contract, ethers } from 'ethers';
import { createSessionSigner } from './guardedSigner';
import { exactTokenUnits } from './tokenAmounts';

/** FUN Money lives on BNB Smart Chain Testnet (chain 97) for now. Minted FUN arrives
 * locked; the holder activates it, then claims it into the wallet, where it can be sent. */
export const FUN_MONEY = {
  address: '0x39A1b047D5d143f8874888cfa1d30Fb2AE6F0CD6',
  chainId: 97,
  decimals: 18,
  symbol: 'FUN',
  explorer: 'https://testnet.bscscan.com',
  faucet: 'https://www.bnbchain.org/en/testnet-faucet',
};

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
const testnet = () => (provider ??= new ethers.JsonRpcProvider(RPCS[rpcIndex], FUN_MONEY.chainId, { staticNetwork: true }));
// Move to the next public RPC when one fails
async function withRpc<T>(fn: (p: ethers.JsonRpcProvider) => Promise<T>): Promise<T> {
  try { return await fn(testnet()); } catch (e) {
    rpcIndex = (rpcIndex + 1) % RPCS.length;
    provider = null;
    throw e;
  }
}

export interface FunMoneyState { balance: bigint; locked: bigint; activated: bigint; gas: bigint }

export const getFunMoneyState = (address: string): Promise<FunMoneyState> => withRpc(async p => {
  const c = new Contract(FUN_MONEY.address, ABI, p);
  const [balance, [locked, activated], gas] = await Promise.all([c.balanceOf(address), c.alloc(address), p.getBalance(address)]);
  return { balance, locked, activated, gas };
});

export const formatFun = (raw: bigint) => Number(ethers.formatUnits(raw, FUN_MONEY.decimals)).toLocaleString('en-US', { maximumFractionDigits: 4 });
export const parseFun = (amount: string) => exactTokenUnits(amount, FUN_MONEY.decimals);

export type FunAction = 'send' | 'activate' | 'claim';

/** Sends, activates or claims FUN on testnet and waits for the receipt. */
export async function runFunMoney(key: string, action: FunAction, amount: bigint, to?: string): Promise<string> {
  if (amount <= 0n) throw Error('Nhập số FUN lớn hơn 0');
  return withRpc(async p => {
    const signer = createSessionSigner(key, p, FUN_MONEY.chainId);
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
  });
}
