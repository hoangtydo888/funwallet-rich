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
    build.onLoad({filter:/.*/,namespace:'offline'}, () => ({contents:'export const ethers = globalThis.__walletTestEthers; export const Wallet=ethers.Wallet;'}));
  }
}] });
await writeFile(new URL('worker.mjs',dir),compiled.outputFiles[0].text);
let serial=0;
async function setup({panelFails=false, sessionData={}, broadcastFails=false, rpcState={}}={}) {
  const local={fun_wallet_active:active.address,fun_wallet_encrypted_v2:vault,fun_wallet_chain:'56',fun_wallet_last_activity:String(Date.now())};
  const session={...sessionData};
  const events={}; const opens=[]; const sent=[]; const windows=[]; const broadcasts=[];const panelOptions=[];const registered=[];const rpcCalls=[];
  const tabs=new Map([[1,{id:1,windowId:1,url:'https://fun.rich/profile'}],[2,{id:2,windowId:1,url:'https://other.example/'}]]);
  const event=name=>({addListener(fn){events[name]=fn;}});
  const area=data=>({async setAccessLevel(){},async get(key){return key===null?{...data}:{[key]:data[key]};},async set(values){Object.assign(data,structuredClone(values));},async remove(key){delete data[key];}});
  globalThis.chrome={
    runtime:{id:'wallet',getURL:path=>`chrome-extension://wallet/${path}`,getManifest:()=>({version:'1.1.0'}),onMessage:event('message'),onInstalled:event('installed')},
    storage:{local:area(local),session:area(session),onChanged:event('storageChanged')},
    sidePanel:{async setPanelBehavior(){},async setOptions(options){panelOptions.push(options);},open(options){opens.push(options);return panelFails?Promise.reject(new Error('user gesture required')):Promise.resolve();}},
    scripting:{async getRegisteredContentScripts(){return [...registered];},async registerContentScripts(scripts){registered.push(...scripts);},async updateContentScripts(){}},
    alarms:{async create(){},onAlarm:event('alarm')},
    tabs:{async get(id){return tabs.get(id);},async query(){return [...tabs.values()];},async sendMessage(id,message,options){sent.push({id,message,options});},onRemoved:event('tabRemoved'),onUpdated:event('tabUpdated')},
    windows:{async get(){return {top:0,left:0,width:1280,height:900};},async create(options){windows.push(options);return {id:100};},onRemoved:event('windowRemoved')},
  };
  class Provider {
    async getNetwork(){return {chainId:56n};}
    async getTransactionReceipt(hash){return rpcState.receipt ? {...rpcState.receipt,hash} : null;}
    async getBlockNumber(){return rpcState.head ?? 101;}
    async getBlock(){return {hash:rpcState.canonicalHash ?? '0xaaa'};}
    async send(method){return method==='eth_blockNumber' ? '0x65' : rpcState.rawReceipt ?? null;}
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
  globalThis.fetch=async(url,init)=>{const body=JSON.parse(init.body);rpcCalls.push({url,body});
    return {status:200,json:async()=>body.method==='eth_call'?{jsonrpc:'2.0',id:1,error:{code:3,message:'execution reverted',data:'0x08c379a0'}}:{jsonrpc:'2.0',id:1,result:'0x5208'}};};
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
  return {opens,local,session,tabs,sent,windows,broadcasts,panelOptions,events,popup,page,send,unlock,next,connect,registered,rpcCalls};
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
  const payload={requestId:request.id,reviewId:review.data.id};
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
  const payload={requestId:request.id,reviewId:review.data.id};
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
test('one-click send saves pending activity and receipt updates it without another signature',async()=>{
  const rpcState={receipt:{blockNumber:100,blockHash:'0xaaa',status:1},head:101};
  const h=await setup({rpcState});await h.connect();
  await h.send({type:'eth_sendTransaction',requestId:'gift',payload:[{from:active.address,to:first.address,value:'0x1'}]},h.page());
  const request=await h.next();
  const review=await h.send({type:'REVIEW_TRANSACTION',payload:{requestId:request.id}});
  const sent=await h.send({type:'APPROVE_TRANSACTION',payload:{requestId:request.id,reviewId:review.data.id}});
  assert.equal(sent.success,true);
  let activity=(await h.send({type:'GET_ACTIVITY'})).data;
  assert.equal(activity[0].hash,sent.data);
  assert.equal(activity[0].status,'pending');
  assert.equal((await h.send({type:'REFRESH_ACTIVITY'})).success,true);
  activity=(await h.send({type:'GET_ACTIVITY'})).data;
  assert.equal(activity[0].status,'confirmed');
  assert.equal(activity[0].confirmations,2);
  assert.equal(h.broadcasts.length,1);
  const saved=JSON.stringify(h.session)+JSON.stringify(h.local);
  assert.equal(saved.includes(password),false);
  assert.equal(saved.includes(active.privateKey),false);
});
test('locked session cannot approve just by resending a password in an approval message',async()=>{
  const h=await setup();await h.connect();
  await h.send({type:'personal_sign',requestId:'locked',payload:['0x1234',active.address]},h.page());
  const request=await h.next();
  await h.send({type:'LOCK_WALLET'});
  assert.equal((await h.send({type:'APPROVE_SIGN',payload:{requestId:request.id,password}})).code,4100);
});
test('dApp can poll a receipt and block height; malformed hash is rejected',async()=>{
  const h=await setup();
  assert.equal((await h.send({type:'eth_blockNumber',requestId:'height',payload:[]},h.page())).data,'0x65');
  assert.equal((await h.send({type:'eth_getTransactionReceipt',requestId:'poll',payload:['0x'+'a'.repeat(64)]},h.page())).data,null);
  assert.equal((await h.send({type:'eth_getTransactionReceipt',requestId:'bad',payload:['http://wrong']},h.page())).code,-32602);
});

test('connection opens the exact approval route instead of an old side-panel page',async()=>{
 const h=await setup();await h.send({type:'eth_requestAccounts',requestId:'open-flow'},h.page());const request=await h.next();
 const exact=h.panelOptions.at(-1);assert.equal(h.panelOptions.length,2);assert.equal(exact.tabId,1);assert.equal(exact.enabled,true);assert.match(exact.path,new RegExp('surface=approval-panel#\\/request\\?requestId='+request.id));
});
test('connection account selection requires a local key and a separate unlock/approval',async()=>{
 const h=await setup();await h.send({type:'eth_requestAccounts',requestId:'choose-account'},h.page());const request=await h.next();
 const accounts=await h.send({type:'GET_CONNECTION_ACCOUNTS',payload:{requestId:request.id}});
 assert.equal(accounts.success,true);assert.equal(accounts.data.length,2);assert.equal(JSON.stringify(accounts).includes(first.privateKey),false);
 assert.equal((await h.send({type:'SELECT_CONNECTION_ACCOUNT',payload:{requestId:request.id,account:'0x'+'9'.repeat(40)}})).code,4100);
 assert.equal((await h.send({type:'SELECT_CONNECTION_ACCOUNT',requestId:'spoof',payload:{requestId:request.id,account:first.address}},h.page())).code,4200);
 await h.unlock();const selected=await h.send({type:'SELECT_CONNECTION_ACCOUNT',payload:{requestId:request.id,account:first.address}});
 assert.equal(selected.data.unlocked,false);assert.equal(selected.data.request.account,first.address);assert.equal(h.local.fun_wallet_active,first.address);
 assert.equal((await h.send({type:'APPROVE_CONNECTION',payload:{requestId:request.id}})).code,4100);
 await h.unlock();assert.equal((await h.send({type:'APPROVE_CONNECTION',payload:{requestId:request.id}})).success,true);
 assert.deepEqual(h.sent.find(row=>row.message.type==='FUN_WALLET_RESPONSE').message.result,[first.address]);
});
test('retry brings the original approval forward without authorizing a second request',async()=>{
 const h=await setup();await h.send({type:'eth_requestAccounts',requestId:'first'},h.page());const firstRequest=await h.next();
 const next=await h.send({type:'eth_requestAccounts',requestId:'retry'},h.page());assert.equal(next.code,-32002);assert.equal((await h.next()).id,firstRequest.id);assert.equal(h.panelOptions.length,4);assert.match(h.panelOptions.at(-1).path,new RegExp('requestId='+firstRequest.id));
});
test('provider is registered in the MAIN world at document_start so dApps detect it before boot',async()=>{
  const h=await setup();
  await h.send({type:'IS_UNLOCKED'});
  assert.equal(h.registered.length,2);
  assert.deepEqual([h.registered[0].world,h.registered[0].runAt,h.registered[0].js[0]],['MAIN','document_start','inpage.js']);
  // The bridge is a plain registered file, not a crxjs dynamic-import loader that sites can block
  assert.deepEqual([h.registered[1].world,h.registered[1].runAt,h.registered[1].js[0]],['ISOLATED','document_start','content.js']);
});
test('read-only RPC used by wagmi is forwarded without approval and keeps revert data',async()=>{
  const h=await setup();
  const estimate=await h.send({type:'eth_estimateGas',requestId:'gas',payload:[{from:active.address,to:first.address,value:'0x1'}]},h.page());
  assert.equal(estimate.data,'0x5208');
  assert.equal(h.rpcCalls[0].url,'https://bsc-dataseed.binance.org/');
  assert.equal(h.rpcCalls[0].body.method,'eth_estimateGas');
  const reverted=await h.send({type:'eth_call',requestId:'call',payload:[{to:first.address,data:'0x'}, 'latest']},h.page());
  assert.equal(reverted.code,3);assert.equal(reverted.errorData,'0x08c379a0');
  assert.equal((await h.send({type:'net_version',requestId:'net'},h.page())).data,'56');
  assert.equal(h.windows.length+(await h.next()===null?0:1),0);
});
test('unlocking reconnects a site that already holds permission, like MetaMask',async()=>{
  const h=await setup();await h.connect();
  await h.send({type:'LOCK_WALLET'});
  assert.deepEqual((await h.send({type:'eth_accounts',requestId:'locked'},h.page())).data,[]);
  await h.send({type:'eth_requestAccounts',requestId:'reconnect'},h.page());
  const request=await h.next();
  const unlocked=await h.unlock();
  assert.deepEqual(unlocked.data.autoApproved,[request.id]);
  assert.deepEqual(h.sent.find(x=>x.message.requestId==='reconnect').message.result,[active.address]);
  assert.deepEqual(h.sent.filter(x=>x.message.type==='accountsChanged').at(-1).message.accounts,[active.address]);
  assert.equal(await h.next(),null);
});
test('wallet permissions: request returns eth_accounts caveat, revoke disconnects the site',async()=>{
  const h=await setup();await h.unlock();
  await h.send({type:'wallet_requestPermissions',requestId:'perm',payload:[{eth_accounts:{}}]},h.page());
  const request=await h.next();
  const approved=await h.send({type:'APPROVE_CONNECTION',payload:{requestId:request.id}});
  assert.deepEqual(approved.data[0].caveats[0].value,[active.address]);
  assert.equal((await h.send({type:'wallet_getPermissions',requestId:'get'},h.page())).data[0].parentCapability,'eth_accounts');
  assert.equal((await h.send({type:'wallet_revokePermissions',requestId:'revoke',payload:[{eth_accounts:{}}]},h.page())).success,true);
  assert.deepEqual((await h.send({type:'eth_accounts',requestId:'after'},h.page())).data,[]);
  assert.deepEqual((await h.send({type:'wallet_getPermissions',requestId:'get2'},h.page())).data,[]);
});
test('personal_sign accepts UTF-8 text and signs it as MetaMask does',async()=>{
  const h=await setup();await h.connect();
  await h.send({type:'personal_sign',requestId:'text',payload:['Đăng nhập FUN Profile',active.address]},h.page());
  const request=await h.next();
  const response=await h.send({type:'APPROVE_SIGN',payload:{requestId:request.id,password}});
  assert.equal(ethers.verifyMessage('Đăng nhập FUN Profile',response.data),active.address);
});

test('side panel opens synchronously with the dApp click, before any await, so Chrome keeps the gesture',async()=>{
  const h=await setup();
  const response=h.send({type:'eth_requestAccounts',requestId:'gesture'},h.page());
  assert.deepEqual(h.opens,[{tabId:1}]);
  assert.equal((await response).pending,true);
  assert.equal(h.windows.length,0);
  void h.send({type:'eth_chainId',requestId:'read'},h.page());
  assert.equal(h.opens.length,1);
});


test('a fresh install opens the full-page welcome flow in a tab, but not when a wallet exists',async()=>{
  const h=await setup();const opened=[];chrome.tabs.create=async options=>{opened.push(options.url);};
  delete h.local.fun_wallet_list;h.events.installed({reason:'install'});await new Promise(r=>setTimeout(r,10));
  assert.deepEqual(opened,['chrome-extension://wallet/popup.html?surface=onboarding']);
  h.local.fun_wallet_list='[]';h.events.installed({reason:'install'});h.events.installed({reason:'update'});await new Promise(r=>setTimeout(r,10));
  assert.equal(opened.length,1);
});
