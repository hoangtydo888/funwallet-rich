import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
const compile = async path => (await build({entryPoints:[path],bundle:true,format:'iife',write:false})).outputFiles[0].text;
const inpage = await compile('src/extension/src/content/inpage.ts');
const content = await compile('src/extension/src/content/inject.ts');

test('provider promise stays pending until the matching approval reply; errors carry RPC codes',async()=>{
  const listeners=new Map();
  const posted=[];const background=[];
  let responseHandler;
  const window={location:{origin:'https://fun.rich'},
    addEventListener(name,fn){if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(fn);},
    removeEventListener(name,fn){listeners.get(name)?.delete(fn);},
    dispatchEvent(event){for(const fn of listeners.get(event.type)||[])fn(event);},
    postMessage(data){posted.push(data);queueMicrotask(()=>window.dispatchEvent({type:'message',data,source:window,origin:window.location.origin}));},
  };
  const context=vm.createContext({window,console:{log(){},error(){}},crypto:webcrypto,Map,Set,Promise,URL,Event,CustomEvent:class {constructor(type,init){this.type=type;this.detail=init.detail;}},
    setTimeout(){return 1;},clearTimeout(){},
    document:{readyState:'complete',createElement(){return {remove(){}};},head:{insertBefore(){}},documentElement:{},addEventListener(){}},
    chrome:{runtime:{getURL:path=>`chrome-extension://wallet/${path}`,sendMessage(message,callback){background.push(message);callback({success:true,pending:true});},onMessage:{addListener(fn){responseHandler=fn;}}}},
  });
  vm.runInContext(content,context);vm.runInContext(inpage,context);
  let settled=false;
  const result=window.funWallet.request({method:'eth_requestAccounts'}).then(value=>{settled=true;return value;});
  await new Promise(resolve=>setTimeout(resolve,5));
  assert.equal(settled,false);
  const id=background[0].requestId;
  responseHandler({type:'FUN_WALLET_RESPONSE',requestId:id,result:['0x1111111111111111111111111111111111111111']});
  assert.equal((await result)[0],'0x1111111111111111111111111111111111111111');
  assert.equal(window.funWallet.selectedAddress,'0x1111111111111111111111111111111111111111');
  const rejected=window.funWallet.request({method:'eth_sendTransaction',params:[]});
  await new Promise(resolve=>setTimeout(resolve,5));
  responseHandler({type:'FUN_WALLET_RESPONSE',requestId:background[1].requestId,error:'User rejected',code:4001});
  await assert.rejects(rejected,error=>error.code===4001);
  const before=background.length;
  await assert.rejects(window.funWallet.request({method:'APPROVE_TRANSACTION'}),error=>error.code===4200);
  assert.equal(background.length,before);
  // A message from a subframe does not reach the background.
  window.dispatchEvent({type:'message',source:{},origin:'https://fun.rich',data:{type:'FUN_WALLET_REQUEST',id:'frame',method:'eth_requestAccounts'}});
  assert.equal(background.length,before);
});
