/**
 * FUN Wallet - Background Service Worker
 * 
 * Handles:
 * - Message passing between popup and content scripts
 * - Wallet operations
 * - DApp connection management
 * - Transaction signing with callback system
 */

import { ethers } from 'ethers';
import { chromeStorageAdapter } from '../../storage/ChromeStorageAdapter';
import { STORAGE_KEYS } from '@shared/storage/types';
import { decryptPrivateKey } from '@shared/lib/encryption';
import { 
  DAppConnection, 
  PendingRequest,
  TransactionRequest,
  SecureWalletStorage
} from '@shared/types';
import { BSC_MAINNET } from '@shared/constants/tokens';

// Message types
type MessageType = 
  | 'GET_ACCOUNTS'
  | 'SIGN_TRANSACTION'
  | 'PERSONAL_SIGN'
  | 'CONNECT_DAPP'
  | 'DISCONNECT_DAPP'
  | 'DISCONNECT_ALL_DAPPS'
  | 'GET_CONNECTED_DAPPS'
  | 'SWITCH_CHAIN'
  | 'GET_CURRENT_CHAIN'
  | 'IS_UNLOCKED'
  | 'UNLOCK_WALLET'
  | 'LOCK_WALLET'
  | 'GET_PENDING_REQUEST'
  | 'APPROVE_CONNECTION'
  | 'REJECT_CONNECTION'
  | 'APPROVE_TRANSACTION'
  | 'REJECT_TRANSACTION'
  | 'APPROVE_SIGN'
  | 'REJECT_SIGN'
  | 'eth_requestAccounts'
  | 'eth_accounts'
  | 'eth_chainId'
  | 'eth_sendTransaction'
  | 'personal_sign'
  | 'eth_signTypedData_v4'
  | 'wallet_switchEthereumChain';

interface Message {
  type: MessageType;
  payload?: unknown;
  origin?: string;
}

interface MessageResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

// Extended pending request with callbacks for response flow
interface PendingRequestWithCallback extends PendingRequest {
  tabId?: number;
  resolve?: (result: unknown) => void;
  reject?: (error: Error) => void;
}

// State
let isLocked = true;
let currentChainId = 56; // Default to BSC
const connectedDApps: Map<string, DAppConnection> = new Map();
const pendingRequests: Map<string, PendingRequestWithCallback> = new Map();

/**
 * Initialize service worker
 */
async function initialize() {
  console.log('[FUN Wallet] Service worker initializing...');
  
  // Load connected DApps from storage
  const dappsJson = await chromeStorageAdapter.get(STORAGE_KEYS.DAPP_CONNECTIONS);
  if (dappsJson) {
    try {
      const dapps: DAppConnection[] = JSON.parse(dappsJson);
      dapps.forEach(dapp => connectedDApps.set(dapp.origin, dapp));
    } catch (e) {
      console.error('[FUN Wallet] Error loading DApps:', e);
    }
  }
  
  // Load chain from storage
  const chainId = await chromeStorageAdapter.get(STORAGE_KEYS.CURRENT_CHAIN);
  if (chainId) {
    currentChainId = parseInt(chainId);
  }
  
  console.log('[FUN Wallet] Service worker initialized');
}

/**
 * Handle incoming messages from popup and content scripts
 */
chrome.runtime.onMessage.addListener(
  (message: Message, sender, sendResponse: (response: MessageResponse) => void) => {
    console.log('[FUN Wallet] Message received:', message.type);
    
    handleMessage(message, sender, sendResponse)
      .then(response => {
        if (response) sendResponse(response);
      })
      .catch(error => sendResponse({ success: false, error: error.message }));
    
    // Return true to indicate async response
    return true;
  }
);

/**
 * Route messages to handlers
 */
