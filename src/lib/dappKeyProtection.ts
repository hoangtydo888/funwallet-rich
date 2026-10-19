import { Wallet } from 'ethers';
import { decryptPrivateKey, encryptPrivateKey, getEncryptedKey, getSecureStorage, saveEncryptedKey } from './keyEncryption';
function legacyKey(address:string):string|null {
  try {
    const keys=JSON.parse(localStorage.getItem('fun_wallet_pk')??'{}');
    const found=Object.keys(keys).find(key=>key.toLowerCase()===address.toLowerCase());
    return found && typeof keys[found]==='string' ? keys[found] : null;
  } catch {return null;}
}
export const hasLocalDappKey=(address:string)=>Boolean(getEncryptedKey(address)||legacyKey(address));
// Called only after the user submits their password in the wallet's own UI.
// Preserve legacy storage for existing wallet features; never export a key to a DApp.
export async function protectDappKey(address:string,password:string) {
  const existing=getEncryptedKey(address);
  if(existing) {
    const wallet=new Wallet(await decryptPrivateKey(existing,password));
    if(wallet.address.toLowerCase()!==address.toLowerCase())throw Error('Khóa không khớp địa chỉ ví');
    return;
  }
  const encryptedWallets=getSecureStorage().wallets;
  const first=Object.values(encryptedWallets)[0];
  if(first) await decryptPrivateKey(first,password); // All wallets must use the same password.
  else if(password.length<12)throw Error('Hãy dùng mật khẩu ví ít nhất 12 ký tự');
  const raw=legacyKey(address);
  if(!raw)throw Error('Thiết bị này chưa có khóa của ví. Hãy nhập ví của Cha bằng chức năng Nhập ví.');
  const wallet=new Wallet(raw);
  if(wallet.address.toLowerCase()!==address.toLowerCase())throw Error('Khóa không khớp địa chỉ ví');
  const encrypted=await encryptPrivateKey(wallet.privateKey,password);
  const verified=new Wallet(await decryptPrivateKey(encrypted,password));
  if(verified.address.toLowerCase()!==address.toLowerCase())throw Error('Không xác minh được bản mã hóa');
  saveEncryptedKey(address.toLowerCase(),encrypted);
}
