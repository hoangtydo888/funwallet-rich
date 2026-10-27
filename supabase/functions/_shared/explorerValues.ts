/** Only a raw base-unit string is exact. A JSON number cannot recover lost precision. */
export function exactRawTransferValue(tx:{rawContract?:{value?:unknown};value?:unknown}):string {
 const raw=tx.rawContract?.value??(typeof tx.value==='string'&&tx.value.startsWith('0x')?tx.value:undefined);
 if(typeof raw!=='string'||raw.length>80||!(/^(0|[1-9]\d*)$/.test(raw)||/^0x[\da-f]+$/i.test(raw)))return '';
 try{const value=BigInt(raw);return value>=0n&&value<(1n<<256n)?value.toString():'';}catch{return '';}
}
