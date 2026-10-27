import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const compiled=await build({entryPoints:['src/extension/src/popup/popupRpc.ts'],bundle:true,format:'esm',platform:'node',write:false});
const {popupRpc}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
test('extension UI stops waiting and gives recovery instruction when worker does not reply',async()=>{
 globalThis.chrome={runtime:{sendMessage:()=>new Promise(()=>{})}};
 await assert.rejects(popupRpc('GET_PENDING_REQUEST',{requestId:'offline'},15),e=>e.code===4900&&e.message.includes('thử lại'));
});
test('UI preserves rejection codes and does not confuse an unlock success with a connection approval',async()=>{
 globalThis.chrome={runtime:{sendMessage:async()=>({success:false,error:'User rejected',code:4001})}};
 await assert.rejects(popupRpc('APPROVE_CONNECTION'),e=>e.code===4001);
 globalThis.chrome={runtime:{sendMessage:async()=>({success:true})}};
 assert.equal(await popupRpc('UNLOCK_WALLET',{password:'public-offline-fixture'}),undefined);
});
