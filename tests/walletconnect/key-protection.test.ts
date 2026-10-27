import { beforeEach, describe, expect, it } from 'bun:test';
import { Wallet } from 'ethers';
import { protectDappKey, hasLocalDappKey,dappKeyReadiness } from '../../src/lib/dappKeyProtection';
import { decryptPrivateKey, getEncryptedKey,ENCRYPTED_WALLET_STORAGE_KEY } from '../../src/lib/keyEncryption';
const values=new Map<string,string>();
Object.defineProperty(globalThis,'localStorage',{value:{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key)},configurable:true});
beforeEach(()=>{values.clear();Object.defineProperty(globalThis,'localStorage',{value:{getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v),removeItem:(k:string)=>values.delete(k),get length(){return values.size;},key:(index:number)=>[...values.keys()][index]??null},configurable:true});});
const password='wallet-test-only-password';
describe('DApp key protection lifecycle',()=>{
 it('removes plaintext only after a verified encrypted copy exists',async()=>{
  const wallet=Wallet.createRandom();
  const legacy=JSON.stringify({[wallet.address]:wallet.privateKey});values.set('fun_wallet_pk',legacy);
  expect(hasLocalDappKey(wallet.address)).toBe(true);
  await protectDappKey(wallet.address,password);
  expect(await decryptPrivateKey(getEncryptedKey(wallet.address)!,password)).toBe(wallet.privateKey);
  expect(values.has('fun_wallet_pk')).toBe(false);
 });
 it('rejects a mismatched key without writing encrypted storage',async()=>{
  const wallet=Wallet.createRandom();const another=Wallet.createRandom();values.set('fun_wallet_pk',JSON.stringify({[wallet.address]:another.privateKey}));
  await expect(protectDappKey(wallet.address,password)).rejects.toThrow('không khớp');expect(getEncryptedKey(wallet.address)).toBeNull();
 });
 it('does not overwrite an existing protected key when password is wrong',async()=>{
  const wallet=Wallet.createRandom();values.set('fun_wallet_pk',JSON.stringify({[wallet.address]:wallet.privateKey}));await protectDappKey(wallet.address,password);
  const original=JSON.stringify(getEncryptedKey(wallet.address));
  await expect(protectDappKey(wallet.address,'incorrect-password')).rejects.toThrow();expect(JSON.stringify(getEncryptedKey(wallet.address))).toBe(original);
 });
 it('refuses watch-only wallets and short new passwords',async()=>{
  const wallet=Wallet.createRandom();expect(hasLocalDappKey(wallet.address)).toBe(false);
  await expect(protectDappKey(wallet.address,password)).rejects.toThrow('chưa có khóa');
  values.set('fun_wallet_pk',JSON.stringify({[wallet.address]:wallet.privateKey}));await expect(protectDappKey(wallet.address,'short')).rejects.toThrow('12');
 });
});

describe('WalletConnect web prerequisites',()=>{
 it('requires recovery for a watch-only wallet even if another vault account is unlocked',()=>{const w=Wallet.createRandom(),state=dappKeyReadiness(w.address,true);expect(state.state).toBe('missing');expect(state.canPair).toBe(false);expect(state.message).toContain('Khôi phục');});
 it('distinguishes a present locked key from a ready signing account',async()=>{const w=Wallet.createRandom();values.set('fun_wallet_pk',JSON.stringify({[w.address]:w.privateKey}));await protectDappKey(w.address,password);expect(dappKeyReadiness(w.address,false).state).toBe('locked');expect(dappKeyReadiness(w.address,true).canPair).toBe(true);});
 it('recognizes the older backup key prefix for exactly this account',async()=>{const w=Wallet.createRandom(),other=Wallet.createRandom();values.set('pk_'+w.address,w.privateKey);expect(dappKeyReadiness(w.address,false).state).toBe('legacy');expect(dappKeyReadiness(other.address,false).state).toBe('missing');await protectDappKey(w.address,password);expect(dappKeyReadiness(w.address,false).state).toBe('locked');});
 it('reports corrupted vaults without crashing or suggesting overwriting them',()=>{values.set(ENCRYPTED_WALLET_STORAGE_KEY,'{broken');const state=dappKeyReadiness(Wallet.createRandom().address,true);expect(state.state).toBe('damaged');expect(state.canPair).toBe(false);expect(values.get(ENCRYPTED_WALLET_STORAGE_KEY)).toBe('{broken');});
});