async function handleMessage(
  message: Message, 
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: MessageResponse) => void
): Promise<MessageResponse | null> {
  const origin = message.origin || sender.tab?.url;
  const tabId = sender.tab?.id;
  
  switch (message.type) {
    // Wallet state
    case 'IS_UNLOCKED':
      return { success: true, data: { unlocked: !isLocked } };
      
    case 'UNLOCK_WALLET':
      return handleUnlockWallet(message.payload as { password: string });
      
    case 'LOCK_WALLET':
      isLocked = true;
      return { success: true };
      
    // Accounts
    case 'GET_ACCOUNTS':
    case 'eth_accounts':
      return handleGetAccounts(origin);
      
    case 'eth_requestAccounts':
      return handleRequestAccounts(origin, tabId, sendResponse);
      
    // Chain
    case 'GET_CURRENT_CHAIN':
    case 'eth_chainId':
      return { success: true, data: `0x${currentChainId.toString(16)}` };
      
    case 'SWITCH_CHAIN':
    case 'wallet_switchEthereumChain':
      return handleSwitchChain(message.payload as { chainId: string });
      
    // Transactions
    case 'eth_sendTransaction':
    case 'SIGN_TRANSACTION':
      return handleSendTransaction(message.payload as TransactionRequest, origin, tabId, sendResponse);
      
    // Signing
    case 'personal_sign':
    case 'PERSONAL_SIGN':
      return handlePersonalSign(message.payload as { message: string; address?: string }, origin, tabId, sendResponse);
      
    case 'eth_signTypedData_v4':
      return handleSignTypedData(message.payload as { address: string; data: string }, origin, tabId, sendResponse);
      
    // Pending request management
    case 'GET_PENDING_REQUEST':
      return handleGetPendingRequest(message.payload as { requestId: string });
      
    // Connection approval from popup
    case 'APPROVE_CONNECTION':
      return handleApproveConnection(message.payload as { requestId: string; origin: string });
      
    case 'REJECT_CONNECTION':
      return handleRejectConnection(message.payload as { requestId: string });
      
    // Transaction approval from popup
    case 'APPROVE_TRANSACTION':
      return handleApproveTransaction(message.payload as { requestId: string; signedTx?: string; txHash?: string });
      
    case 'REJECT_TRANSACTION':
      return handleRejectTransaction(message.payload as { requestId: string });
      
    // Sign approval from popup  
    case 'APPROVE_SIGN':
      return handleApproveSign(message.payload as { requestId: string; signature: string });
      
    case 'REJECT_SIGN':
      return handleRejectSign(message.payload as { requestId: string });
      
    // DApp management
    case 'CONNECT_DAPP':
      return handleConnectDApp(origin!, message.payload as { requestId?: string });
      
    case 'DISCONNECT_DAPP':
      return handleDisconnectDApp(message.payload as { origin: string });
      
    case 'DISCONNECT_ALL_DAPPS':
      return handleDisconnectAllDApps();
      
    case 'GET_CONNECTED_DAPPS':
      return { success: true, data: Array.from(connectedDApps.values()) };
      
    default:
      return { success: false, error: `Unknown message type: ${message.type}` };
  }
}

/**
 * Unlock wallet with password - REAL verification
 */
async function handleUnlockWallet(payload: { password: string }): Promise<MessageResponse> {
  if (!payload?.password) {
    return { success: false, error: 'Password required' };
  }

  try {
    // Get encrypted wallet data
    const encryptedData = await chromeStorageAdapter.get(STORAGE_KEYS.ENCRYPTED_KEYS);
    
    if (!encryptedData) {
      return { success: false, error: 'No wallet found' };
    }

    // Parse and verify password by attempting decryption
    const parsed: SecureWalletStorage = JSON.parse(encryptedData);
    const addresses = Object.keys(parsed.wallets);
    
    if (addresses.length === 0) {
      return { success: false, error: 'No wallet found' };
    }

    // Try to decrypt first wallet to verify password
    const testKeyData = parsed.wallets[addresses[0]];
    await decryptPrivateKey(testKeyData, payload.password);
    
    // Password correct - unlock wallet
    isLocked = false;
    
    // Update last activity
    await chromeStorageAdapter.set(
      STORAGE_KEYS.LAST_ACTIVITY, 
      Date.now().toString()
    );

    console.log('[FUN Wallet] Wallet unlocked successfully');
    return { success: true };
  } catch (error) {
    console.error('[FUN Wallet] Unlock failed:', error);
    return { success: false, error: 'Mật khẩu không đúng' };
  }
}

