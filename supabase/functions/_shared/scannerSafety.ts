/** Shared by scanners; deliberately independent of Deno so limits are testable offline. */
export class ScannerError extends Error {
  constructor(public status:number,message:string,public retryAfter?:number){super(message);}
}
export async function readBoundedJson(source:{body:ReadableStream<Uint8Array>|null},maxBytes=4096,timeoutMs=5000):Promise<unknown> {
  if(!source.body)throw new ScannerError(400,'JSON body required');
  const reader=source.body.getReader();let size=0,timedOut=false;const chunks:Uint8Array[]=[];
  let timer:ReturnType<typeof setTimeout>|undefined;
  const timeout=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{timedOut=true;reject(new ScannerError(408,'Body read timed out'));void reader.cancel().catch(()=>{});},timeoutMs);});
  try {
    for(;;){const part=await Promise.race([reader.read(),timeout]);if(timedOut)throw new ScannerError(408,'Body read timed out');if(part.done)break;
      size+=part.value.byteLength;if(size>maxBytes){void reader.cancel().catch(()=>{});throw new ScannerError(413,'Payload too large');}chunks.push(part.value);}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
    try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw new ScannerError(400,'Invalid JSON');}
  }finally{clearTimeout(timer);reader.releaseLock();}
}
export async function upstreamJson(url:string,init:RequestInit={}) {
  const response=await fetch(url,{...init,redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new ScannerError(502,'Scanner upstream unavailable');
  return await readBoundedJson(response,1024*1024,10000) as any;
}
/** Fail closed if the service-only database budget is unavailable. */
export async function requireScanBudget(client:{rpc:(name:string,args:Record<string,string>)=>PromiseLike<{data:unknown;error:unknown}>},userId:string,scope:string) {
  const {data,error}=await client.rpc('consume_wallet_scan_budget',{p_user:userId,p_scope:scope});
  if(error||typeof data!=='number'||!Number.isInteger(data)||data<0)throw new ScannerError(503,'Scanner temporarily unavailable');
  if(data>0)throw new ScannerError(429,'Scan limit reached; try later',data);
}
export function scannerFailure(error:unknown,cors:Record<string,string>) {
 const known=error instanceof ScannerError;
 return new Response(JSON.stringify({error:known?error.message:'Scanner temporarily unavailable',status:'0',result:[]}),{status:known?error.status:503,
  headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store',...(known&&error.retryAfter?{'Retry-After':String(error.retryAfter)}:{})}});
}
