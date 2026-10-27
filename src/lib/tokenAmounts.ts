import { parseUnits, formatUnits } from 'ethers';
export function exactTokenUnits(value:string,decimals:number):bigint {
  if (typeof value !== 'string' || value.length>120 || !/^(0|[1-9]\d*)(\.\d+)?$/.test(value)
      || !Number.isInteger(decimals) || decimals<0 || decimals>36 || (value.split('.')[1]?.length??0)>decimals) throw Error('Số lượng hoặc số chữ số thập phân không hợp lệ');
  const result=parseUnits(value,decimals);
  if(result<=0n||result>=2n**256n)throw Error('Số lượng phải lớn hơn 0 và nằm trong giới hạn token');
  return result;
}
export function minimumOutput(quoted:string,decimals:number,slippagePercent:number):bigint {
  if(!Number.isFinite(slippagePercent)||slippagePercent<0||slippagePercent>5)throw Error('Slippage cho phép từ 0 đến 5%; không tự tăng slippage');
  const text=slippagePercent.toString();
  if(!/^\d+(\.\d{1,2})?$/.test(text))throw Error('Slippage có tối đa 2 chữ số thập phân');
  const bps=parseUnits(text,2);
  const min=exactTokenUnits(quoted,decimals)*(10000n-bps)/10000n;
  if(min<=0n)throw Error('Số nhận tối thiểu quá nhỏ');
  return min;
}
export function maxNativeAmount(balance:string,reserve:string):string {
  const total=parseUnits(balance,18),fee=parseUnits(reserve,18);
  return formatUnits(total>fee?total-fee:0n,18);
}
export function decimalIsPositive(value:string):boolean {
  return typeof value==='string'&&/^(0|[1-9]\d*)(\.\d+)?$/.test(value)&&/[1-9]/.test(value);
}

/** Display base units without rounding through a JavaScript floating-point value. */
export function formatExactTokenValue(value:string,decimals=18):string {
 if(typeof value!=='string'||value.length>80||!/^\d+$/.test(value)||!Number.isInteger(decimals)||decimals<0||decimals>36)return '—';
 try{const raw=BigInt(value);if(raw>=1n<<256n)return '—';return formatUnits(raw,decimals);}catch{return '—';}
}
