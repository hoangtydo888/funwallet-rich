import { describe, expect, it } from 'bun:test';
import { Interface, hexlify, toUtf8Bytes } from 'ethers';
import { unsignedTransfer, loginMessage } from '../../src/lib/walletconnectPolicy';
const from='0x1111111111111111111111111111111111111111';
const to='0x2222222222222222222222222222222222222222';
const iface=new Interface(['function transfer(address to,uint256 amount)']);
describe('WalletConnect transfer policy',()=>{
  it('preserves wei above Number precision',()=>{const r=unsignedTransfer({from,to,value:'0x14d1120d7b160001'},from);expect(r.value).toBe(1500000000000000001n);expect(r.amount).toBe('1.500000000000000001');});
  it('rejects another sender',()=>expect(()=>unsignedTransfer({from:to,to},from)).toThrow());
  it('rejects another chain',()=>expect(()=>unsignedTransfer({from,to,chainId:'0x1'},from)).toThrow());
  it('rejects numeric token quantities',()=>expect(()=>unsignedTransfer({from,to,value:123},from)).toThrow());
  it('decodes CAMLY recipient and exact amount',()=>{const r=unsignedTransfer({from,to:'0x0910320181889fefde0bb1ca63962b0a8882e413',data:iface.encodeFunctionData('transfer',[to,9007199254740993001n])},from);expect(r.recipient).toBe(to);expect(r.amount).toBe('9007199254740993.001');expect(r.symbol).toBe('CAMLY');});
  it('rejects approvals and unknown contracts',()=>{expect(()=>unsignedTransfer({from,to,data:iface.encodeFunctionData('transfer',[to,1n])},from)).toThrow();expect(()=>unsignedTransfer({from,to:'0x0910320181889fefde0bb1ca63962b0a8882e413',data:'0x095ea7b3'},from)).toThrow();});
  it('rejects transfer calldata with extra bytes',()=>expect(()=>unsignedTransfer({from,to:'0x0910320181889fefde0bb1ca63962b0a8882e413',data:iface.encodeFunctionData('transfer',[to,1n])+'00'},from)).toThrow());
});
const message=(issued=new Date().toISOString())=>`fun-profile-clone.lovable.app wants you to sign in with your Ethereum account:\n${from}\n\nSign in to FUN Profile\n\nURI: https://fun-profile-clone.lovable.app\nVersion: 1\nChain ID: 56\nNonce: ${'a'.repeat(32)}\nIssued At: ${issued}`;
describe('Profile login signatures',()=>{
  it('accepts the existing backend five minute challenge',()=>expect(loginMessage([hexlify(toUtf8Bytes(message())),from],from)).toBeInstanceOf(Uint8Array));
  it('rejects expired challenges',()=>expect(()=>loginMessage([hexlify(toUtf8Bytes(message(new Date(Date.now()-300001).toISOString()))),from],from)).toThrow());
  it('rejects arbitrary signatures',()=>expect(()=>loginMessage([hexlify(toUtf8Bytes('Send all funds')),from],from)).toThrow());
  it('rejects a substituted account',()=>expect(()=>loginMessage([hexlify(toUtf8Bytes(message())),to],from)).toThrow());
});
