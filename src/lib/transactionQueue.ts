import { keccak256, toUtf8Bytes } from 'ethers';
const queues = new Map<string,Promise<unknown>>();
export async function serializeBroadcast<T>(account:string,chainId:number,task:()=>Promise<T>):Promise<T> {
  const key=`fun-wallet-send:${chainId}:${account.toLowerCase()}`;
  const previous=queues.get(key)??Promise.resolve();
  const next=previous.catch(()=>undefined).then(()=>typeof navigator!=='undefined'&&navigator.locks
    ? navigator.locks.request(key,task) : task());
  queues.set(key,next);
  try { return await next; } finally { if(queues.get(key)===next)queues.delete(key); }
}
export function reserveBroadcast(account:string,chainId:number,to:string,data:string,value:bigint,now=Date.now()) {
  const key=`fun_wallet_send_guard:${chainId}:${account.toLowerCase()}`;
  const fingerprint=keccak256(toUtf8Bytes(JSON.stringify([to.toLowerCase(),data.toLowerCase(),value.toString()])));
  const raw=localStorage.getItem(key);
  const previous=raw?JSON.parse(raw):null;
  if(previous?.fingerprint===fingerprint&&Number.isFinite(previous.at)&&now-previous.at<30000)throw Error('Đã gửi yêu cầu tương tự; kiểm tra lịch sử và đợi 30 giây trước khi gửi lại');
  localStorage.setItem(key,JSON.stringify({fingerprint,at:now}));
}
export interface PendingWalletTransaction {
  hash:string; chainId:number; account:string; to:string; nonce:number; value:string;
  status:'broadcasting'|'pending'|'unknown'|'confirmed'|'failed'|'replaced'; createdAt:number;
  data:string; gasLimit:string; gasPrice?:string; maxFeePerGas?:string; maxPriorityFeePerGas?:string;
}
export const PENDING_TX_STORAGE='fun_wallet_pending_transactions_v1';
export function pendingTransactions():PendingWalletTransaction[] {
  const raw=localStorage.getItem(PENDING_TX_STORAGE);
  if(!raw)return [];
  if(raw.length>2_000_000)throw Error('Lịch sử giao dịch quá lớn');
  const rows=JSON.parse(raw);
  if(!Array.isArray(rows))throw Error('Lịch sử giao dịch bị hỏng');
  return rows.filter(row=>row&&/^0x[a-f0-9]{64}$/i.test(row.hash)&&Number.isSafeInteger(row.nonce)&&row.nonce>=0);
}
export function rememberTransaction(record:PendingWalletTransaction) {
  const rows=pendingTransactions().filter(row=>row.hash!==record.hash);
  localStorage.setItem(PENDING_TX_STORAGE,JSON.stringify([...rows,record].slice(-250)));
  if(typeof window!=='undefined')window.dispatchEvent(new Event('fun-wallet-transactions'));
}
