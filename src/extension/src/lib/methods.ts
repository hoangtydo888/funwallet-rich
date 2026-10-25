// Dependency-free so the content script bundle stays small.

// Read-only JSON-RPC calls forwarded to the selected chain's RPC without approval.
export const READ_METHODS = new Set([
  'eth_blockNumber', 'eth_call', 'eth_estimateGas', 'eth_feeHistory', 'eth_gasPrice',
  'eth_getBalance', 'eth_getBlockByHash', 'eth_getBlockByNumber', 'eth_getCode', 'eth_getLogs',
  'eth_getStorageAt', 'eth_getTransactionByHash', 'eth_getTransactionCount', 'eth_getTransactionReceipt',
  'eth_maxPriorityFeePerGas',
]);

export const PUBLIC_METHODS = new Set([
  'eth_accounts', 'eth_requestAccounts', 'eth_chainId', 'net_version', 'web3_clientVersion',
  'eth_sendTransaction', 'personal_sign', 'eth_signTypedData_v4',
  'wallet_switchEthereumChain', 'wallet_addEthereumChain',
  'wallet_getPermissions', 'wallet_requestPermissions', 'wallet_revokePermissions',
  ...READ_METHODS,
]);
