import {Contract,isAddress,type Provider} from 'ethers';
export async function verifyErc721Ownership(provider:Provider,contract:string,tokenId:string,account:string,chainId=56):Promise<void> {
 if(!isAddress(contract)||!isAddress(account)||!/^\d+$/.test(tokenId)||BigInt(tokenId)>=1n<<256n)throw Error('Địa chỉ hoặc mã NFT không hợp lệ');
 if((await provider.getNetwork()).chainId!==BigInt(chainId))throw Error('RPC đang trả sai mạng NFT');
 const nft=new Contract(contract,['function ownerOf(uint256) view returns(address)'],provider);
 const owner=await nft.ownerOf(BigInt(tokenId));
 if(typeof owner!=='string'||owner.toLowerCase()!==account.toLowerCase())throw Error('Ví này chưa sở hữu NFT theo dữ liệu on-chain hiện tại');
}
