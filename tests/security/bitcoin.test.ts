import {describe,it,expect} from 'bun:test';
import * as btc from '@scure/btc-signer';
import {hex} from '@scure/base';
import {btcAccount,isValidBtcAddress,buildBtcSend,signProviderPsbt,parseBtc,type BtcUtxo} from '../../src/lib/bitcoin';
import {validateBtcSwap,EVM_SWAP_ASSETS,BTC_CHAIN_ID,type BtcSwapIntent} from '../../src/lib/btcSwap';

// Private key 1 → BIP173 reference address of the generator point.
const key='0x'+'0'.repeat(63)+'1';
const me=btcAccount(key);
const other=btcAccount('0x'+'0'.repeat(63)+'2').address;
const deposit='bc1plxa9q77gz9r33g8pd4c2ygzezchjffuedtzdrkclyceseyw8v80qasmquf';
const feeAddr='bc1qn2cstnjlvhxf60j3ujeyq0h0rqc7kklap8j94g';
const utxo=(n:number,value:number,confirmed=true):BtcUtxo=>({txid:n.toString(16).padStart(64,'0'),vout:0,value,confirmed});
const outputs=(raw:string)=>{const tx=btc.Transaction.fromRaw(hex.decode(raw));return Array.from({length:tx.outputsLength},(_,i)=>tx.getOutput(i));};
const addr=(script:Uint8Array)=>btc.Address(btc.NETWORK).encode(btc.OutScript.decode(script));

describe('BTC account',()=>{
 it('derives native SegWit from the wallet key',()=>expect(me.address).toBe('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4'));
 it('accepts only mainnet addresses',()=>{
  for(const a of [me.address,deposit,'1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2','3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy'])expect(isValidBtcAddress(a)).toBe(true);
  for(const a of ['tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx','0x'+'1'.repeat(40),'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t5',` ${me.address}`,''])expect(isValidBtcAddress(a)).toBe(false);
 });
 it('parses BTC amounts exactly',()=>{expect(parseBtc('0.00000546')).toBe(546n);expect(()=>parseBtc('0.000000001')).toThrow();});
});

describe('BTC send',()=>{
 it('pays the exact amount, returns change to self, signals RBF',()=>{
  const s=buildBtcSend({privateKey:key,to:other,amount:150_000n,feeRate:2,utxos:[utxo(1,100_000),utxo(2,200_000),utxo(3,500_000,false)]});
  const outs=outputs(s.hex);
  expect(outs.filter(o=>addr(o.script!)===other).map(o=>o.amount)).toEqual([150_000n]);
  expect(outs.every(o=>[other,me.address].includes(addr(o.script!)))).toBe(true);
  expect(Number(s.fee)/s.vsize).toBeGreaterThanOrEqual(2);expect(Number(s.fee)/s.vsize).toBeLessThan(3);
  const tx=btc.Transaction.fromRaw(hex.decode(s.hex));
  for(let i=0;i<tx.inputsLength;i++){expect(tx.getInput(i).sequence).toBe(0xfffffffd);expect(hex.encode(tx.getInput(i).txid!)).not.toBe(utxo(3,0).txid);}
 });
 it('max sends every confirmed coin minus fee, without change',()=>{
  const s=buildBtcSend({privateKey:key,to:other,amount:'max',feeRate:1,utxos:[utxo(1,100_000),utxo(2,50_000)]});
  const outs=outputs(s.hex);
  expect(outs.length).toBe(1);expect(outs[0].amount).toBe(150_000n-s.fee);expect(s.amount).toBe(150_000n-s.fee);
 });
 it('refuses dust, bad fee rates, bad recipients and missing funds',()=>{
  const base={privateKey:key,to:other,amount:10_000n as bigint|'max',feeRate:1,utxos:[utxo(1,20_000)]};
  for(const patch of [{amount:545n},{feeRate:0},{feeRate:1.5},{feeRate:501},{to:'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx'},{amount:20_000n},{utxos:[utxo(1,20_000,false)]}])expect(()=>buildBtcSend({...base,...patch})).toThrow();
 });
});

function providerPsbt(p:{inputs?:{script:Uint8Array,amount:bigint}[],outs?:[string|Uint8Array,bigint][],sighash?:number}={}) {
 const tx=new btc.Transaction({allowUnknownOutputs:true});
 for(const [i,w] of (p.inputs??[{script:me.script,amount:200_000_000n}]).entries())tx.addInput({txid:utxo(i+1,0).txid,index:0,witnessUtxo:w,...(p.sighash?{sighashType:p.sighash}:{})});
 for(const [to,amount] of p.outs??[[deposit,498_750n],[btc.Script.encode(['RETURN',new Uint8Array([1,2,3])]),0n],[me.address,199_498_284n],[feeAddr,1_250n]]) {
  if(typeof to==='string')tx.addOutputAddress(to,amount,btc.NETWORK);else tx.addOutput({script:to,amount});
 }
 return hex.encode(tx.toPSBT());
}
const expected={to:deposit,spend:500_000n,maxFeeRate:20};