/**
 * Get connected accounts for origin
 */
async function handleGetAccounts(origin?: string): Promise<MessageResponse> {
  if (isLocked) {
    return { success: true, data: [] };
  }
  
  if (origin) {
    try {
      const url = new URL(origin);
      if (!connectedDApps.has(url.origin)) {
        return { success: true, data: [] };
      }
    } catch {
      // Invalid origin
    }
  }
  
  // Get active wallet address
  const activeWallet = await chromeStorageAdapter.get(STORAGE_KEYS.ACTIVE_WALLET);
  
  return { 
    success: true, 
    data: activeWallet ? [activeWallet] : [] 
  };
}

/**
 * Handle eth_requestAccounts - prompt user to connect
 */
async function handleRequestAccounts(
  origin?: string, 
  tabId?: number,
  sendResponse?: (response: MessageResponse) => void
): Promise<MessageResponse | null> {
  if (!origin) {
    return { success: false, error: 'Origin required' };
  }
  
  // Parse origin URL
  let parsedOrigin: string;
  try {
    parsedOrigin = new URL(origin).origin;
  } catch {
    parsedOrigin = origin;
  }
  
  if (isLocked) {
    // Open popup to unlock
    await openPopup('unlock', { origin: parsedOrigin });
    return { success: false, error: 'Wallet is locked' };
  }
  
  // Check if already connected
  if (connectedDApps.has(parsedOrigin)) {
    return handleGetAccounts(parsedOrigin);
  }
  
  // Create pending request with callback
  const requestId = `connect_${Date.now()}`;
  const request: PendingRequestWithCallback = {
    id: requestId,
    method: 'eth_requestAccounts',
    params: [],
    origin: parsedOrigin,
    timestamp: Date.now(),
    tabId,
  };
  
  pendingRequests.set(requestId, request);
  
  // Open popup for user approval
  await openPopup('connect', { requestId, origin: parsedOrigin });
  
  // Return null - response will be sent via callback after user approval
  return null;
}

/**
 * Get pending request by ID
 */
function handleGetPendingRequest(payload: { requestId: string }): MessageResponse {
  const request = pendingRequests.get(payload.requestId);
  if (!request) {
    return { success: false, error: 'Request not found' };
  }
  return { success: true, data: request };
}

/**
 * Handle connection approval from popup
 */
async function handleApproveConnection(payload: { requestId: string; origin: string }): Promise<MessageResponse> {
  const request = pendingRequests.get(payload.requestId);
  if (!request) {
    return { success: false, error: 'Request not found or expired' };
  }
  
  // Create connection
  const connection: DAppConnection = {
    origin: payload.origin,
    name: new URL(payload.origin).hostname,
    connectedAt: Date.now(),
    permissions: ['eth_accounts'],
    chainId: currentChainId,
    accounts: [],
  };
  
  // Get active wallet
  const activeWallet = await chromeStorageAdapter.get(STORAGE_KEYS.ACTIVE_WALLET);
  if (activeWallet) {
    connection.accounts = [activeWallet];
  }
  
  connectedDApps.set(payload.origin, connection);
  await saveDAppConnections();
  
  // Send response to content script
  if (request.tabId) {
    chrome.tabs.sendMessage(request.tabId, {
      type: 'FUN_WALLET_RESPONSE',
      requestId: payload.requestId,
      result: connection.accounts,
    }).catch(console.error);
  }
  
  // Clean up
  pendingRequests.delete(payload.requestId);
  
  // Emit connect event
  notifyTabs('connect', { chainId: `0x${currentChainId.toString(16)}` });
  notifyTabs('accountsChanged', connection.accounts);
  
  return { success: true, data: connection.accounts };
}

/**
 * Handle connection rejection from popup
 */
