import { serializeBroadcast, reserveBroadcast, pendingTransactions, rememberTransaction, type PendingWalletTransaction } from './transactionQueue';
import { keccak256, resolveAddress, Wallet, copyRequest, resolveProperties, Transaction, TypedDataEncoder, type Provider, type TransactionRequest, type TypedDataDomain, type TypedDataField } from 'ethers';
import { walletKeySession } from './walletKeySession';

/** Recheck the memory session at signing time, after any RPC/approval awaits.
 * Already broadcast transactions cannot be revoked by locking the wallet. */
class GuardedWallet extends Wallet {
  constructor(key:string,provider:Provider|null,private readonly expectedChainId:number,private readonly assertContext:()=>void=()=>{}) { super(key,provider); }
  private assertUnlocked() {
    this.assertContext();
    if (walletKeySession.getKey(this.address) !== this.privateKey) throw Error('Ví đã khóa hoặc phiên ký đã hết hạn');
  }
  override connect(provider:Provider|null):Wallet { return new GuardedWallet(this.privateKey,provider,this.expectedChainId,this.assertContext); }
  override async signTransaction(tx:TransactionRequest):Promise<string> {
    this.assertUnlocked();
    const request=copyRequest(tx);
    if(!request.chainId||BigInt(request.chainId)!==BigInt(this.expectedChainId))throw Error('Mạng giao dịch không khớp');
    if(request.authorizationList?.length||tx.blobs?.length||('blobVersionedHashes' in tx&&tx.blobVersionedHashes)||request.type===3||request.type===4)throw Error('Kiểu giao dịch ủy quyền hoặc blob chưa được hỗ trợ');
    const {to,from}=await resolveProperties({to:request.to?resolveAddress(request.to,this):undefined,from:request.from?resolveAddress(request.from,this):undefined});
    if(to!=null)request.to=to;
    if(from!=null&&from.toLowerCase()!==this.address.toLowerCase())throw Error('Tài khoản gửi không khớp ví ký');
    delete request.from;
    const transaction=Transaction.from(request as never);
    this.assertUnlocked(); // Last check after address/ENS resolution; signing below is synchronous.
    transaction.signature=this.signingKey.sign(transaction.unsignedHash);
    return transaction.serialized;
  }
  override async sendTransaction(tx:TransactionRequest) {
    return serializeBroadcast(this.address,this.expectedChainId,async()=>{
      this.assertUnlocked();
      if (!this.provider || (await this.provider.getNetwork()).chainId !== BigInt(this.expectedChainId)) throw Error('RPC đang trả về sai mạng');
      this.assertUnlocked();
      if (tx.chainId !== undefined && BigInt(tx.chainId) !== BigInt(this.expectedChainId)) throw Error('Mạng giao dịch không khớp');
      const to=await resolveAddress(tx.to!,this.provider);
      const data=typeof tx.data==='string'?tx.data:'0x';
      const value=BigInt(tx.value??0);
      const unresolved=pendingTransactions().filter(row=>row.chainId===this.expectedChainId&&row.account.toLowerCase()===this.address.toLowerCase());
      if(tx.nonce===undefined&&unresolved.some(row=>row.status==='unknown'||row.status==='broadcasting'))throw Error('Có giao dịch chưa rõ trạng thái; kiểm tra lịch sử trước khi gửi tiếp');
      let nonce=tx.nonce;
      if(nonce===undefined) {
        const remote=await this.provider.getTransactionCount(this.address,'pending');
        const last=unresolved.filter(row=>row.status==='pending'||row.status==='confirmed').reduce((max,row)=>Math.max(max,row.nonce),-1);
        nonce=Math.max(remote,last+1);
      }
      const prepared=await this.populateTransaction({...tx,to,data,value,chainId:this.expectedChainId,nonce});
      this.assertUnlocked();
      // Stamp before signing/broadcasting. A timeout is never an instruction to retry.
      reserveBroadcast(this.address,this.expectedChainId,to,data,value);
      const signed=await this.signTransaction(prepared);
      const hash=keccak256(signed);
      const record:PendingWalletTransaction={hash,chainId:this.expectedChainId,account:this.address.toLowerCase(),to:to.toLowerCase(),nonce,
        value:value.toString(),data,status:'broadcasting',createdAt:Date.now(),gasLimit:String(prepared.gasLimit??0),
        gasPrice:prepared.gasPrice==null?undefined:String(prepared.gasPrice),maxFeePerGas:prepared.maxFeePerGas==null?undefined:String(prepared.maxFeePerGas),
        maxPriorityFeePerGas:prepared.maxPriorityFeePerGas==null?undefined:String(prepared.maxPriorityFeePerGas)};
      rememberTransaction(record);
      try {
        const result=await this.provider.broadcastTransaction(signed);
        if(result.hash.toLowerCase()!==hash.toLowerCase())throw Error('RPC trả mã giao dịch không khớp');
        try { rememberTransaction({...record,status:'pending'}); } catch { /* Already broadcast; return its hash. */ }
        return result;
      } catch {
        try { rememberTransaction({...record,status:'unknown'}); } catch { /* The original broadcasting record remains. */ }
        throw Error(`Chưa rõ trạng thái gửi. Không gửi lại tiền; kiểm tra mã giao dịch ${hash}`);
      }
    });
  }
  override signMessageSync(message:string|Uint8Array):string {this.assertUnlocked();return super.signMessageSync(message);}
  override async signMessage(message:string|Uint8Array):Promise<string> {return this.signMessageSync(message);}
  // EIP-7702 delegation needs a dedicated permission review, not the login/sign UI.
  override authorizeSync(_auth:any):never {throw Error('Ủy quyền EIP-7702 chưa được hỗ trợ');}
  override async authorize(_auth:any):Promise<never> {throw Error('Ủy quyền EIP-7702 chưa được hỗ trợ');}
  override async signTypedData(domain:TypedDataDomain,types:Record<string,TypedDataField[]>,value:Record<string,unknown>):Promise<string> {
    this.assertUnlocked();
    if(domain.chainId===undefined||BigInt(domain.chainId)!==BigInt(this.expectedChainId))throw Error('Thiếu mạng hoặc sai mạng trong chữ ký');
    const populated=await TypedDataEncoder.resolveNames({...domain},types,value,async(name)=>{
      if(!this.provider)throw Error('Chưa có RPC để phân giải tên');
      const address=await this.provider.resolveName(name);if(!address)throw Error('Không phân giải được địa chỉ');return address;
    });
    const digest=TypedDataEncoder.hash(populated.domain,types,populated.value);
    this.assertUnlocked();
    return this.signingKey.sign(digest).serialized;
  }
}
export const createSessionSigner = (key:string,provider:Provider|null,chainId=56,assertContext:()=>void=()=>{}):Wallet => new GuardedWallet(key,provider,chainId,assertContext);
