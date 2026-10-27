import {Interface,isAddress,ZeroAddress,formatUnits,type Provider,type Signer,type TransactionRequest} from 'ethers';
const erc20=new Interface(['function allowance(address,address) view returns(uint256)','function approve(address,uint256) returns(bool)','function decimals() view returns(uint8)','function symbol() view returns(string)']);
export interface ApprovalSnapshot {account:string;chainId:number;token:string;spender:string;allowance:string;decimals:number;symbol:string;queriedAt:number;}
export interface RevocationPlan {snapshot:ApprovalSnapshot;request:TransactionRequest;maximumFee:string;createdAt:number;}
function normalized(value:string){if(!isAddress(value)||value.toLowerCase()===ZeroAddress)throw Error('Cần địa chỉ EVM hợp lệ, khác địa chỉ 0');return value.toLowerCase();}
async function network(provider:Provider,chainId:number){if(!Number.isSafeInteger(chainId)||chainId<=0||(await provider.getNetwork()).chainId!==BigInt(chainId))throw Error('RPC đang trả sai mạng');}
export async function readTokenApproval(provider:Provider,account:string,chainId:number,token:string,spender:string,now=Date.now()):Promise<ApprovalSnapshot>{
 account=normalized(account);token=normalized(token);spender=normalized(spender);await network(provider,chainId);
 if(await provider.getCode(token)==='0x')throw Error('Địa chỉ token chưa có hợp đồng trên mạng này');
 const [rawAllowance,rawDecimals,rawSymbol]=await Promise.all([
  provider.call({to:token,data:erc20.encodeFunctionData('allowance',[account,spender])}),
  provider.call({to:token,data:erc20.encodeFunctionData('decimals',[])}),
  provider.call({to:token,data:erc20.encodeFunctionData('symbol',[])}).catch(()=>null),
 ]);
 const allowance=erc20.decodeFunctionResult('allowance',rawAllowance)[0] as bigint;
 const decimals=erc20.decodeFunctionResult('decimals',rawDecimals)[0] as bigint;
 if(decimals>36n)throw Error('Token có số chữ số thập phân chưa được hỗ trợ');
 let symbol='ERC20';try{symbol=String(erc20.decodeFunctionResult('symbol',rawSymbol!)[0]).replace(/[\u0000-\u001f\u007f]/g,'').slice(0,24)||'ERC20';}catch{/* Metadata is optional, contract address remains authoritative. */}
 return {account,chainId,token,spender,allowance:allowance.toString(),decimals:parseInt(decimals.toString(),10),symbol,queriedAt:now};
}
export const displayAllowance=(snapshot:ApprovalSnapshot)=>formatUnits(snapshot.allowance,snapshot.decimals);
export async function prepareRevocation(provider:Provider,snapshot:ApprovalSnapshot,now=Date.now()):Promise<RevocationPlan>{
 if(now<snapshot.queriedAt||now-snapshot.queriedAt>60000)throw Error('Kết quả kiểm tra đã hết hạn; kiểm tra lại quyền token');
 const fresh=await readTokenApproval(provider,snapshot.account,snapshot.chainId,snapshot.token,snapshot.spender,now);
 if(fresh.allowance!==snapshot.allowance||fresh.decimals!==snapshot.decimals)throw Error('Quyền token đã thay đổi; kiểm tra lại trước khi thu hồi');
 if(BigInt(fresh.allowance)===0n)throw Error('Quyền này đã bằng 0, không cần gửi giao dịch');
 const request:TransactionRequest={from:fresh.account,to:fresh.token,chainId:fresh.chainId,value:0n,data:erc20.encodeFunctionData('approve',[fresh.spender,0n])};
 const result=await provider.call(request);
 if(result!=='0x'&&!erc20.decodeFunctionResult('approve',result)[0])throw Error('Hợp đồng từ chối thu hồi quyền');
 const gas=(await provider.estimateGas(request))*120n/100n,fees=await provider.getFeeData();
 let price:bigint;
 if(fees.maxFeePerGas!=null&&fees.maxPriorityFeePerGas!=null){price=fees.maxFeePerGas;request.maxFeePerGas=price;request.maxPriorityFeePerGas=fees.maxPriorityFeePerGas;request.type=2;}
 else if(fees.gasPrice!=null){price=fees.gasPrice;request.gasPrice=price;request.type=0;}else throw Error('Chưa lấy được phí mạng');
 if(gas<=0n||price<=0n)throw Error('Phí mạng không hợp lệ');
 request.gasLimit=gas;
 return {snapshot:fresh,request,maximumFee:(gas*price).toString(),createdAt:now};
}
export async function submitRevocation(provider:Provider,signer:Signer,plan:RevocationPlan,now=Date.now(),beforeSign:()=>void=()=>{}):Promise<string>{
 if(now<plan.createdAt||now-plan.createdAt>60000)throw Error('Màn xác nhận đã hết hạn; chuẩn bị lại giao dịch');
 if((await signer.getAddress()).toLowerCase()!==plan.snapshot.account)throw Error('Ví đang ký không khớp ví đã kiểm tra');
 const fresh=await prepareRevocation(provider,plan.snapshot,now);
 // Derive calldata again; never execute a modified request from UI/storage.
 if(plan.request.to!==fresh.request.to||plan.request.from!==fresh.request.from||plan.request.data!==fresh.request.data||BigInt(plan.request.value??0)!==0n||BigInt(plan.request.chainId??0)!==BigInt(fresh.snapshot.chainId))throw Error('Thông tin xác nhận không khớp');
 if(BigInt(fresh.maximumFee)>BigInt(plan.maximumFee))throw Error('Phí mạng tăng; hãy xem lại phí trước khi ký');
 beforeSign();
 const tx=await signer.sendTransaction(fresh.request);return tx.hash;
}