describe('swap provider PSBT',()=>{
 it('signs a deposit with change, memo and disclosed fee output',()=>{
  const s=signProviderPsbt(providerPsbt(),key,expected);
  expect(s.amount).toBe(500_000n);expect(s.fee).toBe(200_000_000n-498_750n-199_498_284n-1_250n);
 });
 it('rejects extra spend, foreign inputs, burned memo, missing deposit and fee spikes',()=>{
  const bad=[
   providerPsbt({outs:[[deposit,498_750n],[me.address,199_498_284n],[feeAddr,1_250n],[other,1_000n]]}),
   providerPsbt({inputs:[{script:me.script,amount:100_000_000n},{script:btcAccount('0x'+'0'.repeat(63)+'2').script,amount:100_000_000n}]}),
   providerPsbt({outs:[[deposit,498_750n],[btc.Script.encode(['RETURN',new Uint8Array([1])]),5_000n],[me.address,199_493_284n],[feeAddr,1_250n]]}),
   providerPsbt({outs:[[other,498_750n],[me.address,199_498_284n],[feeAddr,1_250n]]}),
   providerPsbt({outs:[[deposit,498_750n],[me.address,198_000_000n],[feeAddr,1_250n]]}),
   providerPsbt({sighash:btc.SigHash.NONE}),
  ];
  for(const psbt of bad)expect(()=>signProviderPsbt(psbt,key,expected)).toThrow();
  expect(()=>signProviderPsbt(providerPsbt(),key,{...expected,spend:499_999n})).toThrow();
  expect(()=>signProviderPsbt('70736274zz',key,expected)).toThrow();
 });
});

describe('BTC swap quote binding',()=>{
 const evm='0x'+'1'.repeat(40),usdt=EVM_SWAP_ASSETS[0];
 const sell:BtcSwapIntent={side:'sell',btcAddress:me.address,evmAddress:evm,asset:usdt,amount:'500000',slippage:0.5,quotedAt:10_000};
 const sellStep={action:{fromChainId:BTC_CHAIN_ID,toChainId:56,fromToken:{address:'bitcoin'},toToken:{address:usdt.token},fromAddress:me.address,toAddress:evm,fromAmount:'500000',slippage:0.005},estimate:{toAmountMin:'397596530000000000000'},transactionRequest:{to:deposit,value:'500000',data:'70736274ff'}};
 const buy:BtcSwapIntent={...sell,side:'buy',amount:'300000000000000000000'};
 const buyStep={action:{fromChainId:56,toChainId:BTC_CHAIN_ID,fromToken:{address:usdt.token.toLowerCase()},toToken:{address:'bitcoin'},fromAddress:evm,toAddress:me.address,fromAmount:buy.amount,slippage:0.005},estimate:{toAmountMin:'369533'}};
 it('accepts quotes that match both own addresses and the amount',()=>{expect(()=>validateBtcSwap(sellStep,sell,10_000)).not.toThrow();expect(()=>validateBtcSwap(buyStep,buy,10_000)).not.toThrow();});
 it('rejects stale quotes, other receivers, changed amounts and PSBT value',()=>{
  expect(()=>validateBtcSwap(sellStep,sell,70_001)).toThrow();
  for(const a of [{toAddress:'0x'+'2'.repeat(40)},{fromAddress:other},{fromAmount:'500001'},{toToken:{address:EVM_SWAP_ASSETS[1].token}},{slippage:0.01},{toChainId:1}])expect(()=>validateBtcSwap({...sellStep,action:{...sellStep.action,...a}},sell,10_000)).toThrow();
  for(const t of [{value:'500001'},{to:'0x'+'2'.repeat(40)},{data:undefined}])expect(()=>validateBtcSwap({...sellStep,transactionRequest:{...sellStep.transactionRequest,...t}},sell,10_000)).toThrow();
  expect(()=>validateBtcSwap({...buyStep,action:{...buyStep.action,toAddress:other}},buy,10_000)).toThrow();
  expect(()=>validateBtcSwap({...buyStep,estimate:{toAmountMin:'0'}},buy,10_000)).toThrow();
 });
});
