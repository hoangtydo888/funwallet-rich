import {describe,it,expect} from 'bun:test';
import {readBoundedJson,requireScanBudget,scannerFailure,ScannerError} from '../../supabase/functions/_shared/scannerSafety';
import {nftOwnershipCalls,ownedNftResults} from '../../supabase/functions/_shared/nftOwnership';
import {Interface} from 'ethers';
describe('scanner request/resource boundaries',()=>{
 it('reads UTF8 byte count rather than trusting absent/false Content-Length',async()=>{await expect(readBoundedJson(new Request('https://test',{method:'POST',body:'"ééé"'}),7)).rejects.toThrow('large');expect(await readBoundedJson(new Response('{"ok":true}'))).toEqual({ok:true});});
 it('cancels chunked input after limit and times out a stalled body',async()=>{let cancelled=false;const body=new ReadableStream({start(c){c.enqueue(new Uint8Array(4));c.enqueue(new Uint8Array(4));},cancel(){cancelled=true;}});await expect(readBoundedJson({body},5)).rejects.toThrow();expect(cancelled).toBe(true);await expect(readBoundedJson({body:new ReadableStream()},100,10)).rejects.toThrow('timed out');});
 it('rejects malformed JSON and UTF8',async()=>{await expect(readBoundedJson(new Response('{broken'))).rejects.toThrow('Invalid JSON');await expect(readBoundedJson(new Response(new Uint8Array([255])))).rejects.toThrow();});
 it('database quota failure never falls back to unrestricted scans',async()=>{for(const result of [{data:null,error:Error('db')},{data:true,error:null},{data:-1,error:null}])await expect(requireScanBudget({rpc:async()=>result},'u','token-scanner')).rejects.toThrow('unavailable');});
 it('enforces quota from RPC and emits Retry-After without exposing unknown errors',async()=>{await requireScanBudget({rpc:async()=>({data:0,error:null})},'u','token-scanner');await expect(requireScanBudget({rpc:async()=>({data:60,error:null})},'u','token-scanner')).rejects.toThrow('limit');const response=scannerFailure(new ScannerError(429,'limited',60),{});expect(response.status).toBe(429);expect(response.headers.get('Retry-After')).toBe('60');expect(await scannerFailure(Error('https://secret.example/API_KEY'),{}).text()).not.toContain('API_KEY');});
});
const account='0x'+'1'.repeat(40),other='0x'+'2'.repeat(40),token='0x'+'3'.repeat(40);
const nft={contractAddress:token,tokenId:'9007199254740993',standard:'ERC721' as const,balance:'1'};
describe('NFT current ownership rather than transfer-history guesses',()=>{
 it('encodes exact ERC721/ERC1155 token identifiers',()=>{const calls=nftOwnershipCalls([nft,{...nft,standard:'ERC1155'}],account);const iface=new Interface(['function ownerOf(uint256)','function balanceOf(address,uint256)']);expect(calls[0].params[0]).toMatchObject({data:iface.encodeFunctionData('ownerOf',[9007199254740993n])});expect(calls[1].params[0]).toMatchObject({data:iface.encodeFunctionData('balanceOf',[account,9007199254740993n])});});
 it('rejects sold NFTs, missing/duplicate/error proofs and invalid response lengths',()=>{const owned='0x'+account.slice(2).padStart(64,'0'),sold='0x'+other.slice(2).padStart(64,'0');expect(ownedNftResults([nft],[{id:1,result:owned}],account)).toHaveLength(1);for(const results of [[{id:1,result:sold}],[],[{id:1,result:'0x'}],[{id:1,error:'revert',result:owned}],[{id:1,result:owned},{id:1,result:owned}]])expect(ownedNftResults([nft],results,account)).toHaveLength(0);});
 it('uses exact ERC1155 balance and rejects zero',()=>{const candidate={...nft,standard:'ERC1155' as const};expect(ownedNftResults([candidate],[{id:1,result:'0x'+(9007199254740993n).toString(16).padStart(64,'0')}],account)[0].balance).toBe('9007199254740993');expect(ownedNftResults([candidate],[{id:1,result:'0x'+'0'.repeat(64)}],account)).toHaveLength(0);});
});

import {exactRawTransferValue} from '../../supabase/functions/_shared/explorerValues';
import {formatExactTokenValue} from '../../src/lib/tokenAmounts';
describe('explorer values never invent precision',()=>{
 it('keeps one wei beyond JS precision',()=>{expect(exactRawTransferValue({rawContract:{value:'0x14d1120d7b160001'}})).toBe('1500000000000000001');expect(formatExactTokenValue('1500000000000000001',18)).toBe('1.500000000000000001');});
 it('does not fabricate a zero amount from an approximate/ambiguous upstream value',()=>{expect(exactRawTransferValue({value:1.5})).toBe('');expect(exactRawTransferValue({value:'1.5'})).toBe('');expect(formatExactTokenValue('',18)).toBe('—');expect(exactRawTransferValue({rawContract:{value:'0'}})).toBe('0');});
});

import {verifyErc721Ownership} from '../../src/lib/nftOwnership';
describe('manual NFT import ownership guard',()=>{
 const p={getNetwork:async()=>({chainId:56n}),call:async()=>new Interface(['function ownerOf(uint256) view returns(address)']).encodeFunctionResult('ownerOf',[account])};
 it('checks exact token ID and wallet before import',async()=>{await verifyErc721Ownership(p as never,token,'9007199254740993',account);await expect(verifyErc721Ownership(p as never,token,'9007199254740993',other)).rejects.toThrow('sở hữu');await expect(verifyErc721Ownership(p as never,token,'1.5',account)).rejects.toThrow('hợp lệ');await expect(verifyErc721Ownership({...p,getNetwork:async()=>({chainId:1n})} as never,token,'1',account)).rejects.toThrow('mạng');});
});
