import { describe, expect, test } from "bun:test";
import { Wallet } from "ethers";
import { executePancake, PANCAKE_DIRECT } from "@/lib/pancakeDirect";
import { bscTradeToken, BTCB, WBNB } from "@/lib/marketTrades";
import { isFeeFreeBuy, assetByKey, QUOTE_ASSET } from "@/lib/marketOrder";
import type { LiFiStep } from "@/lib/lifi";

const USDT = QUOTE_ASSET.token, CAMLY = assetByKey("camly")!.token;
const signer = Wallet.createRandom();
const order = { fromToken: USDT, toToken: CAMLY, amount: 10n ** 18n, slippage: 0.5, account: signer.address, fromDecimals: 18, toDecimals: 3, fromSymbol: "USDT", toSymbol: "CAMLY" };
const step = (route: unknown, fromAmount = "1000000000000000000", toAmountMin = "1000") =>
  ({ tool: PANCAKE_DIRECT, estimate: { fromAmount, toAmountMin }, pancakeRoute: route } as unknown as LiFiStep);

describe("PancakeSwap direct buys", () => {
  test("only USDT buys of BSC coins skip the service fee", () => {
    expect(isFeeFreeBuy({ from: QUOTE_ASSET, to: assetByKey("camly")! })).toBe(true);
    expect(isFeeFreeBuy({ from: assetByKey("camly")!, to: QUOTE_ASSET })).toBe(false);
    expect(isFeeFreeBuy({ from: QUOTE_ASSET, to: assetByKey("btc")! })).toBe(false);
  });
  test("refuses a route that does not match the order", async () => {
    await expect(executePancake(step({ kind: "v2", path: [USDT, WBNB] }), order, signer)).rejects.toThrow("không khớp");
    await expect(executePancake(step({ kind: "v2", path: [USDT, CAMLY] }, "5"), order, signer)).rejects.toThrow("không khớp");
    await expect(executePancake(step({ kind: "v2", path: [USDT, CAMLY] }, undefined, "0"), order, signer)).rejects.toThrow("không khớp");
    await expect(executePancake(step({ kind: "v3", path: [USDT, CAMLY], fee: 123 }), order, signer)).rejects.toThrow("không khớp");
    await expect(executePancake(step(undefined), order, signer)).rejects.toThrow("không khớp");
  });
  test("refuses another wallet", async () => {
    await expect(executePancake(step({ kind: "v2", path: [USDT, CAMLY] }), { ...order, account: Wallet.createRandom().address }, signer)).rejects.toThrow("Ví đã thay đổi");
  });
});

describe("trade history token", () => {
  test("maps coins to their BSC market token", () => {
    expect(bscTradeToken(assetByKey("btc")!)).toBe(BTCB);
    expect(bscTradeToken(assetByKey("bnb")!)).toBe(WBNB);
    expect(bscTradeToken(assetByKey("camly")!)).toBe(CAMLY);
    expect(bscTradeToken(QUOTE_ASSET)).toBeNull();
  });
});
