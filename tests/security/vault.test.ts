import { beforeEach,describe,expect,it } from 'bun:test';
import { Wallet } from 'ethers';
import { storePrivateKey,encryptPrivateKey,decryptPrivateKey,encryptRecoveryPhrase,decryptRecoveryPhrase,getSecureStorage,saveEncryptedKey,decryptVaultKeys,changeVaultPassword,migrateToEncryptedStorage,ENCRYPTED_WALLET_STORAGE_KEY } from '../../src/lib/keyEncryption';
import { WalletKeySession } from '../../src/lib/walletKeySession';
import { exactTokenUnits,minimumOutput } from '../../src/lib/tokenAmounts';
import { reserveBroadcast,serializeBroadcast } from '../../src/lib/transactionQueue';
import { exportEncryptedVault,restoreEncryptedVault,resetVaultPassword } from '../../src/lib/vaultBackup';
const key1='0x'+'0'.repeat(63)+'1',key2='0x'+'0'.repeat(63)+'2';
const address1=new Wallet(key1).address.toLowerCase(),address2=new Wallet(key2).address.toLowerCase();
const password='test-only password 123!',nextPassword='new test-only password 456!';
let data:Map<string,string>;
beforeEach(()=>{data=new Map();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>data.set(key,value),removeItem:(key:string)=>data.delete(key),get length(){return data.size;},key:(index:number)=>[...data.keys()][index]??null}});});
async function seed(){saveEncryptedKey(address1,await encryptPrivateKey(key1,password));}
async function legacyCipher(key:string,pwd:string){
 const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
 const raw=await crypto.subtle.importKey('raw',new TextEncoder().encode(pwd),'PBKDF2',false,['deriveKey']);
 const derived=await crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations:100000},raw,{name:'AES-GCM',length:256},false,['encrypt']);
 const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},derived,new TextEncoder().encode(key));
 const b64=(v:Uint8Array)=>btoa(String.fromCharCode(...v));
 return {version:1,createdAt:0,salt:b64(salt),iv:b64(iv),encryptedKey:b64(new Uint8Array(encrypted))};
}
describe('encrypted vault (public disposable keys only)',()=>{
 it('v2 round trip uses randomized salt/IV and address binding',async()=>{const a=await encryptPrivateKey(key1,password),b=await encryptPrivateKey(key1,password);expect(a.version).toBe(2);expect(a.address).toBe(address1);expect(a.encryptedKey).not.toBe(b.encryptedKey);expect(await decryptPrivateKey(a,password)).toBe(key1);});
 it('decrypts existing v1 short-password vault without changing KDF interpretation',async()=>{expect(await decryptPrivateKey(await legacyCipher(key1,'old123'),'old123')).toBe(key1);});
 it('rejects ciphertext/address/version tampering and wrong password',async()=>{const enc=await encryptPrivateKey(key1,password);await expect(decryptPrivateKey({...enc,address:address2},password)).rejects.toThrow();await expect(decryptPrivateKey({...enc,version:99},password)).rejects.toThrow();await expect(decryptPrivateKey(enc,'wrong')).rejects.toThrow();});
 it('refuses weak new passwords',async()=>{await expect(encryptPrivateKey(key1,'short')).rejects.toThrow();});
 it('does not replace corrupted storage with an empty vault',()=>{data.set(ENCRYPTED_WALLET_STORAGE_KEY,'{broken');expect(()=>getSecureStorage()).toThrow();expect(data.get(ENCRYPTED_WALLET_STORAGE_KEY)).toBe('{broken');});
 it('password rotation failure leaves all original encrypted keys unchanged',async()=>{await seed();saveEncryptedKey(address2,await encryptPrivateKey(key2,'another password 123!'));const before=data.get(ENCRYPTED_WALLET_STORAGE_KEY);await expect(changeVaultPassword(password,nextPassword)).rejects.toThrow();expect(data.get(ENCRYPTED_WALLET_STORAGE_KEY)).toBe(before);expect(await decryptPrivateKey(getSecureStorage().wallets[address1],password)).toBe(key1);});
 it('rotates all keys in one vault write and old password stops working',async()=>{await seed();saveEncryptedKey(address2,await encryptPrivateKey(key2,password));await changeVaultPassword(password,nextPassword);expect(Object.keys(await decryptVaultKeys(nextPassword))).toHaveLength(2);await expect(decryptVaultKeys(password)).rejects.toThrow();});
 it('migration failure never deletes legacy data or commits partial encrypted keys',async()=>{const raw=JSON.stringify({[address1]:key1,[address2]:'invalid'});data.set('fun_wallet_pk',raw);await expect(migrateToEncryptedStorage('fun_wallet_pk',password)).rejects.toThrow();expect(data.get('fun_wallet_pk')).toBe(raw);expect(data.has(ENCRYPTED_WALLET_STORAGE_KEY)).toBe(false);});
 it('deletes legacy plaintext only after complete validated encrypted migration',async()=>{data.set('fun_wallet_pk',JSON.stringify({[address1]:key1,[address2]:key2}));expect(await migrateToEncryptedStorage('fun_wallet_pk',password)).toBe(2);expect(data.has('fun_wallet_pk')).toBe(false);expect(Object.keys(await decryptVaultKeys(password))).toHaveLength(2);});
 it('encrypted backup round trips without leaking the test private key',async()=>{await seed();const text=exportEncryptedVault();expect(text.includes(key1)).toBe(false);data.delete(ENCRYPTED_WALLET_STORAGE_KEY);expect(await restoreEncryptedVault(text,password,nextPassword)).toBe(1);expect((await decryptVaultKeys(nextPassword))[address1]).toBe(key1);});
 it('forgotten password reset keeps only the proven key under the new password',async()=>{await seed();expect(await resetVaultPassword(key1,nextPassword)).toBe(address1);expect(await decryptVaultKeys(nextPassword)).toEqual({[address1]:key1});await expect(decryptVaultKeys(password)).rejects.toThrow();});
 it('forgotten password reset accepts an account wallet whose key is not on this device yet',async()=>{expect(await resetVaultPassword(key2,nextPassword,[address2.toUpperCase().replace('0X','0x')])).toBe(address2);expect(await decryptVaultKeys(nextPassword)).toEqual({[address2]:key2});});
 it('forgotten password reset refuses a key that is not in the vault',async()=>{await seed();const before=data.get(ENCRYPTED_WALLET_STORAGE_KEY);await expect(resetVaultPassword(key2,nextPassword,[address1])).rejects.toThrow('không thuộc');expect(data.get(ENCRYPTED_WALLET_STORAGE_KEY)).toBe(before);});
 it('wrong backup password never overwrites current vault',async()=>{await seed();const text=exportEncryptedVault(),before=data.get(ENCRYPTED_WALLET_STORAGE_KEY);await expect(restoreEncryptedVault(text,'wrong',nextPassword)).rejects.toThrow();expect(data.get(ENCRYPTED_WALLET_STORAGE_KEY)).toBe(before);});
});
describe('memory signing session',()=>{
 it('has no plaintext-storage fallback, expires on key read without timer callbacks',async()=>{let now=0;const s=new WalletKeySession(()=>now,async()=>({[address1]:key1}));data.set('fun_wallet_pk',JSON.stringify({[address1]:key1}));expect(s.getKey(address1)).toBeNull();expect(await s.unlock(password)).toBe(true);expect(s.getKey(address1)).toBe(key1);now=15*60000;expect(s.getKey(address1)).toBeNull();expect(s.getPassword()).toBeNull();});
 it('lock invalidates an in-flight unlock',async()=>{let complete:(v:Record<string,string>)=>void=()=>{};const s=new WalletKeySession(Date.now,()=>new Promise(resolve=>complete=resolve));const pending=s.unlock(password);s.lock();complete({[address1]:key1});expect(await pending).toBe(false);expect(s.getKey(address1)).toBeNull();});
 it('a vault revision during decrypt invalidates the result',async()=>{const s=new WalletKeySession(Date.now,async()=>{data.set(ENCRYPTED_WALLET_STORAGE_KEY,'changed');return {[address1]:key1};});expect(await s.unlock(password)).toBe(false);});
});
describe('exact value and broadcast safety',()=>{
 it('preserves one wei and numbers beyond safe integer',()=>{expect(exactTokenUnits('1.500000000000000001',18)).toBe(1500000000000000001n);expect(exactTokenUnits('9007199254740993.001',3)).toBe(9007199254740993001n);});
 it('never rounds extra precision or auto increases near-max quantities',()=>{expect(()=>exactTokenUnits('1.0001',3)).toThrow();expect(exactTokenUnits('999.999',3)).toBe(999999n);});
 it('computes chosen slippage with integers and rejects silent ten-percent widening',()=>{expect(minimumOutput('9007199254740993.001',3,0.5)).toBe(9007199254740993001n*9950n/10000n);expect(()=>minimumOutput('1',18,10)).toThrow();});
 it('reserves a duplicate before broadcast and requires 30 seconds before reuse',()=>{reserveBroadcast(address1,56,address2,'0x',1n,1000);expect(()=>reserveBroadcast(address1,56,address2,'0x',1n,1001)).toThrow();expect(()=>reserveBroadcast(address1,56,address2,'0x',1n,31000)).not.toThrow();});
 it('serializes concurrent sends in the same wallet',async()=>{const events:string[]=[];await Promise.all([serializeBroadcast(address1,56,async()=>{events.push('start1');await new Promise(r=>setTimeout(r,10));events.push('end1');}),serializeBroadcast(address1,56,async()=>{events.push('start2');})]);expect(events).toEqual(['start1','end1','start2']);});
});

