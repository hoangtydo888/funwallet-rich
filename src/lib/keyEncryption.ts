import { withVaultWriteLock } from './vaultWriteLock';
import { Wallet } from 'ethers';

export interface EncryptedKeyData {
  encryptedKey: string; iv: string; salt: string; version: number; createdAt: number;
  address?: string;
  kind?: "mnemonic";
}
export interface SecureWalletStorage {
  version: number; wallets: Record<string, EncryptedKeyData>; lastAccess: number;
}
export const ENCRYPTION_CONFIG = {
  algorithm: 'AES-GCM' as const, keyLength: 256, ivLength: 12, saltLength: 16,
  pbkdf2Iterations: 600000, hash: 'SHA-256' as const, version: 2,
};
export const ENCRYPTED_WALLET_STORAGE_KEY = 'fun_wallet_encrypted_v2';
export const MIN_WALLET_PASSWORD_LENGTH = 12;
const legacyIterations = 100000;
function encode(bytes: Uint8Array): string {
  let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
function decode(value: string, max: number): Uint8Array {
  if (typeof value !== 'string' || value.length > max * 2 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) throw Error('Bản mã không hợp lệ');
  const binary = atob(value); if (binary.length > max) throw Error('Bản mã quá lớn');
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}
function validate(data: EncryptedKeyData) {
  if (!data || ![1,2].includes(data.version)) throw Error('Phiên bản bản mã không hỗ trợ');
  if (decode(data.iv,12).length !== 12 || decode(data.salt,16).length !== 16 || decode(data.encryptedKey,256).length < 16) throw Error('Bản mã không hợp lệ');
  if (data.version === 2 && !/^0x[a-f0-9]{40}$/.test(data.address ?? '')) throw Error('Thiếu địa chỉ gắn với bản mã');
}
async function derive(password: string, salt: Uint8Array, version: number) {
  const material = await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({ name:'PBKDF2',salt:salt as BufferSource,iterations:version === 1 ? legacyIterations : ENCRYPTION_CONFIG.pbkdf2Iterations,hash:'SHA-256' },material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
const aad = (address: string,kind?:string) => new TextEncoder().encode(`${kind === 'mnemonic' ? 'FUN_WALLET_MNEMONIC_V2' : 'FUN_WALLET_KEY_V2'}:${address}`);
export async function encryptPrivateKey(privateKey: string,password: string): Promise<EncryptedKeyData> {
  if (!/^(0x)?[a-f0-9]{64}$/i.test(privateKey)) throw Error('Khóa riêng không hợp lệ');
  if (password.length < MIN_WALLET_PASSWORD_LENGTH) throw Error('Mật khẩu mới cần ít nhất 12 ký tự');
  const wallet = new Wallet(`0x${privateKey.replace(/^0x/i,'')}`);
  const address = wallet.address.toLowerCase();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await derive(password,salt,2);
  const ciphertext = await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad(address)},key,new TextEncoder().encode(wallet.privateKey));
  return { encryptedKey:encode(new Uint8Array(ciphertext)),iv:encode(iv),salt:encode(salt),version:2,createdAt:Date.now(),address };
}
async function decryptText(data:EncryptedKeyData,password:string):Promise<string> {
  try {
    validate(data);
    const key=await derive(password,decode(data.salt,16),data.version);
    const plaintext=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(data.iv,12) as BufferSource,
      ...(data.version===2?{additionalData:aad(data.address!,data.kind)}:{})},key,decode(data.encryptedKey,256) as BufferSource);
    return new TextDecoder().decode(plaintext);
  } catch {throw Error('Mật khẩu không đúng hoặc dữ liệu bị hỏng');}
}
export async function decryptPrivateKey(data:EncryptedKeyData,password:string):Promise<string> {
  if(data?.kind==='mnemonic')throw Error('Bản mã recovery phrase không phải khóa riêng');
  const wallet=new Wallet(await decryptText(data,password));
  if(data.version===2&&wallet.address.toLowerCase()!==data.address)throw Error('Khóa không khớp địa chỉ');
  return wallet.privateKey;
}
export async function encryptRecoveryPhrase(phrase:string,password:string):Promise<EncryptedKeyData> {
  if(password.length<12)throw Error('Mật khẩu mới cần ít nhất 12 ký tự');
  const wallet=Wallet.fromPhrase(phrase.trim().replace(/\s+/g,' '));
  const normalized=wallet.mnemonic!.phrase,address=wallet.address.toLowerCase();
  const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
  const key=await derive(password,salt,2);
  const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad(address,'mnemonic')},key,new TextEncoder().encode(normalized));
  return {encryptedKey:encode(new Uint8Array(encrypted)),salt:encode(salt),iv:encode(iv),version:2,address,kind:'mnemonic',createdAt:Date.now()};
}
export async function decryptRecoveryPhrase(data:EncryptedKeyData,password:string,expectedAddress?:string):Promise<string> {
  if(data.version===2&&data.kind!=='mnemonic')throw Error('Không phải bản mã recovery phrase');
  const phrase=await decryptText(data,password),wallet=Wallet.fromPhrase(phrase);
  const expected=expectedAddress?.toLowerCase()??data.address;
  if(expected&&wallet.address.toLowerCase()!==expected)throw Error('Recovery phrase không khớp địa chỉ');
  return wallet.mnemonic!.phrase;
}
export async function verifyPassword(data: EncryptedKeyData,password: string): Promise<boolean> {
  try { await decryptPrivateKey(data,password); return true; } catch { return false; }
}
export function getSecureStorage(): SecureWalletStorage {
  const raw = localStorage.getItem(ENCRYPTED_WALLET_STORAGE_KEY);
  if (!raw) return {version:2,wallets:{},lastAccess:Date.now()};
  if (raw.length > 2_000_000) throw Error('Kho khóa quá lớn');
  let parsed; try { parsed=JSON.parse(raw); } catch { throw Error("Kho khóa bị hỏng; không ghi đè dữ liệu"); }
  if (!parsed || !parsed.wallets || typeof parsed.wallets !== 'object' || Array.isArray(parsed.wallets) || ![1,2].includes(parsed.version)) throw Error('Kho khóa bị hỏng; không ghi đè dữ liệu');
  const wallets: Record<string,EncryptedKeyData> = {};
  for (const [address,data] of Object.entries(parsed.wallets)) {
    if (!/^0x[a-f0-9]{40}$/i.test(address)) throw Error('Địa chỉ kho khóa không hợp lệ');
    validate(data as EncryptedKeyData);
    const normalized = address.toLowerCase();
    if (wallets[normalized]) throw Error('Trùng địa chỉ kho khóa');
    wallets[normalized] = data as EncryptedKeyData;
  }
  return {version:parsed.version,wallets,lastAccess:parsed.lastAccess};
}
export function getEncryptedKey(address: string): EncryptedKeyData | null { return getSecureStorage().wallets[address.toLowerCase()] ?? null; }
export function hasEncryptedKey(address: string): boolean { return !!getEncryptedKey(address); }
export function saveEncryptedKey(address: string,data: EncryptedKeyData): void {
  validate(data); const normalized = address.toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(normalized) || (data.version === 2 && data.address !== normalized)) throw Error('Khóa không khớp địa chỉ');
  const storage = getSecureStorage();
  storage.wallets[normalized] = data; storage.lastAccess = Date.now();
  localStorage.setItem(ENCRYPTED_WALLET_STORAGE_KEY,JSON.stringify(storage));
}
export function removeEncryptedKey(address: string): void {
  const storage = getSecureStorage(); delete storage.wallets[address.toLowerCase()];
  localStorage.setItem(ENCRYPTED_WALLET_STORAGE_KEY,JSON.stringify(storage));
}
export async function decryptVaultKeys(password: string,storage = getSecureStorage()): Promise<Record<string,string>> {
  const keys: Record<string,string> = {};
  for (const [address,data] of Object.entries(storage.wallets)) {
    const key = await decryptPrivateKey(data,password);
    if (new Wallet(key).address.toLowerCase() !== address.toLowerCase()) throw Error('Khóa không khớp địa chỉ');
    keys[address.toLowerCase()] = key;
  }
  return keys;
}
export function legacyVaultSnapshot() {
  const snapshots:Record<string,string> = {};
  const keys:Record<string,string> = {};
  const raw=localStorage.getItem('fun_wallet_pk');
  if(raw) {
    snapshots.fun_wallet_pk=raw;
    let parsed;try{parsed=JSON.parse(raw);}catch{throw Error('Kho khóa cũ bị hỏng');}
    if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error('Kho khóa cũ bị hỏng');
    for(const [address,key] of Object.entries(parsed)) {
      if(typeof key!=='string'||!/^(0x)?[a-f0-9]{64}$/i.test(key)||new Wallet(key).address.toLowerCase()!==address.toLowerCase())throw Error('Khóa cũ không khớp địa chỉ');
      keys[address.toLowerCase()]=key;
    }
  }
  for(let i=0;i<(localStorage.length??0);i++) {
    const name=localStorage.key(i);
    if(!name||!/^pk_0x[a-f0-9]{40}$/i.test(name))continue;
    const key=localStorage.getItem(name)!;
    const address=name.slice(3).toLowerCase();
    if(!/^(0x)?[a-f0-9]{64}$/i.test(key)||new Wallet(key).address.toLowerCase()!==address)throw Error('Khóa sao lưu cũ không khớp địa chỉ');
    snapshots[name]=key;keys[address]=key;
  }
  return {snapshots,keys};
}
export function hasLegacyKeys():boolean {
  if(localStorage.getItem('fun_wallet_pk'))return true;
  for(let i=0;i<(localStorage.length??0);i++)if(/^pk_0x[a-f0-9]{40}$/i.test(localStorage.key(i)??''))return true;
  return false;
}
function unchangedLegacy(snapshots:Record<string,string>) {
  return Object.entries(snapshots).every(([name,value])=>localStorage.getItem(name)===value);
}
export async function storePrivateKey(address:string,key:string,password:string):Promise<void> {
  return withVaultWriteLock(async()=>{
    const before=localStorage.getItem(ENCRYPTED_WALLET_STORAGE_KEY);
    const current=getSecureStorage();
    if(Object.keys(current.wallets).length)await decryptVaultKeys(password,current);
    const encrypted=await encryptPrivateKey(key,password);
    const normalized=address.toLowerCase();
    if(encrypted.address!==normalized)throw Error('Khóa không khớp địa chỉ');
    if(localStorage.getItem(ENCRYPTED_WALLET_STORAGE_KEY)!==before)throw Error('Kho khóa vừa thay đổi ở tab khác; thử lại');
    localStorage.setItem(ENCRYPTED_WALLET_STORAGE_KEY,JSON.stringify({version:2,wallets:{...current.wallets,[normalized]:encrypted},lastAccess:Date.now()}));
  });
}
export const changeVaultPassword=(oldPassword:string,newPassword:string)=>withVaultWriteLock(()=>changeVaultPasswordUnlocked(oldPassword,newPassword));
export const migrateToEncryptedStorage=(oldStorageKey:string,password:string)=>withVaultWriteLock(()=>migrateToEncryptedStorageUnlocked(oldStorageKey,password));
/** Stage every key and verify round trips before ONE storage write. A failed
 * decrypt/encrypt or concurrent tab edit leaves the original vault intact. */
