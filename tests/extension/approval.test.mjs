import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { ethers } from 'ethers';

const directory = new URL('../../node_modules/.cache/fun-wallet-tests/', import.meta.url);
await mkdir(directory, { recursive: true });
const file = new URL('approval.mjs', directory);
const compiled = await build({ entryPoints: ['src/extension/src/lib/approval.ts'], bundle: true, packages: 'external', platform: 'node', format: 'esm', write: false });
await writeFile(file, compiled.outputFiles[0].text);
const { normalizeTransaction, decodeTokenCall, displayAmount, toEthersTransaction, trustedPopup, pageOrigin, PUBLIC_METHODS } = await import(pathToFileURL(file.pathname));
const from = '0x1111111111111111111111111111111111111111';
const to = '0x2222222222222222222222222222222222222222';
const abi = new ethers.Interface(['function transfer(address,uint256)', 'function approve(address,uint256)']);

test('500,000 CAMLY with 3 decimals is decoded without floating point loss', () => {
  const result = decodeTokenCall(abi.encodeFunctionData('transfer', [to, 500000000n]));
  assert.equal(result.kind, 'transfer');
  assert.equal(result.recipient, to);
  assert.equal(displayAmount(ethers.formatUnits(result.rawAmount, 3)), '500.000');
  assert.equal(displayAmount('9007199254740993123.0001'), '9.007.199.254.740.993.123,0001');
});
test('allowance and unknown contract calls are not misrepresented as transfers', () => {
  assert.equal(decodeTokenCall(abi.encodeFunctionData('approve', [to, ethers.MaxUint256])).kind, 'approve');
  assert.equal(decodeTokenCall('0x12345678'), null);
  assert.equal(decodeTokenCall(abi.encodeFunctionData('transfer', [to, 1n]) + '00'), null);
});
test('RPC value is wei, and all accepted fee/nonce fields are preserved', () => {
  const tx = normalizeTransaction({ from, to, value: '0x1', gas: '0x5208', gasPrice: '0x5', nonce: '0x0' }, from, 56);
  assert.equal(toEthersTransaction(tx).value, 1n);
  assert.equal(toEthersTransaction(tx).gasLimit, 21000n);
  assert.equal(toEthersTransaction(tx).gasPrice, 5n);
  assert.equal(toEthersTransaction(tx).nonce, 0);
});
test('invalid, ambiguous, wrong-account and wrong-network requests fail closed', () => {
  for (const patch of [{value:'1'}, {value:'-1'}, {value:'0x01'}, {from:to}, {to:'not-an-address'}, {chainId:'0x1'}, {data:'0x1'}, {gasPrice:'0x1',maxFeePerGas:'0x2'}, {maxPriorityFeePerGas:'0x3',maxFeePerGas:'0x2'}, {authorizationList:[]}]) {
    assert.throws(() => normalizeTransaction({from,to,...patch}, from, 56), undefined, JSON.stringify(patch));
  }
});
test('page cannot call internal approval or vault methods and cannot spoof popup sender', () => {
  for (const method of ['APPROVE_TRANSACTION','APPROVE_CONNECTION','UNLOCK_WALLET','GET_PENDING_REQUEST']) assert.equal(PUBLIC_METHODS.has(method), false);
  const popup = 'chrome-extension://wallet/popup.html';
  assert.equal(trustedPopup({id:'wallet',url:`${popup}?surface=approval#/request`}, 'wallet', popup), true);
  assert.equal(trustedPopup({id:'wallet',url:'https://fun.rich/popup.html'}, 'wallet', popup), false);
  assert.equal(trustedPopup({id:'other',url:popup}, 'wallet', popup), false);
  assert.throws(() => pageOrigin({id:'wallet',url:'https://fun.rich',tab:{id:1},frameId:1}, 'wallet'));
  assert.equal(pageOrigin({id:'wallet',url:'https://fun.rich/profile',tab:{id:1},frameId:0}, 'wallet'), 'https://fun.rich');
});
