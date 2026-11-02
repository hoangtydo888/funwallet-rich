import { afterEach, expect, test } from "bun:test";
import { fetchTokenPrices } from "../src/shared/lib/priceTracker";

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

const respond = (handler: (url: string) => unknown) => {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const body = handler(String(input));
    return body === undefined ? new Response("rate limited", { status: 429 }) : Response.json(body);
  }) as typeof fetch;
};

test("CAMLY falls back to LI.FI when DexScreener refuses", async () => {
  respond(url => (url.includes("li.quest") ? { priceUSD: "0.0000033" } : url.includes("binance") ? [] : undefined));
  const [camly] = await fetchTokenPrices(["CAMLY"]);
  expect(camly.symbol).toBe("CAMLY");
  expect(camly.price).toBeCloseTo(0.0000033, 10);
});

test("recent prices are shared instead of fetched again", async () => {
  let calls = 0;
  respond(() => { calls++; return undefined; });
  const [camly] = await fetchTokenPrices(["CAMLY"]);
  expect(camly.price).toBeCloseTo(0.0000033, 10);
  expect(calls).toBe(0);
});
