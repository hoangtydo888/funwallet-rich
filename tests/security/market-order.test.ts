import { describe, expect, it } from 'bun:test';
import { isAddress } from 'ethers';
import { approveLifiExact, LIFI_DIAMOND, type LiFiStep } from '../../src/lib/lifi';
import { TRADE_ASSETS, QUOTE_ASSET, assetByKey, checkOrder, NATIVE, type MarketOrder } from '../../src/lib/marketOrder';

const evm = '0x' + '1'.repeat(40);
const order = (o: Partial<MarketOrder>): MarketOrder => ({ from: QUOTE_ASSET, to: assetByKey('eth')!, amount: '1000', slippage: 0.5, evmAddress: evm, btcAddress: null, quotedAt: Date.now(), ...o });
const noSigner = new Proxy({}, { get: () => { throw Error('signer must not be used'); } }) as never;

describe('market orders', () => {
  it('lists unique assets with valid BSC token addresses', () => {
    expect(new Set(TRADE_ASSETS.map(a => a.key)).size).toBe(TRADE_ASSETS.length);
    for (const a of TRADE_ASSETS.filter(a => a.key !== 'btc')) { expect(a.chainId).toBe(56); expect(isAddress(a.token)).toBe(true); }
  });
  it('rejects same-coin, malformed and BTC orders without a Bitcoin address', () => {
    expect(() => checkOrder(order({ to: QUOTE_ASSET }))).toThrow('khác nhau');
    expect(() => checkOrder(order({ amount: '0' }))).toThrow();
    expect(() => checkOrder(order({ amount: '1.5' }))).toThrow();
    expect(() => checkOrder(order({ to: assetByKey('btc')! }))).toThrow('Bitcoin');
    expect(() => checkOrder(order({}))).not.toThrow();
  });
  it('never approves a spender other than the LI.FI contract', async () => {
    const step = { estimate: { approvalAddress: '0x' + '2'.repeat(40) } } as unknown as LiFiStep;
    await expect(approveLifiExact(step, noSigner, QUOTE_ASSET.token, evm, 1n, 'USDT')).rejects.toThrow('không phải LI.FI');
    const missing = { estimate: {} } as unknown as LiFiStep;
    await expect(approveLifiExact(missing, noSigner, QUOTE_ASSET.token, evm, 1n, 'USDT')).rejects.toThrow('không phải LI.FI');
  });
  it('skips approval for native coins', async () => {
    const step = { estimate: { approvalAddress: LIFI_DIAMOND } } as unknown as LiFiStep;
    await expect(approveLifiExact(step, noSigner, NATIVE, evm, 1n, 'BNB')).resolves.toBeUndefined();
  });
});
