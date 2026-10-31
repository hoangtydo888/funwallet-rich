import { isAddress } from 'ethers';
export interface LifiIntent {account:string;fromChainId:number;toChainId:number;fromToken:string;toToken:string;amount:string;slippage:number;quotedAt:number;}
const address=(v:unknown)=>typeof v==='string'&&isAddress(v)?v.toLowerCase():null;
/** Bind an API response to the exact intent displayed to the user. */
export function validateLifiIntent(step:any,intent:LifiIntent,now=Date.now()) {
 const a=step?.action;
 if(!a||now<intent.quotedAt||now-intent.quotedAt>60000)throw Error('Báo giá đã hết hạn; hãy lấy báo giá mới');
 if(a.fromChainId!==intent.fromChainId||a.toChainId!==intent.toChainId||address(a.fromAddress)!==address(intent.account)||address(a.toAddress??a.fromAddress)!==address(intent.account)||
 address(a.fromToken?.address)!==address(intent.fromToken)||address(a.toToken?.address)!==address(intent.toToken)||a.fromAmount!==intent.amount||!(Math.abs(Number(a.slippage)-intent.slippage/100)<1e-9))throw Error('Báo giá không khớp yêu cầu chuyển đổi');
 if(!/^[0-9]+$/.test(a.fromAmount)||BigInt(a.fromAmount)<=0n)throw Error('Số lượng không hợp lệ');
}
export function validateLifiRequest(req:any,intent:LifiIntent) {
 if(!address(req?.to)||address(req.from)!==address(intent.account)||BigInt(req.chainId??0)!==BigInt(intent.fromChainId)||typeof req.data!=='string'||!/^0x(?:[0-9a-fA-F]{2})+$/.test(req.data))throw Error('Giao dịch LI.FI không hợp lệ hoặc sai mạng/tài khoản');
 const value=BigInt(req.value??0);
 if(value<0n)throw Error('Giá trị giao dịch không hợp lệ');
 // API fees in native currency must be disclosed separately before support.
 const native=/^0x0{40}$/i.test(intent.fromToken);
 if(value>(native?BigInt(intent.amount):0n))throw Error('Phí native bổ sung chưa được xác nhận; dừng giao dịch');
 return {to:req.to as string,from:intent.account,data:req.data as string,value,chainId:intent.fromChainId};
}
