import { createSessionSigner } from './guardedSigner';
import { FUN_MONEY, runFunMoneyWith, withFunRpc, parseFunAmount, type FunAction } from '../shared/lib/funMoney';

export { FUN_MONEY, FUN_MIN_GAS, formatFun, getFunMoneyState, type FunAction, type FunMoneyState } from '../shared/lib/funMoney';

export const parseFun = (amount: string): bigint => {
  const raw = parseFunAmount(amount);
  if (raw === null) throw Error('Số FUN không hợp lệ');
  return raw;
};

/** Web wallet: signs with the unlocked session key through the guarded signer. */
export const runFunMoney = (key: string, action: FunAction, amount: bigint, to?: string): Promise<string> =>
  withFunRpc(p => runFunMoneyWith(createSessionSigner(key, p, FUN_MONEY.chainId), action, amount, to));
