import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {dirname,resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {mkdtemp,writeFile} from 'node:fs/promises';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const output=await mkdtemp(join(tmpdir(),'fun-wallet-offline-qa-'));
await build({absWorkingDir:root,entryPoints:['tests/fixtures/wallet-controls.tsx'],outfile:join(output,'app.js'),bundle:true,format:'esm',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"development"'},alias:{'@':root+'/src'},plugins:[{name:'offline-only',setup(b){b.onResolve({filter:/contexts\/AuthContext/},()=>({path:'auth',namespace:'offline'}));b.onResolve({filter:/integrations\/supabase\/client/},()=>({path:'supabase',namespace:'offline'}));b.onLoad({filter:/.*/,namespace:'offline'},({path})=>({contents:path==='auth'?'export const useAuth=()=>({user:null});':'export const supabase={auth:{getUser:async()=>({data:{user:null}})}};'}));}}]});
await writeFile(join(output,'index.html'),'<!doctype html><html lang="vi"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FUN Wallet · offline QA</title><link rel="stylesheet" href="/style.css"><div id="root"></div><script type="module" src="/app.js"></script></html>');

const css=spawnSync(process.execPath,[resolve(root,'node_modules/tailwindcss/lib/cli.js'),'-i','src/index.css','-o',join(output,'style.css'),'--content','src/components/wallet/*.tsx,src/components/ui/*.tsx,tests/fixtures/wallet-controls.tsx'],{cwd:root,encoding:'utf8'});
if(css.status!==0)throw Error(css.stderr||'Tailwind build failed');
console.log(`Offline fixture created: ${output}`);
console.log(`Preview: python3 -m http.server 8087 --bind 127.0.0.1 --directory '${output}'`);