function handleRejectConnection(payload: { requestId: string }): MessageResponse {
  const request = pendingRequests.get(payload.requestId);
  if (!request) {
    return { success: false, error: 'Request not found' };
  }
  
  // Send error to content script
  if (request.tabId) {
    chrome.tabs.sendMessage(request.tabId, {
      type: 'FUN_WALLET_RESPONSE',
      requestId: payload.requestId,
      error: 'User rejected connection',
    }).catch(console.error);
  }
  
  pendingRequests.delete(payload.requestId);
  return { success: true };
}

/**
 * Handle chain switching
 */
async function handleSwitchChain(payload: { chainId: string }): Promise<MessageResponse> {
  const chainId = parseInt(payload.chainId, 16);
  
  // Validate chain is supported
  const supportedChains = [56, 1, 137, 42161, 10, 43114, 250, 8453];
  if (!supportedChains.includes(chainId)) {
    return { 
      success: false, 
      error: `Chain ${chainId} not supported` 
    };
  }
  
  currentChainId = chainId;
  await chromeStorageAdapter.set(STORAGE_KEYS.CURRENT_CHAIN, chainId.toString());
  
  // Notify all connected tabs
  notifyTabs('chainChanged', `0x${chainId.toString(16)}`);
  
  return { success: true };
}

/**
 * Handle transaction sending
 * If wallet is locked, opens unlock popup with redirect to approve-tx
 */
async function handleSendTransaction(
  tx: TransactionRequest, 
  origin?: string, 
  tabId?: number,
  sendResponse?: (response: MessageResponse) => void
): Promise<MessageResponse | null> {
  // Parse origin if needed
  let parsedOrigin: string | undefined;
  if (origin) {
    try {
      parsedOrigin = new URL(origin).origin;
    } catch {
      parsedOrigin = origin;
    }
  }
  
  // Check DApp connection FIRST (before unlock check)
  if (parsedOrigin && !connectedDApps.has(parsedOrigin)) {
    return { success: false, error: 'DApp not connected' };
  }
  
  // Build params for approve-tx page
  const txParams: Record<string, string> = {
    to: tx.to || '',
    value: tx.value || '0',
    origin: parsedOrigin || 'unknown',
  };
  
  if (tx.data) {
    txParams.data = tx.data;
  }
  
  // Create pending request
  const requestId = `tx_${Date.now()}`;
  pendingRequests.set(requestId, {
    id: requestId,
    method: 'eth_sendTransaction',
    params: [tx],
    origin: parsedOrigin || 'unknown',
    timestamp: Date.now(),
    tabId,
  });
  
  txParams.requestId = requestId;
  
  // If wallet is locked, open unlock popup with redirect to approve-tx
  if (isLocked) {
    await openPopupWithUnlockRedirect('approve-tx', txParams);
    return null;
  }
  
  // Wallet is unlocked, open approve-tx directly
  await openPopup('approve-tx', txParams);
  
  return null;
}

/**
 * Handle transaction approval from popup
 */
async function handleApproveTransaction(payload: { requestId: string; signedTx?: string; txHash?: string }): Promise<MessageResponse> {
  const request = pendingRequests.get(payload.requestId);
  if (!request) {
    return { success: false, error: 'Request not found or expired' };
  }
  
  // Send tx hash to content script
  if (request.tabId && payload.txHash) {
    chrome.tabs.sendMessage(request.tabId, {
      type: 'FUN_WALLET_RESPONSE',
      requestId: payload.requestId,
      result: payload.txHash,
    }).catch(console.error);
  }
  
  pendingRequests.delete(payload.requestId);
  return { success: true, data: { txHash: payload.txHash } };
}

/**
 * Handle transaction rejection from popup
 */
function handleRejectTransaction(payload: { requestId: string }): MessageResponse {
  const request = pendingRequests.get(payload.requestId);
  if (!request) {
    return { success: false, error: 'Request not found' };
  }
  
  if (request.tabId) {
    chrome.tabs.sendMessage(request.tabId, {
      type: 'FUN_WALLET_RESPONSE',
      requestId: payload.requestId,
      error: 'User rejected transaction',
    }).catch(console.error);
  }
  
  pendingRequests.delete(payload.requestId);
  return { success: true };
}

/**
 * Handle personal sign
 * If wallet is locked, opens unlock popup with redirect to approve-sign
 */
