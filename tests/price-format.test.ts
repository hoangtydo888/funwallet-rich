import { describe, expect, test } from "bun:test";
import { formatBalance } from "@/lib/wallet";
import { formatPrice, formatUsdValue } from "@/lib/priceTracker";

describe("Binance-style numbers", () => {
  test("balances use thousands separators and trim decimals", () => {
    expect(formatBalance("148162888.0000")).toBe("148,162,888");
    expect(formatBalance("1234.56789")).toBe("1,234.57");
    expect(formatBalance("1.7682")).toBe("1.7682");
    expect(formatBalance("0.0161")).toBe("0.0161");
    expect(formatBalance("0.00005")).toBe("0.00005");
    expect(formatBalance("0")).toBe("0");
  });
  test("prices keep four significant digits below $1", () => {
    expect(formatPrice(77204.69)).toBe("$77,204.69");
    expect(formatPrice(703.01)).toBe("$703.01");
    expect(formatPrice(0.0000033284)).toBe("$0.000003328");
    expect(formatPrice(0.65123)).toBe("$0.6512");
  });
  test("holding values have two decimals", () => {
    expect(formatUsdValue(493.0861)).toBe("$493.09");
    expect(formatUsdValue(0.004)).toBe("<$0.01");
  });
});
