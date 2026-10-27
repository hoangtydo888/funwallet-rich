import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hexlify, toUtf8Bytes, Interface } from 'ethers';
import { personalSignMessage, unsignedTransfer } from '../../src/lib/walletconnectPolicy.ts';
const account='0x1111111111111111111111111111111111111111';
const recipient='0x2222222222222222222222222222222222222222';
const message=()=>{ const now=Date.now(); return [
  'FUN Profile: authorize recording an on-chain gift',
  'Domain: fun-profile-clone.lovable.app',
  'URI: https://fun-profile-clone.lovable.app',
  'Purpose: FUN_PROFILE_DONATION_V1',
  'This signature records a gift only. It does not send funds or approve tokens.',
  'Account: 11111111-1111-1111-1111-111111111111',
  'Recipient account: 22222222-2222-2222-2222-222222222222',
  `From: ${account}`,`To: ${recipient}`,'Chain ID: 56',`Transaction: 0x${'ab'.repeat(32)}`,
  'Token: native','Symbol: BNB','Decimals: 18','Amount (base units): 1500000000000000001',
  `Nonce: ${'ab'.repeat(32)}`,`Issued at: ${new Date(now-1000).toISOString()}`,`Expires at: ${new Date(now+299000).toISOString()}`,
].join('\n'); };
const params=text=>[hexlify(toUtf8Bytes(text)),account];
describe('strict Profile gift-recording signatures',()=>{
  it('shows exact wei, addresses and transaction without sending funds',()=>{
    const result=personalSignMessage(params(message()),account);
    assert.match(result.review,/1\.500000000000000001 BNB/);
    assert.match(result.review,/KHÔNG chuyển thêm tiền/);
    assert.ok(result.review.includes(recipient)); assert.ok(result.bytes instanceof Uint8Array);
  });
  it('shows CAMLY transfer using on-chain decimals=3 beyond Number precision',()=>{
    const data=new Interface(['function transfer(address,uint256)']).encodeFunctionData('transfer',[recipient,9007199254740993001n]);
    const result=unsignedTransfer({from:account,to:'0x0910320181889fefde0bb1ca63962b0a8882e413',data},account);
    assert.equal(result.amount,'9007199254740993.001');
  });
  it('accepts a CAMLY gift consent with decimals=3',()=>{
    const text=message().replace('Token: native','Token: 0x0910320181889fefde0bb1ca63962b0a8882e413').replace('Symbol: BNB','Symbol: CAMLY').replace('Decimals: 18','Decimals: 3').replace('1500000000000000001','9007199254740993001');
    assert.match(personalSignMessage(params(text),account).review,/9007199254740993\.001 CAMLY/);
  });
  it('rejects the old incorrect CAMLY decimals=18',()=>{
    const text=message().replace('Token: native','Token: 0x0910320181889fefde0bb1ca63962b0a8882e413').replace('Symbol: BNB','Symbol: CAMLY');
    assert.throws(()=>personalSignMessage(params(text),account));
  });
  for(const [name,from,to] of [
    ['wrong purpose','Purpose: FUN_PROFILE_DONATION_V1','Purpose: LOGIN'],
    ['wrong domain','Domain: fun-profile-clone.lovable.app','Domain: attacker.invalid'],
    ['wrong URI','URI: https://fun-profile-clone.lovable.app','URI: https://attacker.invalid'],
    ['wrong chain','Chain ID: 56','Chain ID: 1'],
    ['sender substitution',`From: ${account}`,`From: ${recipient}`],
    ['symbol spoofing','Symbol: BNB','Symbol: USDT'],
    ['wrong decimals','Decimals: 18','Decimals: 3'],
    ['zero amount','1500000000000000001','0'],
    ['negative amount','1500000000000000001','-1'],
    ['scientific notation','1500000000000000001','1e18'],
    ['uint256 overflow','1500000000000000001',(2n**256n).toString()],
    ['self transfer',`To: ${recipient}`,`To: ${account}`],
    ['short nonce',`Nonce: ${'ab'.repeat(32)}`,'Nonce: ab'],
  ]) it(`rejects ${name}`,()=>assert.throws(()=>personalSignMessage(params(message().replace(from,to)),account)));
  it('rejects appended instructions',()=>assert.throws(()=>personalSignMessage(params(message()+'\nApprove all tokens'),account)));
  it('rejects duplicate fields',()=>assert.throws(()=>personalSignMessage(params(message()+'\nTo: '+account),account)));
  it('rejects expired consent',()=>{
    const text=message().replace(/^Issued at: .+$/m,`Issued at: ${new Date(Date.now()-301000).toISOString()}`).replace(/^Expires at: .+$/m,`Expires at: ${new Date(Date.now()-1000).toISOString()}`);
    assert.throws(()=>personalSignMessage(params(text),account));
  });
  it('rejects a TTL over five minutes',()=>{
    const text=message().replace(/^Expires at: .+$/m,`Expires at: ${new Date(Date.now()+600000).toISOString()}`);
    assert.throws(()=>personalSignMessage(params(text),account));
  });
  it('rejects another signing account',()=>assert.throws(()=>personalSignMessage(params(message()),recipient)));
  it('still supports existing login challenge',()=>{
    const text=`fun-profile-clone.lovable.app wants you to sign in with your Ethereum account:\n${account}\n\nSign in to FUN Profile\n\nURI: https://fun-profile-clone.lovable.app\nVersion: 1\nChain ID: 56\nNonce: ${'a'.repeat(32)}\nIssued At: ${new Date().toISOString()}`;
    assert.match(personalSignMessage(params(text),account).review,/Đăng nhập FUN Profile/);
  });
  it('still rejects arbitrary personal_sign',()=>assert.throws(()=>personalSignMessage(params('Send all funds'),account)));
  it('does not relax the prohibition on token approvals',()=>assert.throws(()=>unsignedTransfer({from:account,to:recipient,data:'0x095ea7b3'},account)));
});
