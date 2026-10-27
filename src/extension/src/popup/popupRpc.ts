/** Finite UI wait; never log password-bearing payloads. */
export async function popupRpc<T>(type:string,payload?:Record<string,unknown>,timeoutMs=12000):Promise<T>{
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{
  const response=await Promise.race([Promise.resolve().then(()=>chrome.runtime.sendMessage({type,payload})),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Object.assign(Error('FUN Wallet chưa phản hồi. Mở lại tiện ích hoặc tải lại trang rồi thử lại.'),{code:4900})),timeoutMs);})]);
  if(!response?.success)throw Object.assign(Error(response?.error||'Không liên lạc được với FUN Wallet'),{code:response?.code??4900});
  return response.data as T;
 }finally{clearTimeout(timer);}
}
