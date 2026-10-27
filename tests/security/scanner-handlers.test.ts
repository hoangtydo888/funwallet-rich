import {describe,it,expect} from 'bun:test';
import {build} from 'esbuild';
const g=globalThis as any;
const root=new URL('../..',import.meta.url).pathname.replace(/\/$/,'');
async function handler(name:string){
 let serve:(req:Request)=>Promise<Response>=async()=>new Response();
 g.Deno={env:{get:()=> 'offline-test'},serve:(fn:any)=>serve=fn};
 const output=await build({absWorkingDir:root,entryPoints:[`supabase/functions/${name}/index.ts`],bundle:true,format:'esm',platform:'node',write:false,plugins:[{name:'offline-scanner-boundaries',setup(b){
 b.onResolve({filter:/^(npm:|https:)/},async(args)=>{
  if(args.path.startsWith('npm:zod'))return b.resolve('zod',{resolveDir:root,kind:'import-statement'});
  return {path:args.path,namespace:'offline'};
 });
 b.onLoad({filter:/.*/,namespace:'offline'},({path})=>({contents:
 path.endsWith('/cors')?'export const corsHeaders={"Access-Control-Allow-Origin":"*"};':
 path.includes('supabase-js')?`export const createClient=()=>({auth:{getClaims:async()=>globalThis.__scanTest.claims},rpc:async(name,args)=>{globalThis.__scanTest.budgets.push({name,args});return globalThis.__scanTest.budget;}});`:
 path.includes('ethers')?`export const ethers={isAddress:a=>typeof a==='string'&&/^0x[\\da-f]{40}$/i.test(a),FetchRequest:class{constructor(url){this.url=url;}},JsonRpcProvider:class{constructor(request){globalThis.__scanTest.rpcUrls.push(request.url);}async getNetwork(){return {chainId:137n};}destroy(){}},Contract:class{async balanceOf(){return 0n;}async decimals(){return 18n;}},formatUnits:()=> '0'};`:
 'export const serve=fn=>globalThis.Deno.serve(fn);'}));
 }}]});
 await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));
 return (req:Request)=>serve(req);
}
const address='0x'+'1'.repeat(40),uid='00000000-0000-0000-0000-000000000001';
describe('actual scanner handlers with offline auth/RPC stubs',()=>{
 for(const name of ['token-scanner','nft-scanner','bscscan-proxy'])it(name+' enforces method, real user identity, durable quota and actual byte limit',async()=>{
  g.__scanTest={claims:{data:{claims:{sub:uid,role:'authenticated'}},error:null},budget:{data:0,error:null},budgets:[],rpcUrls:[]};
  const run=await handler(name);const request=(body:string,auth='Bearer offline')=>new Request('https://scanner.test',{method:'POST',headers:{Authorization:auth},body});
  expect((await run(new Request('https://scanner.test'))).status).toBe(405);
  expect((await run(new Request('https://scanner.test',{method:'OPTIONS'}))).status).toBe(200);
  expect((await run(request('{}',''))).status).toBe(401);expect(g.__scanTest.budgets).toHaveLength(0);
  g.__scanTest.claims.data.claims.role='anon';expect((await run(request('{}'))).status).toBe(401);g.__scanTest.claims.data.claims.role='authenticated';
  g.__scanTest.budget={data:60,error:null};const limited=await run(request('{}'));expect(limited.status).toBe(429);expect(limited.headers.get('Retry-After')).toBe('60');expect(g.__scanTest.budgets[0].args).toEqual({p_user:uid,p_scope:name});expect(g.__scanTest.rpcUrls).toHaveLength(0);
  g.__scanTest.budget={data:null,error:Error('db down')};expect((await run(request('{}'))).status).toBe(503);
  g.__scanTest.budget={data:0,error:null};expect((await run(request(JSON.stringify({oversized:'x'.repeat(5000)})))).status).toBe(413);expect((await run(request('{invalid'))).status).toBe(400);
  if(name==='token-scanner'){
   const result=await run(request(JSON.stringify({address,chainId:137,rpcUrl:'http://127.0.0.1/secret',userId:'attacker'})));
   expect(result.status).toBe(200);expect(g.__scanTest.rpcUrls).toEqual(['https://polygon-rpc.com']);expect(g.__scanTest.budgets.at(-1).args.p_user).toBe(uid);
  }
 });
});
