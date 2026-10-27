import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
const dir = new URL('../../node_modules/.cache/fun-wallet-tests/', import.meta.url);
await mkdir(dir, {recursive:true});
for(const name of ['activity','signingSession']) {
  const result=await build({entryPoints:[`src/extension/src/lib/${name}.ts`],bundle:true,packages:'external',platform:'node',format:'esm',write:false});
  await writeFile(new URL(`${name}.mjs`,dir),result.outputFiles[0].text);
}
const {reconcileReceipt}=await import(new URL('activity.mjs',dir));
const {SigningSession}=await import(new URL('signingSession.mjs',dir));
const base={hash:'0x123',chainId:56,account:'0xabc',recipient:'0xdef',origin:'https://fun.rich',kind:'transfer',amount:'399999',symbol:'CAMLY',createdAt:Date.now(),status:'pending',confirmations:0};
const receipt={hash:'0x123',blockNumber:100,blockHash:'0xaaa',status:1};
test('broadcast or a missing receipt never means success',()=>{
  assert.equal(reconcileReceipt(base,null,100,null).status,'pending');
  assert.equal(reconcileReceipt({...base,status:'unknown'},null,100,null).status,'unknown');
});
test('receipt needs two confirmations; revert is distinct from success',()=>{
  assert.equal(reconcileReceipt(base,receipt,100,'0xaaa').status,'confirming');
  assert.equal(reconcileReceipt(base,receipt,101,'0xaaa').status,'confirmed');
  assert.equal(reconcileReceipt(base,{...receipt,status:0},101,'0xaaa').status,'failed');
  assert.equal(reconcileReceipt(base,{...receipt,status:null},101,'0xaaa').status,'unknown');
});
test('orphaned receipt, wrong transaction hash and reorg remove success state',()=>{
  const confirmed=reconcileReceipt(base,receipt,101,'0xaaa');
  assert.equal(reconcileReceipt(confirmed,receipt,102,'0xbbb').status,'pending');
  assert.equal(reconcileReceipt(confirmed,null,102,null).status,'pending');
  assert.equal(reconcileReceipt(base,{...receipt,hash:'0x456'},101,'0xaaa').status,'pending');
});
test('unlocked session signs without password but cannot cross accounts or survive expiry/lock/restart',()=>{
  const session=new SigningSession(1000);
  const wallet={address:'0xABC'};
  assert.throws(()=>session.get('0xabc'));
  session.unlock(wallet);
  assert.equal(session.get('0xabc'),wallet);
  assert.throws(()=>session.get('0xdef'));
  const original=Date.now;
  try {Date.now=()=>original()+1001;assert.throws(()=>session.get('0xabc'));}
  finally {Date.now=original;}
  session.unlock(wallet);session.lock();assert.throws(()=>session.get('0xabc'));
  assert.equal(new SigningSession().isUnlocked(),false);
});