async function handlePersonalSign(
  payload: { message: string; address?: string },
  origin?: string,
  tabId?: number,
  sendResponse?: (response: MessageResponse) => void
): Promise<MessageResponse | null> {
  let parsedOrigin: string | undefined;
  if (origin) {
    try {
      parsedOrigin = new URL(origin).origin;
    } catch {
      parsedOrigin = origin;
    }
  }
  
  // Check DApp connection FIRST
  if (parsedOrigin && !connectedDApps.has(parsedOrigin)) {
    return { success: false, error: 'DApp not connected' };
  }
  
  // Create pending request
  const requestId = `sign_${Date.now()}`;
  pendingRequests.set(requestId, {
    id: requestId,
    method: 'personal_sign',
    params: [payload.message, payload.address],
    origin: parsedOrigin || 'unknown',
    timestamp: Date.now(),
    tabId,
  });
  
  const signParams = { 
    requestId, 
    message: payload.message,
    origin: parsedOrigin || 'unknown',
    method: 'personal_sign',
  };
  
  // If wallet is locked, open unlock popup with redirect
  if (isLocked) {
    await openPopupWithUnlockRedirect('approve-sign', signParams);
    return null;
  }
  
  // Open popup for user approval
  await openPopup('approve-sign', signParams);
  
  return null;
}

/**
 * Handle typed data signing (EIP-712)
 * If wallet is locked, opens unlock popup with redirect to approve-sign
 */
async function handleSignTypedData(
  payload: { address: string; data: string },
  origin?: string,
  tabId?: number,
  sendResponse?: (response: MessageResponse) => void
): Promise<MessageResponse | null> {
  let parsedOrigin: string | undefined;
  if (origin) {
    try {
      parsedOrigin = new URL(origin).origin;
    } catch {
      parsedOrigin = origin;
    }
  }
  
  // Check DApp connection FIRST
  if (parsedOrigin && !connectedDApps.has(parsedOrigin)) {
    return { success: false, error: 'DApp not connected' };
  }
  
  // Create pending request
  const requestId = `signTyped_${Date.now()}`;
  pendingRequests.set(requestId, {
    id: requestId,
    method: 'eth_signTypedData_v4',
    params: [payload.address, payload.data],
    origin: parsedOrigin || 'unknown',
    timestamp: Date.now(),
    tabId,
  });
  
  const signParams = { 
    requestId, 
    message: payload.data,
    origin: parsedOrigin || 'unknown',
    method: 'eth_signTypedData_v4',
  };
  
  // If wallet is locked, open unlock popup with redirect
  if (isLocked) {
    await openPopupWithUnlockRedirect('approve-sign', signParams);
    return null;
  }
  
  // Open popup for user approval
  await openPopup('approve-sign', signParams);
  
  return null;
}

/**
 * Handle sign approval from popup
 */
async function handleApproveSign(payload: { requestId: string; signature: string }): Promise<MessageResponse> {
  const request = pendingRequests.get(payload.requestId);
  if (!request) {
    return { success: false, error: 'Request not found or expired' };
  }
  
  // Send signature to content script
  if (request.tabId) {
    chrome.tabs.sendMessage(request.tabId, {
      type: 'FUN_WALLET_RESPONSE',
      requestId: payload.requestId,
      result: payload.signature,
    }).catch(console.error);
  }
  
  pendingRequests.delete(payload.requestId);
  return { success: true, data: { signature: payload.signature } };
}

/**
 * Handle sign rejection from popup
 */
function handleRejectSign(payload: { requestId: string }): MessageResponse {
  const request = pendingRequests.get(payload.requestId);
  if (!request) {
    return { success: false, error: 'Request not found' };
  }
  
  if (request.tabId) {
    chrome.tabs.sendMessage(request.tabId, {
      type: 'FUN_WALLET_RESPONSE',
      requestId: payload.requestId,
      error: 'User rejected signing',
    }).catch(console.error);
  }
  
  pendingRequests.delete(payload.requestId);
  return { success: true };
}

/**
 * Connect DApp
 */