describe('recovery phrase compatibility and legacy restore',()=>{
 const phrase='test test test test test test test test test test test junk';
 it('separates mnemonic ciphertext from private-key ciphertext',async()=>{
  const enc=await encryptRecoveryPhrase(phrase,password);
  expect(await decryptRecoveryPhrase(enc,password)).toBe(phrase);
  await expect(decryptPrivateKey(enc,password)).rejects.toThrow();
  await expect(decryptRecoveryPhrase(enc,password,address1)).rejects.toThrow();
 });
 it('preserves legacy version-one recovery phrases',async()=>{expect(await decryptRecoveryPhrase(await legacyCipher(phrase,'old123'),'old123')).toBe(phrase);});
 it('migrates the older backup-restore key prefix only after verification',async()=>{
  data.set('pk_'+address1,key1);await migrateToEncryptedStorage('fun_wallet_pk',password);
  expect(data.has('pk_'+address1)).toBe(false);expect((await decryptVaultKeys(password))[address1]).toBe(key1);
 });
 it('quota failure preserves legacy plaintext for recovery',async()=>{
  data.set('fun_wallet_pk',JSON.stringify({[address1]:key1}));
  const original=localStorage.setItem;localStorage.setItem=()=>{throw new Error('quota');};
  try{await expect(migrateToEncryptedStorage('fun_wallet_pk',password)).rejects.toThrow();expect(data.has('fun_wallet_pk')).toBe(true);expect(data.has(ENCRYPTED_WALLET_STORAGE_KEY)).toBe(false);}finally{localStorage.setItem=original;}
 });
});

describe('single-key import is revision guarded',()=>{
 it('does not mix an old password into a vault changed by an older tab',async()=>{await seed();const other=JSON.stringify({version:2,lastAccess:0,wallets:{[address2]:await encryptPrivateKey(key2,nextPassword)}});let reads=0;const original=localStorage.getItem;localStorage.getItem=(k:string)=>{if(k===ENCRYPTED_WALLET_STORAGE_KEY&&++reads===3)data.set(k,other);return original(k);};try{await expect(storePrivateKey(address1,key1,password)).rejects.toThrow('vừa thay đổi');expect(data.get(ENCRYPTED_WALLET_STORAGE_KEY)).toBe(other);}finally{localStorage.getItem=original;}});
});
