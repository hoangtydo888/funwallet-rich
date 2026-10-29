import { withVaultWriteLock } from './vaultWriteLock';
import { Wallet } from 'ethers';
import { getSecureStorage, decryptVaultKeys, encryptPrivateKey, decryptPrivateKey, ENCRYPTED_WALLET_STORAGE_KEY, type SecureWalletStorage } from './keyEncryption';
export function exportEncryptedVault():string {
  const vault=getSecureStorage();
  if(!Object.keys(vault.wallets).length)throw Error('Chưa có khóa mã hóa để sao lưu');
  return JSON.stringify({format:'FUN_WALLET_ENCRYPTED_VAULT',version:1,exportedAt:new Date().toISOString(),vault},null,2);
}
/** Verify every imported key and stage a complete merge. Never replace a local
 * key vault with unverified JSON or send the backup/password to a server. */
async function restoreEncryptedVaultUnlocked(text:string,backupPassword:string,vaultPassword:string):Promise<number> {
  if(text.length>2_000_000||vaultPassword.length<12)throw Error('Tệp quá lớn hoặc mật khẩu ví mới cần ít nhất 12 ký tự');
  const parsed=JSON.parse(text);
  if(parsed?.format!=='FUN_WALLET_ENCRYPTED_VAULT'||parsed.version!==1||!parsed.vault?.wallets||typeof parsed.vault.wallets!=='object'||Array.isArray(parsed.vault.wallets))throw Error('Không phải bản sao lưu FUN Wallet được hỗ trợ');
  const entries=Object.entries(parsed.vault.wallets);
  if(!entries.length||entries.length>50)throw Error('Bản sao lưu chỉ hỗ trợ từ 1 đến 50 tài khoản mỗi tệp');
  const before=localStorage.getItem(ENCRYPTED_WALLET_STORAGE_KEY);
  const current=getSecureStorage();
  if(Object.keys(current.wallets).length)await decryptVaultKeys(vaultPassword,current);
  const staged:SecureWalletStorage={version:2,wallets:{...current.wallets},lastAccess:Date.now()};
  for(const [address,data] of entries) {
    if(!/^0x[a-f0-9]{40}$/i.test(address))throw Error('Địa chỉ trong tệp không hợp lệ');
    const key=await decryptPrivateKey(data as never,backupPassword);
    if(new Wallet(key).address.toLowerCase()!==address.toLowerCase())throw Error('Khóa sao lưu không khớp địa chỉ');
    staged.wallets[address.toLowerCase()]=await encryptPrivateKey(key,vaultPassword);
  }
  if(localStorage.getItem(ENCRYPTED_WALLET_STORAGE_KEY)!==before)throw Error('Kho khóa vừa thay đổi; thử lại');
  localStorage.setItem(ENCRYPTED_WALLET_STORAGE_KEY,JSON.stringify(staged));
  return entries.length;
}

export const restoreEncryptedVault=(text:string,backupPassword:string,vaultPassword:string)=>withVaultWriteLock(()=>restoreEncryptedVaultUnlocked(text,backupPassword,vaultPassword));

/** Forgotten password: nobody can decrypt the old vault, so it is replaced by
 * the one key the user proved with its recovery phrase or private key. */
async function resetVaultPasswordUnlocked(privateKey:string,newPassword:string):Promise<string> {
  const before=localStorage.getItem(ENCRYPTED_WALLET_STORAGE_KEY);
  const current=getSecureStorage();
  const encrypted=await encryptPrivateKey(privateKey,newPassword);
  const address=encrypted.address!;
  if(!current.wallets[address])throw Error('Khóa này không thuộc ví nào đã lưu trên thiết bị');
  if(await decryptPrivateKey(encrypted,newPassword)!==new Wallet(privateKey).privateKey)throw Error('Không xác minh được bản mã');
  if(localStorage.getItem(ENCRYPTED_WALLET_STORAGE_KEY)!==before)throw Error('Kho khóa vừa thay đổi; thử lại');
  localStorage.setItem(ENCRYPTED_WALLET_STORAGE_KEY,JSON.stringify({version:2,wallets:{[address]:encrypted},lastAccess:Date.now()}));
  return address;
}

export const resetVaultPassword=(privateKey:string,newPassword:string)=>withVaultWriteLock(()=>resetVaultPasswordUnlocked(privateKey,newPassword));
