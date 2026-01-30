/**
 * FUN Wallet - Background Service Worker
 * 
 * Handles:
 * - Message passing between popup and content scripts
 * - Wallet operations
 * - DApp connection management
 * - Transaction signing
 */

import { chromeStorageAdapter } from '../storage/ChromeStorageAdapter';
import { STORAGE_KEYS } from '../../shared/storage/types';
import { 
  DAppConnection, 
  PendingRequest,
  TransactionRequest 
} from '../../shared/types';

// Message types
type MessageType = 
  | 'GET_ACCOUNTS'
  | 'SIGN_TRANSACTION'
  | 'PERSONAL_SIGN'
  | 'CONNECT_DAPP'
  | 'DISCONNECT_DAPP'
  | 'GET_CONNECTED_DAPPS'
  | 'SWITCH_CHAIN'
  | 'GET_CURRENT_CHAIN'
  | 'IS_UNLOCKED'
  | 'UNLOCK_WALLET'
  | 'LOCK_WALLET'
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

// State
let isLocked = true;
let currentChainId = 56; // Default to BSC
const connectedDApps: Map<string, DAppConnection> = new Map();
const pendingRequests: Map<string, PendingRequest> = new Map();

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
    
    handleMessage(message, sender)
      .then(response => sendResponse(response))
      .catch(error => sendResponse({ success: false, error: error.message }));
    
    // Return true to indicate async response
    return true;
  }
);

/**
 * Route messages to handlers
 */
async function handleMessage(message: Message, sender: chrome.runtime.MessageSender): Promise<MessageResponse> {
  const origin = message.origin || sender.tab?.url;
  
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
      return handleRequestAccounts(origin, sender.tab?.id);
      
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
      return handleSendTransaction(message.payload as TransactionRequest, origin, sender.tab?.id);
      
    // Signing
    case 'personal_sign':
    case 'PERSONAL_SIGN':
      return handlePersonalSign(message.payload as { message: string }, origin, sender.tab?.id);
      
    // DApp management
    case 'CONNECT_DAPP':
      return handleConnectDApp(origin!);
      
    case 'DISCONNECT_DAPP':
      return handleDisconnectDApp(origin!);
      
    case 'GET_CONNECTED_DAPPS':
      return { success: true, data: Array.from(connectedDApps.values()) };
      
    default:
      return { success: false, error: `Unknown message type: ${message.type}` };
  }
}

/**
 * Unlock wallet with password
 */
async function handleUnlockWallet(payload: { password: string }): Promise<MessageResponse> {
  // TODO: Implement actual password verification
  if (!payload?.password) {
    return { success: false, error: 'Password required' };
  }
  
  isLocked = false;
  
  // Update last activity
  await chromeStorageAdapter.set(
    STORAGE_KEYS.LAST_ACTIVITY, 
    Date.now().toString()
  );
  
  return { success: true };
}

/**
 * Get connected accounts for origin
 */
async function handleGetAccounts(origin?: string): Promise<MessageResponse> {
  if (isLocked) {
    return { success: true, data: [] };
  }
  
  if (origin && !connectedDApps.has(origin)) {
    return { success: true, data: [] };
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
async function handleRequestAccounts(origin?: string, tabId?: number): Promise<MessageResponse> {
  if (!origin) {
    return { success: false, error: 'Origin required' };
  }
  
  if (isLocked) {
    // Open popup to unlock
    await openPopup('unlock', { origin });
    return { success: false, error: 'Wallet is locked' };
  }
  
  // Check if already connected
  if (connectedDApps.has(origin)) {
    return handleGetAccounts(origin);
  }
  
  // Create pending request
  const requestId = `connect_${Date.now()}`;
  pendingRequests.set(requestId, {
    id: requestId,
    method: 'eth_requestAccounts',
    params: [],
    origin,
    timestamp: Date.now(),
  });
  
  // Open popup for user approval
  await openPopup('connect', { requestId, origin });
  
  return { success: false, error: 'Pending user approval' };
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
  notifyChainChanged(chainId);
  
  return { success: true };
}

/**
 * Handle transaction sending
 */
async function handleSendTransaction(
  tx: TransactionRequest, 
  origin?: string, 
  tabId?: number
): Promise<MessageResponse> {
  if (isLocked) {
    return { success: false, error: 'Wallet is locked' };
  }
  
  if (origin && !connectedDApps.has(origin)) {
    return { success: false, error: 'DApp not connected' };
  }
  
  // Create pending request
  const requestId = `tx_${Date.now()}`;
  pendingRequests.set(requestId, {
    id: requestId,
    method: 'eth_sendTransaction',
    params: [tx],
    origin: origin || 'unknown',
    timestamp: Date.now(),
  });
  
  // Open popup for user approval
  await openPopup('approve-tx', { requestId, tx });
  
  return { success: false, error: 'Pending user approval' };
}

/**
 * Handle personal sign
 */
async function handlePersonalSign(
  payload: { message: string },
  origin?: string,
  tabId?: number
): Promise<MessageResponse> {
  if (isLocked) {
    return { success: false, error: 'Wallet is locked' };
  }
  
  if (origin && !connectedDApps.has(origin)) {
    return { success: false, error: 'DApp not connected' };
  }
  
  // Create pending request
  const requestId = `sign_${Date.now()}`;
  pendingRequests.set(requestId, {
    id: requestId,
    method: 'personal_sign',
    params: [payload.message],
    origin: origin || 'unknown',
    timestamp: Date.now(),
  });
  
  // Open popup for user approval
  await openPopup('approve-sign', { requestId, message: payload.message });
  
  return { success: false, error: 'Pending user approval' };
}

/**
 * Connect DApp
 */
async function handleConnectDApp(origin: string): Promise<MessageResponse> {
  const connection: DAppConnection = {
    origin,
    name: new URL(origin).hostname,
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
  
  connectedDApps.set(origin, connection);
  
  // Persist to storage
  await saveDAppConnections();
  
  return { success: true, data: connection };
}

/**
 * Disconnect DApp
 */
async function handleDisconnectDApp(origin: string): Promise<MessageResponse> {
  connectedDApps.delete(origin);
  await saveDAppConnections();
  
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
    height: 540,
    focused: true,
  });
}

/**
 * Notify all tabs of chain change
 */
function notifyChainChanged(chainId: number): void {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'chainChanged',
          chainId: `0x${chainId.toString(16)}`,
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
