/**
 * FUN Wallet - Content Script
 * 
 * This script runs in the CONTENT SCRIPT CONTEXT
 * It bridges between the page context (inpage.js) and the background service worker
 * 
 * Uses external script injection to bypass CSP restrictions
 */

// Pending requests storage for response matching
const pendingPageRequests: Map<string, { resolve: (result: unknown) => void; reject: (error: Error) => void }> = new Map();

/**
 * Inject the provider script into the page
 * Uses external script file to bypass CSP
 */
function injectProvider() {
  try {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('inpage.js');
    script.type = 'text/javascript';
    script.onload = () => {
      script.remove();
      console.log('[FUN Wallet] Inpage script loaded');
    };
    script.onerror = (error) => {
      console.error('[FUN Wallet] Failed to load inpage script:', error);
    };
    
    // Insert at document start for earliest possible injection
    const container = document.head || document.documentElement;
    container.insertBefore(script, container.firstChild);
  } catch (error) {
    console.error('[FUN Wallet] Failed to inject provider:', error);
  }
}

/**
 * Handle messages from the injected page script
 */
window.addEventListener('message', async (event) => {
  // Only handle messages from our page script
  if (event.data.type !== 'FUN_WALLET_REQUEST') return;
  
  const { id, method, params } = event.data;
  
  try {
    // Forward request to background script
    const response = await new Promise<{ success?: boolean; data?: unknown; error?: string }>((resolve) => {
      chrome.runtime.sendMessage(
        { 
          type: method, 
          payload: params, 
          origin: window.location.origin, 
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
    if (response.success) {
      window.postMessage({
        type: 'FUN_WALLET_RESPONSE',
        id,
        result: response.data,
      }, '*');
    } else if (response.error && !response.error.includes('Pending user approval')) {
      window.postMessage({
        type: 'FUN_WALLET_RESPONSE',
        id,
        error: response.error,
      }, '*');
    }
    // If pending approval, wait for FUN_WALLET_RESPONSE from background
    
  } catch (error) {
    window.postMessage({
      type: 'FUN_WALLET_RESPONSE',
      id,
      error: (error as Error).message,
    }, '*');
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
    }, '*');
    return;
  }

  // Handle chain/account change events
  switch (message.type) {
    case 'chainChanged':
      window.postMessage({
        type: 'FUN_WALLET_EVENT',
        event: 'chainChanged',
        data: message.chainId,
      }, '*');
      break;
      
    case 'accountsChanged':
      window.postMessage({
        type: 'FUN_WALLET_EVENT',
        event: 'accountsChanged',
        data: message.accounts,
      }, '*');
      break;
      
    case 'disconnect':
      window.postMessage({
        type: 'FUN_WALLET_EVENT',
        event: 'disconnect',
        data: { code: 4900, message: 'Disconnected' },
      }, '*');
      break;
      
    case 'connect':
      window.postMessage({
        type: 'FUN_WALLET_EVENT',
        event: 'connect',
        data: { chainId: message.chainId },
      }, '*');
      break;
  }
});

// Inject provider when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectProvider);
} else {
  injectProvider();
}

console.log('[FUN Wallet] Content script loaded');
