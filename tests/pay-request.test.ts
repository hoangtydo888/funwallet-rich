import { describe, expect, test } from 'bun:test';
import { PAY_ASSETS, buildPayUri, parsePayRequest, usdToRaw } from '../src/lib/payRequest';

const shop = '0xec39f206B236E5f1ef194F6d91FA1d658db5B999';
const usdt = PAY_ASSETS.find(a => a.key === 'usdt')!;
const bnb = PAY_ASSETS.find(a => a.key === 'bnb')!;
const camly = PAY_ASSETS.find(a => a.key === 'camly')!;

describe('QR payment requests', () => {
  test('token request round-trips in EIP-681 form', () => {
    const uri = buildPayUri({ to: shop, asset: usdt, raw: 5n * 10n ** 18n });
    expect(uri).toBe(`ethereum:0x55d398326f99059fF775485246999027B3197955@56/transfer?address=${shop}&uint256=5000000000000000000`);
    const r = parsePayRequest(uri, usdt);
    expect(r.asset.key).toBe('usdt'); expect(r.to).toBe(shop); expect(r.raw).toBe(5n * 10n ** 18n);
  });
  test('BNB request and scientific notation', () => {
    const r = parsePayRequest(`ethereum:${shop}@56?value=2.5e15`, usdt);
    expect(r.asset.key).toBe('bnb'); expect(r.raw).toBe(2_500_000_000_000_000n);
    expect(parsePayRequest(buildPayUri({ to: shop, asset: bnb, raw: null }), usdt).raw).toBeNull();
  });
  test('bare address uses the fallback coin with no amount', () => {
    const r = parsePayRequest(shop.toLowerCase(), camly);
    expect(r.asset.key).toBe('camly'); expect(r.raw).toBeNull(); expect(r.to).toBe(shop);
  });
  test('refuses other chains, unknown tokens, other calls and old JSON codes', () => {
    expect(() => parsePayRequest(`ethereum:${shop}@1?value=1`, usdt)).toThrow('mạng khác');
    expect(() => parsePayRequest(`ethereum:0x1111111111111111111111111111111111111111@56/transfer?address=${shop}&uint256=1`, usdt)).toThrow('token lạ');
    expect(() => parsePayRequest(`ethereum:${usdt.token}@56/approve?address=${shop}&uint256=1`, usdt)).toThrow('không phải thanh toán');
    expect(() => parsePayRequest(JSON.stringify({ address: shop, token: 'USDT' }), usdt)).toThrow('kiểu cũ');
    expect(() => parsePayRequest('hello', usdt)).toThrow();
  });
  test('USD price converts to coins rounded up', () => {
    expect(usdToRaw(2, 1, 18)).toBe(2n * 10n ** 18n);
    expect(usdToRaw(1, 0.000003317, 3)).toBe(301477239n); // 301,477.2381… CAMLY rounded up to 301,477.239
  });
});
