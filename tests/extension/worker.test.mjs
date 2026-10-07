import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
import { ethers } from 'ethers';

const dir = new URL('../../node_modules/.cache/fun-wallet-tests/', import.meta.url);
await mkdir(dir, { recursive: true });
const enc = await build({ entryPoints:['src/shared/lib/encryption.ts'], bundle:true, packages:'external', platform:'node', format:'esm', write:false });
await writeFile(new URL('encryption.mjs',dir), enc.outputFiles[0].text);
const {encryptPrivateKey} = await import(new URL('encryption.mjs',dir));
const first = ethers.Wallet.createRandom();
const active = ethers.Wallet.createRandom();
const password = 'test-only-wallet-password';
const vault = JSON.stringify({version:1,wallets:{[first.address]:await encryptPrivateKey(first.privateKey,password),[active.address]:await encryptPrivateKey(active.privateKey,password)}});
const compiled = await build({ entryPoints:['src/extension/src/background/service-worker.ts'], bundle:true, packages:'external', platform:'node', format:'esm', write:false, alias:{'@shared':'./src/shared'}, plugins:[{
  name:'offline-rpc', setup(build) {
    build.onResolve({filter:/^ethers$/}, () => ({path:'ethers',namespace:'offline'}));
    build.onLoad({filter:/.*/,namespace:'offline'}, () => ({contents:'export const ethers = globalThis.__walletTestEthers;'}));
  }
}] });
await writeFile(new URL('worker.mjs',dir),compiled.outputFiles[0].text);
let serial=0;
async function setup({panelFails=false, sessionData={}, broadcastFails=false}={}) {
  const local={fun_wallet_active:active.address,fun_wallet_encrypted_v2:vault,fun_wallet_chain:'56',fun_wallet_last_activity:String(Date.now())};
  const session={...sessionData};
  const events={}; const sent=[]; const windows=[]; const broadcasts=[];
  const tabs=new Map([[1,{id:1,windowId:1,url:'https://fun.rich/profile'}],[2,{id:2,windowId:1,url:'https://other.example/'}]]);
  const event=name=>({addListener(fn){events[name]=fn;}});
  const area=data=>({async setAccessLevel(){},async get(key){return key===null?{...data}:{[key]:data[key]};},async set(values){Object.assign(data,structuredClone(values));},async remove(key){delete data[key];}});
  globalThis.chrome={
    runtime:{id:'wallet',getURL:path=>`chrome-extension://wallet/${path}`,onMessage:event('message')},
    storage:{local:area(local),session:area(session)},
    sidePanel:{async setPanelBehavior(){},async open(){if(panelFails)throw new Error('user gesture required');}},
    alarms:{async create(){},onAlarm:event('alarm')},
    tabs:{async get(id){return tabs.get(id);},async query(){return [...tabs.values()];},async sendMessage(id,message,options){sent.push({id,message,options});},onRemoved:event('tabRemoved'),onUpdated:event('tabUpdated')},
    windows:{async get(){return {top:0,left:0,width:1280,height:900};},async create(options){windows.push(options);return {id:100};},onRemoved:event('windowRemoved')},
  };
  class Provider {
    async getNetwork(){return {chainId:56n};}
    async estimateGas(){return 65000n;}
    async getFeeData(){return {gasPrice:1000000000n,maxFeePerGas:null,maxPriorityFeePerGas:null};}
    async getBalance(){return ethers.parseEther('100');}
    async broadcastTransaction(signed){broadcasts.push(ethers.Transaction.from(signed));if(broadcastFails)throw new Error('timeout');return {hash:ethers.keccak256(signed)};}
    destroy(){}
  }
  class Wallet extends ethers.Wallet {
    connect(){return {populateTransaction:async tx=>({...tx,nonce:tx.nonce??0,type:0})};}
  }
  class Contract {async decimals(){return 3n;}async symbol(){return 'CAMLY';}}
  globalThis.__walletTestEthers={...ethers,JsonRpcProvider:Provider,Wallet,Contract};
  await import(new URL(`worker.mjs?instance=${++serial}`,dir));
  const popup={id:'wallet',url:'chrome-extension://wallet/popup.html?surface=approval'};
  const page=(tabId=1)=>({id:'wallet',url:tabs.get(tabId).url,tab:tabs.get(tabId),frameId:0,documentId:`doc-${tabId}`});
  const send=(message,sender=popup)=>new Promise(resolve=>events.message(message,sender,resolve));
  const unlock=()=>send({type:'UNLOCK_WALLET',payload:{password}});
  const next=async()=> (await send({type:'GET_NEXT_PENDING'})).data;
  const connect=async(tabId=1,clientId='connect-original')=>{
    await unlock();
    const result=await send({type:'eth_requestAccounts',requestId:clientId},page(tabId));
    assert.equal(result.pending,true);
    const request=await next();
    assert.equal((await send({type:'APPROVE_CONNECTION',payload:{requestId:request.id}})).success,true);
  };
  return {local,session,tabs,sent,windows,broadcasts,events,popup,page,send,unlock,next,connect};
}

