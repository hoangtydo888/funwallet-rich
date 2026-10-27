import {describe,it,expect} from 'bun:test';
import {readFileSync} from 'node:fs';
const source=(name:string)=>readFileSync(new URL('../../supabase/functions/'+name+'/index.ts',import.meta.url),'utf8');
describe('retired restoration services',()=>{for(const name of ['run-sql','upload-file'])it(name+' has no database/storage execution path',async()=>{let handler:()=>Response=()=>new Response();const previous=(globalThis as any).Deno;(globalThis as any).Deno={serve:(fn:()=>Response)=>handler=fn};try{await import('../../supabase/functions/'+name+'/index.ts');expect(handler().status).toBe(410);expect(source(name)).not.toContain('SERVICE_ROLE');expect(source(name)).not.toContain('queryArray');}finally{(globalThis as any).Deno=previous;}});});
