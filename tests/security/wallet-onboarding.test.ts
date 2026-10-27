import {beforeEach,describe,it,expect} from 'bun:test';
import {build} from 'esbuild';
const g=globalThis as any;
const output=await build({entryPoints:['src/hooks/useWallet.ts'],bundle:true,format:'esm',platform:'node',write:false,plugins:[{name:'offline-onboarding',setup(b){
 b.onResolve({filter:/^(react|@\/)/},args=>({path:args.path,namespace:'offline'}));
 b.onLoad({filter:/.*/,namespace:'offline'},({path})=>{
  if(path==='@/lib/asyncContextGate')return {contents:'export class AsyncContextGate{setContext(c){this.c=c;}start(){return this.c;}accepts(c){return c===this.c;}}'};
  if(path==='react')return {contents:`export const useCallback=f=>f,useEffect=()=>{},useState=v=>{const c=globalThis.__onboard;return [c.state++===0&&c.existing?[c.wallet]:v,()=>{}]},useRef=v=>{const c=globalThis.__onboard;return {current:c.ref++===1&&c.existing?c.user.id:v}};`};
  if(path.includes('AuthContext'))return {contents:'export const useAuth=()=>({user:globalThis.__onboard.user});'};
  if(path.includes('WalletSecurityContext'))return {contents:`export const useWalletSecurity=()=>({getCachedPassword:()=>null,unlock:async()=>{globalThis.__onboard.events.push('unlock');return true;},getUnlockedKey:()=>null});`};
  if(path.includes('keyEncryption'))return {contents:`export const storePrivateKey=async()=>{const c=globalThis.__onboard;c.events.push('encrypted');if(c.failVault)throw Error('fixture quota');},encryptPrivateKey=()=>{},saveEncryptedKey=()=>{},getSecureStorage=()=>{},decryptVaultKeys=()=>{};`};
  if(path==='@/lib/wallet')return {contents:`const fixture=()=>({address:'0x1111111111111111111111111111111111111111',privateKey:'public-disposable-key',mnemonic:'public mnemonic fixture'});export const createNewWallet=fixture,importWalletFromMnemonic=fixture,importWalletFromPrivateKey=fixture,getAllBalances=async()=>[],getTokenBalance=async()=> '0',COMMON_TOKENS=[],formatAddress=a=>a;`};
  if(path.includes('supabase/client'))return {contents:`export const supabase={from:()=>{const c=globalThis.__onboard;return {insert(){c.events.push('metadata');return this;},select(){return this;},eq(){return this;},order:async()=>({data:[c.wallet],error:null}),single:async()=>({data:c.wallet,error:null})}}};`};
  if(path.includes('ImportTokenDialog'))return {contents:'export const loadCustomTokens=()=>[];'};
  if(path.includes('use-toast'))return {contents:'export const toast=()=>{};'};
  throw Error('Unexpected import '+path);
 });
}}]});
const {useWallet}=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));
beforeEach(()=>{g.__onboard={state:0,ref:0,existing:false,failVault:false,events:[],user:{id:'offline-user'},wallet:{id:'w1',user_id:'offline-user',address:'0x1111111111111111111111111111111111111111',chain:'bsc'}};});
describe('wallet creation/import encrypts before registration',()=>{
 for(const mode of ['createWallet','importFromMnemonic','importFromPrivateKey'])it(mode+' keeps new wallet metadata off the server if vault write fails',async()=>{g.__onboard.failVault=true;const hook=useWallet();const args=mode==='createWallet'?['fixture','public test password']:['public fixture','fixture','public test password'];expect(await hook[mode](...args)).toBeNull();expect(g.__onboard.events).toEqual(['encrypted']);});
 it('registers only after encrypted storage and successful unlock',async()=>{expect(await useWallet().createWallet('fixture','public test password')).not.toBeNull();expect(g.__onboard.events).toEqual(['encrypted','unlock','metadata']);});
 it('restores a key for an existing watch-only account without inserting duplicate metadata',async()=>{g.__onboard.existing=true;expect(await useWallet().importFromPrivateKey('public fixture','fixture','public test password')).not.toBeNull();expect(g.__onboard.events).toEqual(['encrypted','unlock']);});
});
