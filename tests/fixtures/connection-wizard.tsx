// Offline fixture. No real wallet, password verifier, seed, key or broadcast.
import React from 'react';
import {createRoot} from 'react-dom/client';
import {HashRouter} from 'react-router-dom';
import RequestPage from '../../src/extension/src/popup/pages/RequestPage';
let unlocked=false;
const accounts=[{address:'0x1111111111111111111111111111111111111111',name:'Tài khoản mô phỏng 1'},{address:'0x2222222222222222222222222222222222222222',name:'Tài khoản mô phỏng 2'}];
const request={id:'demo-connect',clientId:'demo',method:'eth_requestAccounts',params:[],origin:'https://fun.rich',account:accounts[0].address,chainId:56,tabId:1,frameId:0,timestamp:Date.now()};
(window as any).chrome={runtime:{sendMessage:async({type,payload}:any)=>{
 if(type==='GET_PENDING_REQUEST')return {success:true,data:{...request}};
 if(type==='IS_UNLOCKED')return {success:true,data:{unlocked}};
 if(type==='GET_CONNECTION_ACCOUNTS')return {success:true,data:accounts};
 if(type==='UNLOCK_WALLET'){if(payload.password!=='demo-only-password')return {success:false,error:'Mật khẩu mô phỏng chưa đúng'};unlocked=true;return {success:true};}
 if(type==='SELECT_CONNECTION_ACCOUNT'){if(payload.account!==request.account)unlocked=false;request.account=payload.account;return {success:true,data:{request:{...request},unlocked}};}
 if(type==='APPROVE_CONNECTION')return {success:true,data:[request.account]};
 if(type==='REJECT_CONNECTION')return {success:true};
 return {success:false,error:'Unknown offline command'};
}}};
window.location.hash='/request?requestId=demo-connect';
createRoot(document.getElementById('root')!).render(<><div className="demo-banner">MÔ PHỎNG NGOẠI TUYẾN · Không có khóa hay giao dịch thật</div><div className="demo-panel"><HashRouter><RequestPage/></HashRouter></div></>);
