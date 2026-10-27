import {describe, expect, it} from 'bun:test';
import {createPopupPairingGate} from '../../src/lib/popupPairing';
const uri = `wc:${'a'.repeat(64)}@2?relay-protocol=irn&symKey=${'b'.repeat(64)}`;
describe('popup proposal handoff without implicit account approval', () => {
  it('pairs once across overlapping effects, with no second connection consent', async () => {
    const once=createPopupPairingGate();let calls=0;
    let finish!:()=>void;
    const pair=async(value:string)=>{expect(value).toBe(uri);calls++;await new Promise<void>(resolve=>{finish=resolve;});};
    const first=once(uri,pair);
    await Promise.resolve();
    expect(await once(uri,pair)).toBe(false);expect(calls).toBe(1);
    finish();expect(await first).toBe(true);
    expect(await once(uri,pair)).toBe(false);
  });
  it('never automatically retries a failed pairing secret', async () => {
    const once=createPopupPairingGate();let calls=0;
    await expect(once(uri,async()=>{calls++;throw Error('relay offline');})).rejects.toThrow('relay offline');
    expect(await once(uri,async()=>{calls++;})).toBe(false);expect(calls).toBe(1);
  });
  it('rejects invalid handoff input before calling the relay', async () => {
    let called=false;
    expect(await createPopupPairingGate()('wc:invalid',async()=>{called=true;})).toBe(false);
    expect(called).toBe(false);
  });
});
