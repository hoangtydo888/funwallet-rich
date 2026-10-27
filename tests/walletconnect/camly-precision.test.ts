import { describe, expect, it } from 'bun:test';
import { parseUnits, formatUnits } from 'ethers';
import { COMMON_TOKENS, SWAP_TOKENS } from '../../src/shared/constants/tokens';
import { COMMON_TOKENS as legacyCommon } from '../../src/lib/wallet';
import { SWAP_TOKENS as legacySwap } from '../../src/lib/swap';

describe('BSC CAMLY precision agrees with decimals()=3', () => {
  for (const [name, list] of Object.entries({ common: COMMON_TOKENS, swap: SWAP_TOKENS, legacyCommon, legacySwap })) {
    it(`${name} preserves exact user amount through base units`, () => {
      const token = list.find(token => token.symbol === 'CAMLY');
      expect(token?.decimals).toBe(3);
      const units = parseUnits('9007199254740993.001', token!.decimals);
      expect(units).toBe(9007199254740993001n);
      expect(formatUnits(units, token!.decimals)).toBe('9007199254740993.001');
      expect(() => parseUnits('1.0001', token!.decimals)).toThrow();
    });
  }
});