async function handleConnectDApp(origin: string, payload?: { requestId?: string }): Promise<MessageResponse> {
  let parsedOrigin: string;
  try {
    parsedOrigin = new URL(origin).origin;
  } catch {
    parsedOrigin = origin;
  }
  
  const connection: DAppConnection = {
    origin: parsedOrigin,
    name: new URL(parsedOrigin).hostname,
    connectedAt: Date.now(),
    permissions: ['eth_accounts'],
    chainId: currentChainId,
    accounts: [],
  };
  
  // Get active wallet
  const activeWallet = await chromeStorageAdapter.get(STORAGE_KEYS.ACTIVE_WALLET);
  if (activeWallet) {
    connection.accounts = [activeWallet];
  }
  
  connectedDApps.set(parsedOrigin, connection);
  
  // Persist to storage
  await saveDAppConnections();
  
  return { success: true, data: connection };
}

/**
 * Disconnect DApp
 */
async function handleDisconnectDApp(payload: { origin: string }): Promise<MessageResponse> {
  connectedDApps.delete(payload.origin);
  await saveDAppConnections();
  
  // Notify tabs
  notifyTabs('disconnect', { code: 4900, message: 'Disconnected' });
  
  return { success: true };
}

/**
 * Disconnect all DApps
 */
async function handleDisconnectAllDApps(): Promise<MessageResponse> {
  connectedDApps.clear();
  await saveDAppConnections();
  
  notifyTabs('disconnect', { code: 4900, message: 'Disconnected' });
  
  return { success: true };
}

/**
 * Save DApp connections to storage
 */
async function saveDAppConnections(): Promise<void> {
  const dapps = Array.from(connectedDApps.values());
  await chromeStorageAdapter.set(STORAGE_KEYS.DAPP_CONNECTIONS, JSON.stringify(dapps));
}

/**
 * Open popup window
 */
async function openPopup(page: string, params?: Record<string, unknown>): Promise<void> {
  const queryString = params 
    ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
    : '';
    
  await chrome.windows.create({
    url: chrome.runtime.getURL(`popup.html#/${page}${queryString}`),
    type: 'popup',
    width: 360,
    height: 600,
    focused: true,
  });
}

/**
 * Open popup with unlock redirect
 * If wallet is locked, opens unlock page first
 * After unlock, automatically redirects to target page with params
 */
async function openPopupWithUnlockRedirect(
  targetPage: string, 
  params: Record<string, unknown>
): Promise<void> {
  const queryString = new URLSearchParams(params as Record<string, string>).toString();
  const redirectPath = `${targetPage}?${queryString}`;
  
  // Encode redirect path to pass through URL
  const encodedRedirect = encodeURIComponent(redirectPath);
  
  await chrome.windows.create({
    url: chrome.runtime.getURL(`popup.html#/unlock?redirect=${encodedRedirect}`),
    type: 'popup',
    width: 360,
    height: 600,
    focused: true,
  });
}

/**
 * Notify all tabs of events
 */
function notifyTabs(eventType: string, data: unknown): void {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: eventType,
          ...(eventType === 'chainChanged' ? { chainId: data } : {}),
          ...(eventType === 'accountsChanged' ? { accounts: data } : {}),
          ...(eventType === 'disconnect' || eventType === 'connect' ? data as object : {}),
        }).catch(() => {
          // Tab might not have content script
        });
      }
    });
  });
}

// Initialize
initialize();

// Auto-lock after inactivity (15 minutes)
setInterval(async () => {
  if (!isLocked) {
    const lastActivity = await chromeStorageAdapter.get(STORAGE_KEYS.LAST_ACTIVITY);
    if (lastActivity) {
      const elapsed = Date.now() - parseInt(lastActivity);
      const autoLockMs = 15 * 60 * 1000; // 15 minutes
      
      if (elapsed > autoLockMs) {
        console.log('[FUN Wallet] Auto-locking due to inactivity');
        isLocked = true;
      }
    }
  }
}, 60000); // Check every minute

// Handle extension install/update
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[FUN Wallet] Extension installed:', details.reason);
});