test('connection preserves client ID, resumes after unlock and scopes account event to its origin', async()=>{
  const h=await setup();
  const response=await h.send({type:'eth_requestAccounts',requestId:'client-A',origin:'https://spoof.example'},h.page());
  assert.equal(response.pending,true);
  const pending=await h.next();
  assert.equal(pending.origin,'https://fun.rich');
  assert.equal((await h.send({type:'APPROVE_CONNECTION',payload:{requestId:pending.id}})).code,4100);
  await h.unlock();
  assert.equal((await h.send({type:'APPROVE_CONNECTION',payload:{requestId:pending.id,origin:'https://spoof.example'}})).success,true);
  const result=h.sent.find(x=>x.message.type==='FUN_WALLET_RESPONSE');
  assert.equal(result.message.requestId,'client-A');
  assert.deepEqual(result.message.result,[active.address]);
  assert.equal(result.options.documentId,'doc-1');
  assert.equal(h.sent.some(x=>x.id===2),false);
  assert.deepEqual((await h.send({type:'eth_accounts',requestId:'accounts'},h.page(2))).data,[]);
});
test('internal messages are denied even when sent directly through the content bridge',async()=>{
  const h=await setup();
  for(const type of ['APPROVE_TRANSACTION','UNLOCK_WALLET','GET_PENDING_REQUEST','CONNECT_DAPP']) {
    assert.equal((await h.send({type,requestId:'forged',payload:{password}},h.page())).code,4200);
  }
  assert.equal((await h.send({type:'IS_UNLOCKED'})).data.unlocked,false);
});
test('popup fallback and close reject the original dApp promise',async()=>{
  const h=await setup({panelFails:true});
  await h.send({type:'eth_requestAccounts',requestId:'close-me'},h.page());
  assert.equal(h.windows.length,1);
  assert.match(h.windows[0].url,/surface=approval/);
  h.events.windowRemoved(100);
  await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(h.sent.at(-1).message.code,4001);
  assert.equal(h.sent.at(-1).message.requestId,'close-me');
});
test('token approval uses selected account, exact calldata, quoted fees; double click broadcasts once',async()=>{
  const h=await setup();await h.connect();
  const abi=new ethers.Interface(['function transfer(address,uint256)']);
  const recipient='0x2222222222222222222222222222222222222222';
  const contract='0x0910320181889fefde0bb1ca63962b0a8882e413';
  const data=abi.encodeFunctionData('transfer',[recipient,500000000n]);
  await h.send({type:'eth_sendTransaction',requestId:'tx-A',payload:[{from:active.address,to:contract,data,value:'0x0'}]},h.page());
  const request=await h.next();
  const review=await h.send({type:'REVIEW_TRANSACTION',payload:{requestId:request.id}});
  assert.equal(review.success,true);assert.equal(review.data.amount,'500000.0');assert.equal(review.data.symbol,'CAMLY');
  assert.equal(review.data.recipient,recipient);
  const payload={requestId:request.id,reviewId:review.data.id,password};
  const results=await Promise.all([h.send({type:'APPROVE_TRANSACTION',payload}),h.send({type:'APPROVE_TRANSACTION',payload})]);
  assert.equal(results.filter(x=>x.success).length,1);
  assert.equal(h.broadcasts.length,1);
  assert.equal(h.broadcasts[0].from,active.address);
  assert.equal(h.broadcasts[0].data,data);
  assert.equal(h.broadcasts[0].chainId,56n);
  assert.equal(h.broadcasts[0].gasLimit,78000n);
});
test('revoked permission, changed account and wrong approval type cannot sign',async()=>{
  const h=await setup();await h.connect();
  await h.send({type:'personal_sign',requestId:'sign-A',payload:['0xff00',active.address]},h.page());
  const request=await h.next();
  assert.equal((await h.send({type:'APPROVE_TRANSACTION',payload:{requestId:request.id,password}})).code,4100);
  h.local.fun_wallet_active=first.address;
  assert.equal((await h.send({type:'APPROVE_SIGN',payload:{requestId:request.id,password}})).code,4100);
  h.local.fun_wallet_active=active.address;
  await h.send({type:'DISCONNECT_DAPP',payload:{origin:'https://fun.rich'}});
  assert.equal((await h.send({type:'APPROVE_SIGN',payload:{requestId:request.id,password}})).success,false);
});
test('binary personal_sign signs bytes, not UTF-8 replacement text',async()=>{
  const h=await setup();await h.connect();
  await h.send({type:'personal_sign',requestId:'binary',payload:['0xff00',active.address]},h.page());
  const request=await h.next();
  const response=await h.send({type:'APPROVE_SIGN',payload:{requestId:request.id,password}});
  assert.equal(response.success,true);
  assert.equal(ethers.verifyMessage(ethers.getBytes('0xff00'),response.data),active.address);
});
test('broadcast uncertainty consumes request and never allows silent retry',async()=>{
  const h=await setup({broadcastFails:true});await h.connect();
  await h.send({type:'eth_sendTransaction',requestId:'uncertain',payload:[{from:active.address,to:first.address,value:'0x1'}]},h.page());
  const request=await h.next();
  const review=await h.send({type:'REVIEW_TRANSACTION',payload:{requestId:request.id}});
  const payload={requestId:request.id,reviewId:review.data.id,password};
  assert.equal((await h.send({type:'APPROVE_TRANSACTION',payload})).success,false);
  assert.equal((await h.send({type:'APPROVE_TRANSACTION',payload})).success,false);
  assert.equal(h.broadcasts.length,1);
  assert.match(h.sent.find(x=>x.message.requestId==='uncertain').message.error,/0x[0-9a-f]{64}/);
});
test('worker restart restores pending connection but stays locked',async()=>{
  const h=await setup();
  await h.send({type:'eth_requestAccounts',requestId:'restart'},h.page());
  const sessionData=structuredClone(h.session);
  const restored=await setup({sessionData});
  assert.equal((await restored.next()).clientId,'restart');
  assert.equal((await restored.send({type:'IS_UNLOCKED'})).data.unlocked,false);
});
test('same-origin navigation invalidates a pending request',async()=>{
  const h=await setup();await h.connect();
  await h.send({type:'personal_sign',requestId:'navigate',payload:['0x1234',active.address]},h.page());
  const request=await h.next();
  h.events.tabUpdated(1,{status:'loading'});
  await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal((await h.send({type:'APPROVE_SIGN',payload:{requestId:request.id,password}})).success,false);
  assert.equal(h.sent.find(x=>x.message.requestId==='navigate').message.code,4100);
});
test('switching network requires consent and invalidates an older transaction context',async()=>{
  const h=await setup();await h.connect();await h.connect(2,'second-connection');
  await h.send({type:'personal_sign',requestId:'old-chain',payload:['0x1234',active.address]},h.page());
  const older=await h.next();
  await h.send({type:'wallet_switchEthereumChain',requestId:'switch',payload:[{chainId:'0x1'}]},h.page(2));
  assert.equal((await h.send({type:'GET_CURRENT_CHAIN'})).data,'0x38');
  const target=h.session.fun_wallet_pending_requests.find(r=>r.method==='wallet_switchEthereumChain');
  assert.equal((await h.send({type:'APPROVE_CONNECTION',payload:{requestId:target.id}})).success,true);
  assert.equal((await h.send({type:'GET_CURRENT_CHAIN'})).data,'0x1');
  assert.equal((await h.send({type:'APPROVE_SIGN',payload:{requestId:older.id,password}})).code,4901);
});
test('expired requests fail closed and an alarm resolves the original promise',async()=>{
  const h=await setup();
  await h.send({type:'eth_requestAccounts',requestId:'expire'},h.page());
  const request=await h.next();
  const originalNow=Date.now;
  try {
    Date.now=()=>originalNow()+301000;
    assert.equal((await h.send({type:'GET_PENDING_REQUEST',payload:{requestId:request.id}})).success,false);
    h.events.alarm();
    await new Promise(resolve=>setTimeout(resolve,10));
    assert.equal(h.sent.find(x=>x.message.requestId==='expire').message.code,4001);
  } finally {Date.now=originalNow;}
});
test('unknown or stale quote cannot authorize a transaction',async()=>{
  const h=await setup();await h.connect();
  await h.send({type:'eth_sendTransaction',requestId:'no-quote',payload:[{from:active.address,to:first.address,value:'0x1'}]},h.page());
  const request=await h.next();
  assert.equal((await h.send({type:'APPROVE_TRANSACTION',payload:{requestId:request.id,password,reviewId:'fake'}})).success,false);
  const quote=await h.send({type:'REVIEW_TRANSACTION',payload:{requestId:request.id}});
  const originalNow=Date.now;
  try {
    Date.now=()=>originalNow()+61000;
    assert.equal((await h.send({type:'APPROVE_TRANSACTION',payload:{requestId:request.id,password,reviewId:quote.data.id}})).success,false);
  } finally {Date.now=originalNow;}
  assert.equal(h.broadcasts.length,0);
});
