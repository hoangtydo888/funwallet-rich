import { Wallet } from 'ethers';
import { decryptPrivateKey, getEncryptedKey, migrateToEncryptedStorage,hasLegacyKeys } from './keyEncryption';
function legacyKey(address:string):string|null {
  const normalized=address.toLowerCase();
  try {
    const keys=JSON.parse(localStorage.getItem('fun_wallet_pk')??'{}');
    const found=Object.keys(keys).find(key=>key.toLowerCase()===normalized);
    if(found&&typeof keys[found]==='string')return keys[found];
  }catch{/* A separate older restore key may still exist. */}
  for(let i=0;i<(localStorage.length??0);i++){
    const name=localStorage.key(i);
    if(name?.toLowerCase()===`pk_${normalized}`)return localStorage.getItem(name);
  }
  return null;
}
export type DappKeyState='missing'|'legacy'|'locked'|'ready'|'damaged';
export function dappKeyReadiness(address:string,unlocked:boolean):{state:DappKeyState;message:string;canPair:boolean}{
 try{
  if(getEncryptedKey(address))return unlocked?{state:'ready',message:'Ví đã có khóa mã hóa và đang mở khóa trên thiết bị này.',canPair:true}:{state:'locked',message:'Khóa ví đã có trên thiết bị. Mở khóa bằng mật khẩu ví để kết nối.',canPair:false};
  if(legacyKey(address))return {state:'legacy',message:'Thiết bị có khóa ví cũ cần chuyển sang kho mã hóa trước khi kết nối.',canPair:false};
  return {state:'missing',message:'Ví chỉ xem: chưa có khóa ký trên thiết bị này. Khôi phục bản sao lưu của đúng địa chỉ ví, hoặc chọn tài khoản đã có khóa.',canPair:false};
 }catch{return {state:'damaged',message:'Không đọc được kho khóa trên thiết bị. Giữ nguyên dữ liệu hiện có và dùng bản sao lưu để khôi phục.',canPair:false};}
}
export const hasLocalDappKey=(address:string)=>['ready','locked','legacy'].includes(dappKeyReadiness(address,false).state);
// Called only after the user submits their password in the wallet's own UI.
// All signing paths now use the encrypted vault; no plaintext fallback.
export async function protectDappKey(address:string,password:string) {
  if (hasLegacyKeys()) await migrateToEncryptedStorage('fun_wallet_pk',password);
  const existing=getEncryptedKey(address);
  if(!existing)throw Error('Ví chưa có khóa trên thiết bị này; hãy tự import ví trước');
  const wallet=new Wallet(await decryptPrivateKey(existing,password));
  if(wallet.address.toLowerCase()!==address.toLowerCase())throw Error('Khóa không khớp địa chỉ ví');
}
