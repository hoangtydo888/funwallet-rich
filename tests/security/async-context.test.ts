import {describe,it,expect} from 'bun:test';
import {AsyncContextGate} from '../../src/lib/asyncContextGate';
describe('async wallet data isolation',()=>{
 it('rejects a user-A result after account change or logout',()=>{const g=new AsyncContextGate();g.setContext('user-A');const a=g.start();g.setContext('user-B');expect(g.accepts(a)).toBe(false);const b=g.start();g.setContext(null);expect(g.accepts(b)).toBe(false);});
 it('rejects stale balance refresh and the ABA switch back to the same wallet',()=>{const g=new AsyncContextGate();g.setContext('A:wallet-1');const one=g.start(),two=g.start();expect(g.accepts(one)).toBe(false);expect(g.accepts(two)).toBe(true);g.setContext('A:wallet-2');g.setContext('A:wallet-1');expect(g.accepts(two)).toBe(false);});
});