async function changeVaultPasswordUnlocked(oldPassword: string,newPassword: string): Promise<void> {
  if (newPassword.length < MIN_WALLET_PASSWORD_LENGTH) throw Error('Mật khẩu mới cần ít nhất 12 ký tự');
  const before = localStorage.getItem(ENCRYPTED_WALLET_STORAGE_KEY);
  const storage = getSecureStorage(); const keys = await decryptVaultKeys(oldPassword,storage);
  const legacy=legacyVaultSnapshot();
  Object.assign(keys,legacy.keys);
  if (!Object.keys(keys).length) throw Error('Chưa có khóa được bảo vệ');
  const staged: SecureWalletStorage = {version:2,wallets:{},lastAccess:Date.now()};
  for (const [address,key] of Object.entries(keys)) {
    const encrypted = await encryptPrivateKey(key,newPassword);
    if (await decryptPrivateKey(encrypted,newPassword) !== key) throw Error('Không xác minh được bản mã');
    staged.wallets[address] = encrypted;
  }
  if (localStorage.getItem(ENCRYPTED_WALLET_STORAGE_KEY) !== before || !unchangedLegacy(legacy.snapshots)) throw Error('Kho khóa vừa thay đổi ở tab khác; thử lại');
  localStorage.setItem(ENCRYPTED_WALLET_STORAGE_KEY,JSON.stringify(staged));
  for(const name of Object.keys(legacy.snapshots))localStorage.removeItem(name);
}
/** Legacy keys are deleted only after all entries validate and the complete
 * ciphertext vault has been saved. Never silently discard malformed entries. */
