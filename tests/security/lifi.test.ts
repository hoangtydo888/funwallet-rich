import {describe,it,expect} from 'bun:test';
import {validateLifiIntent,validateLifiRequest,type LifiIntent} from '../../src/lib/lifiValidation';
const account='0x'+'1'.repeat(40),router='0x'+'2'.repeat(40),token='0x'+'3'.repeat(40),native='0x'+'0'.repeat(40);
const intent:LifiIntent={account,fromChainId:56,toChainId:1,fromToken:native,toToken:token,amount:'1500000000000000001',slippage:0.5,quotedAt:10000};
const step={action:{fromAddress:account,toAddress:account,fromChainId:56,toChainId:1,fromToken:{address:native},toToken:{address:token},fromAmount:intent.amount,slippage:0.005}};
const req={to:router,from:account,chainId:56,data:'0x1234',value:intent.amount};
describe('LI.FI intent binding',()=>{
 it('preserves exact native value',()=>{expect(()=>validateLifiIntent(step,intent,10000)).not.toThrow();expect(validateLifiRequest(req,intent).value).toBe(1500000000000000001n);});
 it('rejects stale quote or destination/amount/token changes',()=>{expect(()=>validateLifiIntent(step,intent,70001)).toThrow();for(const a of [{toAddress:router},{fromAmount:'1'},{fromToken:{address:token}},{slippage:0.1},{toChainId:137}])expect(()=>validateLifiIntent({action:{...step.action,...a}},intent,10000)).toThrow();});
 it('rejects other sender, wrong chain and undisclosed native spend',()=>{for(const patch of [{from:router},{chainId:1},{value:'1500000000000000002'},{data:'0xnothex'}])expect(()=>validateLifiRequest({...req,...patch},intent)).toThrow();expect(()=>validateLifiRequest(req,{...intent,fromToken:token})).toThrow();});
});
