/**
 * FUN Wallet - Content Script
 * 
 * This script runs in the CONTENT SCRIPT CONTEXT
 * It bridges between the page context (inpage.js) and the background service worker
 * 
 */

import { PUBLIC_METHODS as publicMethods } from '../lib/methods';

// inpage.js is registered by the service worker in the page's MAIN world at
// document_start, so dApps see window.funWallet before their own scripts run.

/**
 * Handle messages from the injected page script
 */
window.addEventListener('message', async (event) => {
  // Only handle messages from our page script
  if (event.source !== window || event.origin !== window.location.origin || !event.data || event.data.type !== 'FUN_WALLET_REQUEST') return;
  
  const { id, method, params } = event.data;
  if (typeof id !== 'string' || id.length > 150) return;
  if (!publicMethods.has(method)) {
    window.postMessage({ type: 'FUN_WALLET_RESPONSE', id, error: 'Phương thức không được hỗ trợ', code: 4200 }, window.location.origin);
    return;
  }
  
  try {
    // Forward request to background script
    const response = await new Promise<{ success?: boolean; data?: unknown; error?: string; code?: number; errorData?: unknown; pending?: boolean }>((resolve) => {
      chrome.runtime.sendMessage(
        { 
          type: method, 
          payload: params, 
          requestId: id 
        },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve({ error: chrome.runtime.lastError.message });
          } else {
            resolve(response || { error: 'No response from background' });
          }
        }
      );
    });
    
    // Handle immediate responses
    if (response.pending) return;
    if (response.success) {
      window.postMessage({
        type: 'FUN_WALLET_RESPONSE',
        id,
        result: response.data,
      }, window.location.origin);
    } else if (response.error && !response.error.includes('Pending user approval')) {
      window.postMessage({
        type: 'FUN_WALLET_RESPONSE',
        id,
        error: response.error,
        code: response.code,
        data: response.errorData,
      }, window.location.origin);
    }
    // If pending approval, wait for FUN_WALLET_RESPONSE from background
    
  } catch (error) {
    window.postMessage({
      type: 'FUN_WALLET_RESPONSE',
      id,
      error: (error as Error).message,
      code: -32603,
    }, window.location.origin);
  }
});

/**
 * Listen for messages from background script
 */
chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
  // Handle approval responses from popup via background
  if (message.type === 'FUN_WALLET_RESPONSE') {
    // Forward to page context
    window.postMessage({
      type: 'FUN_WALLET_RESPONSE',
      id: message.requestId,
      result: message.result,
      error: message.error,
      code: message.code,
    }, window.location.origin);
    return;
  }

  // Handle chain/account change events
  switch (message.type) {
    case 'chainChanged':
      window.postMessage({
        type: 'FUN_WALLET_EVENT',
        event: 'chainChanged',
        data: message.chainId,
      }, window.location.origin);
      break;
      
    case 'accountsChanged':
      window.postMessage({
        type: 'FUN_WALLET_EVENT',
        event: 'accountsChanged',
        data: message.accounts,
      }, window.location.origin);
      break;
      
    case 'disconnect':
      window.postMessage({
        type: 'FUN_WALLET_EVENT',
        event: 'disconnect',
        data: { code: 4900, message: 'Disconnected' },
      }, window.location.origin);
      break;
      
    case 'connect':
      window.postMessage({
        type: 'FUN_WALLET_EVENT',
        event: 'connect',
        data: { chainId: message.chainId },
      }, window.location.origin);
      break;
  }
});

console.log('[FUN Wallet] Content script loaded');
