import {describe,it,expect} from 'bun:test';
import {assetKey} from '../../src/lib/assetIdentity';
describe('contract identity',()=>{it('never treats a token with symbol BNB as native',()=>{expect(assetKey({address:'0x'+'a'.repeat(40)})).not.toBe(assetKey({address:null}));});it('normalizes contract case',()=>{expect(assetKey({address:'0xABC'})).toBe('0xabc');});});
