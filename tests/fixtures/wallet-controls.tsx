// Offline visual fixture only. No keys, backend credentials, broadcast or real RPC.
import React from 'react';
import {createRoot} from 'react-dom/client';
import {Interface} from 'ethers';
import {TokenApprovalsPanel} from '../../src/components/wallet/TokenApprovalsPanel';
import {WalletSecurityPanel} from '../../src/components/wallet/WalletSecurityPanel';
import {WalletSecurityProvider} from '../../src/contexts/WalletSecurityContext';
const iface=new Interface(['function allowance(address,address) view returns(uint256)','function approve(address,uint256) returns(bool)','function decimals() view returns(uint8)','function symbol() view returns(string)']);
const provider={getNetwork:async()=>({chainId:56n}),getCode:async()=> '0x6000',estimateGas:async()=>50000n,getFeeData:async()=>({gasPrice:1000000000n,maxFeePerGas:null,maxPriorityFeePerGas:null}),call:async(tx:any)=>{
 const name=iface.parseTransaction(tx)?.name;return iface.encodeFunctionResult(name!,name==='allowance'?[1500000000000000001n]:name==='decimals'?[18]:name==='symbol'?['DEMO']:[true]);
}};
const chain={chainId:56,name:'BSC — mô phỏng ngoại tuyến',symbol:'BNB',shortName:'BSC',rpcUrl:'https://offline.example.invalid',explorer:'https://example.invalid',isTestnet:true,logo:'',color:''};
createRoot(document.getElementById('root')!).render(<WalletSecurityProvider><main className="max-w-2xl mx-auto p-4 bg-background text-foreground"><h1 className="text-xl font-bold mb-2">FUN Wallet · kiểm tra giao diện</h1><p className="mb-5 text-sm text-muted-foreground">Dữ liệu mô phỏng. Không có khóa ký, không gửi giao dịch, không kết nối backend.</p><WalletSecurityPanel/><TokenApprovalsPanel account={'0x'+'1'.repeat(40)} chain={chain} providerFactory={()=>provider as never}/></main></WalletSecurityProvider>);
