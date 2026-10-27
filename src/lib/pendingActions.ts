import { type Provider, type TransactionRequest } from 'ethers';
import type { PendingWalletTransaction } from './transactionQueue';
export interface ReplacementPlan {
  originalHash:string; account:string; chainId:number; kind:'speedup'|'cancel';
  request:TransactionRequest; maximumFee:string; preparedAt:number;
}
const bump=(fee:bigint)=> (fee*125n+99n)/100n+1n;
const max=(a:bigint,b:bigint)=>a>b?a:b;
export async function prepareReplacement(provider:Provider,hash:string,account:string,chainId:number,kind:'speedup'|'cancel',now=Date.now()):Promise<ReplacementPlan> {
  if(!/^0x[a-f0-9]{64}$/i.test(hash)||(await provider.getNetwork()).chainId!==BigInt(chainId))throw Error('Sai mã giao dịch hoặc mạng RPC');
  if(await provider.getTransactionReceipt(hash))throw Error('Giao dịch gốc đã được xử lý; không thể thay thế');
  const tx=await provider.getTransaction(hash);
  if(!tx||tx.blockNumber!==null||![0,1,2].includes(tx.type)||tx.from.toLowerCase()!==account.toLowerCase()||tx.chainId!==BigInt(chainId)||!tx.to)throw Error('Không tìm thấy giao dịch chờ của đúng ví trên mạng này');
  if(kind==='cancel'&&await provider.getCode(account)!=='0x')throw Error('Chưa hỗ trợ hủy tự gửi cho tài khoản có mã hợp đồng');
  const fees=await provider.getFeeData();
  const request:TransactionRequest={chainId,nonce:tx.nonce,to:kind==='cancel'?account:tx.to,value:kind==='cancel'?0n:tx.value,data:kind==='cancel'?'0x':tx.data,gasLimit:kind==='cancel'?21000n:tx.gasLimit};
  let cap:bigint;
  if(tx.maxFeePerGas!==null&&tx.maxPriorityFeePerGas!==null) {
    request.type=2;
    request.maxPriorityFeePerGas=max(bump(tx.maxPriorityFeePerGas),fees.maxPriorityFeePerGas??0n);
    request.maxFeePerGas=max(max(bump(tx.maxFeePerGas),fees.maxFeePerGas??0n),BigInt(request.maxPriorityFeePerGas));
    cap=BigInt(request.maxFeePerGas);
  } else {
    if(tx.gasPrice===null)throw Error('Chưa đọc được phí giao dịch gốc');
    request.type=tx.type===1?1:0;if(tx.type===1&&kind==='speedup')request.accessList=tx.accessList??[];request.gasPrice=max(bump(tx.gasPrice),fees.gasPrice??0n);cap=BigInt(request.gasPrice);
  }
  return {originalHash:hash.toLowerCase(),account:account.toLowerCase(),chainId,kind,request,maximumFee:(BigInt(request.gasLimit!)*cap).toString(),preparedAt:now};
}
export async function validateReplacement(provider:Provider,plan:ReplacementPlan,account:string,now=Date.now()):Promise<void> {
  if(account.toLowerCase()!==plan.account||now<plan.preparedAt||now-plan.preparedAt>60000)throw Error('Bản xem trước đã hết hạn hoặc đã đổi ví; lấy lại phí');
  const current=await prepareReplacement(provider,plan.originalHash,account,plan.chainId,plan.kind,now);
  for(const field of ['nonce','to','value','data','gasLimit','chainId'] as const) {
    if(String(current.request[field]).toLowerCase()!==String(plan.request[field]).toLowerCase())throw Error('Thông tin giao dịch thay thế không khớp');
  }
  const plannedFee=BigInt(plan.request.maxFeePerGas??plan.request.gasPrice??0);
  const requiredFee=BigInt(current.request.maxFeePerGas??current.request.gasPrice??0);
  if(plannedFee<requiredFee)throw Error('Phí mạng đã tăng; hãy lấy bản xem trước mới');
}
export async function refreshPending(provider:Provider,record:PendingWalletTransaction):Promise<PendingWalletTransaction> {
  if((await provider.getNetwork()).chainId!==BigInt(record.chainId))throw Error('RPC đang trả về sai mạng');
  const receipt=await provider.getTransactionReceipt(record.hash);
  if(receipt)return {...record,status:receipt.status===1?'confirmed':'failed'};
  const tx=await provider.getTransaction(record.hash);
  if(tx)return {...record,status:'pending'};
  const latest=await provider.getTransactionCount(record.account,'latest');
  return latest>record.nonce?{...record,status:'replaced'}:record;
}