async function migrateToEncryptedStorageUnlocked(oldStorageKey: string,password: string): Promise<number> {
  if(oldStorageKey!=='fun_wallet_pk')throw Error('Định dạng khóa cũ không được hỗ trợ');
  const legacy=legacyVaultSnapshot(); if(!Object.keys(legacy.keys).length)return 0;
  const before=localStorage.getItem(ENCRYPTED_WALLET_STORAGE_KEY);
  const old=legacy.keys;
  const storage = getSecureStorage();
  if (Object.keys(storage.wallets).length) await decryptVaultKeys(password,storage);
  const staged: SecureWalletStorage = {version:2,wallets:{...storage.wallets},lastAccess:Date.now()};
  let count = 0;
  for (const [address,key] of Object.entries(old)) {
    if (typeof key !== 'string' || new Wallet(key).address.toLowerCase() !== address.toLowerCase()) throw Error('Khóa cũ không khớp địa chỉ');
    const encrypted = await encryptPrivateKey(key,password);
    if (await decryptPrivateKey(encrypted,password) !== new Wallet(key).privateKey) throw Error('Không xác minh được bản mã');
    staged.wallets[address.toLowerCase()] = encrypted; count++;
  }
  if (!count) return 0;
  if (!unchangedLegacy(legacy.snapshots) || localStorage.getItem(ENCRYPTED_WALLET_STORAGE_KEY) !== before) throw Error('Kho khóa vừa thay đổi; thử lại');
  localStorage.setItem(ENCRYPTED_WALLET_STORAGE_KEY,JSON.stringify(staged));
  for(const name of Object.keys(legacy.snapshots))localStorage.removeItem(name);
  return count;
}
/** JS strings cannot be reliably zeroized; callers must drop references. */
export function secureErase(_value: string): void { /* No false claim of zeroization. */ }
export function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-z0-9]/i.test(password)) score++;
  return {score,label:['Rất yếu','Yếu','Trung bình','Mạnh','Rất mạnh'][Math.min(score,4)],color:['destructive','warning','warning','success','success'][Math.min(score,4)]};
}
