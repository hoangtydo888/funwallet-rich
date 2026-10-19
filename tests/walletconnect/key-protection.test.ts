import { beforeEach, describe, expect, it } from 'bun:test';
import { Wallet } from 'ethers';
import { protectDappKey, hasLocalDappKey } from '../../src/lib/dappKeyProtection';
import { decryptPrivateKey, getEncryptedKey } from '../../src/lib/keyEncryption';
const values=new Map<string,string>();
Object.defineProperty(globalThis,'localStorage',{value:{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key)},configurable:true});
beforeEach(()=>values.clear());
const password='wallet-test-only-password';
describe('DApp key protection lifecycle',()=>{
 it('protects a local key without deleting the existing wallet backup',async()=>{
  const wallet=Wallet.createRandom();
  const legacy=JSON.stringify({[wallet.address]:wallet.privateKey});values.set('fun_wallet_pk',legacy);
  expect(hasLocalDappKey(wallet.address)).toBe(true);
  await protectDappKey(wallet.address,password);
  expect(await decryptPrivateKey(getEncryptedKey(wallet.address)!,password)).toBe(wallet.privateKey);
  expect(values.get('fun_wallet_pk')).toBe(legacy);
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
