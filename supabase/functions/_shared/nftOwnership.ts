export interface NftCandidate {contractAddress:string;tokenId:string;standard:'ERC721'|'ERC1155';balance:string;}
export function nftOwnershipCalls(candidates:NftCandidate[],account:string) {
 if(!/^0x[\da-f]{40}$/i.test(account)||candidates.length>40)throw Error('Invalid NFT scan');
 return candidates.map((n,index)=>{
  if(!/^0x[\da-f]{40}$/i.test(n.contractAddress)||!/^\d+$/.test(n.tokenId)||BigInt(n.tokenId)>=1n<<256n)throw Error('Invalid NFT candidate');
  const id=BigInt(n.tokenId).toString(16).padStart(64,'0');
  const data=n.standard==='ERC721'?'0x6352211e'+id:'0x00fdd58e'+account.slice(2).toLowerCase().padStart(64,'0')+id;
  return {jsonrpc:'2.0',id:index+1,method:'eth_call',params:[{to:n.contractAddress,data},'latest']};
 });
}
export function ownedNftResults<T extends NftCandidate>(candidates:T[],responses:unknown,account:string):T[] {
 if(!Array.isArray(responses))return [];
 const owned:T[]=[];
 candidates.forEach((n,index)=>{
  const matches=responses.filter(r=>r?.id===index+1);
  if(matches.length!==1)return;const r=matches[0];
  if(r.error||typeof r.result!=='string'||!/^0x[\da-f]{64}$/i.test(r.result))return;
  if(n.standard==='ERC721'){
   if(r.result.slice(2,26)!=='0'.repeat(24)||r.result.slice(-40).toLowerCase()!==account.slice(2).toLowerCase())return;
   owned.push({...n,balance:'1'});
  }else if(BigInt(r.result)>0n)owned.push({...n,balance:BigInt(r.result).toString()});
 });return owned;
}
