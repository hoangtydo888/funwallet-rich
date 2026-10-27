import test from 'node:test';
import assert from 'node:assert/strict';
import { pickBestPair, sumPendingRewards } from '../../src/lib/funTokens.ts';
test('picks highest-liquidity pair price', () => {
  const p = pickBestPair([{ priceUsd: '1', liquidity: { usd: 10 } }, { priceUsd: '2', liquidity: { usd: 500 }, priceChange: { h24: 3 } }]);
  assert.deepEqual(p, { priceUsd: 2, change24h: 3 });
});
test('only pending rewards count as claimable', () => {
  assert.equal(sumPendingRewards([{ reward_amount: '100', status: 'pending' }, { reward_amount: '50', status: 'claim_requested' }]), 100);
});
