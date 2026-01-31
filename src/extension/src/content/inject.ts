/**
 * FUN Wallet - Content Script
 * 
 * Injects the wallet provider into web pages
 * Implements EIP-1193 compatible provider
 */

// Pending requests storage for response matching
const pendingPageRequests: Map<string, { resolve: (result: unknown) => void; reject: (error: Error) => void }> = new Map();

// Create the provider object for content script context
const funWalletProvider = {
  isFunWallet: true,
  isMetaMask: false, // Do not impersonate MetaMask
  isConnected: () => true,
  
  // Chain ID (will be updated by background)
  chainId: '0x38', // BSC default
  networkVersion: '56',
  
  // Selected address
  selectedAddress: null as string | null,
  
  /**
   * Main request method (EIP-1193)
   */
  request: async <T = unknown>({ method, params }: { method: string; params?: unknown[] }): Promise<T> => {
    return new Promise((resolve, reject) => {
      // Create unique request ID
      const requestId = `${method}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      
      // Store the request handlers
      pendingPageRequests.set(requestId, {
        resolve: resolve as (result: unknown) => void,
        reject
      });
      
      // Forward to background script
      chrome.runtime.sendMessage(
        { type: method, payload: params, origin: window.location.origin, requestId },
        (response) => {
          if (chrome.runtime.lastError) {
            pendingPageRequests.delete(requestId);
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          
          // If response is immediate (not requiring popup), handle it directly
          if (response?.success) {
            pendingPageRequests.delete(requestId);
            resolve(response.data as T);
          } else if (response?.error && !response.error.includes('Pending user approval')) {
            pendingPageRequests.delete(requestId);
            reject(new Error(response.error));
          }
          // If pending approval, wait for FUN_WALLET_RESPONSE message
        }
      );
      
      // Timeout after 5 minutes
      setTimeout(() => {
        if (pendingPageRequests.has(requestId)) {
          pendingPageRequests.delete(requestId);
          reject(new Error('Request timeout'));
        }
      }, 300000);
    });
  },
  
  /**
   * Legacy send method
   */
  send: (method: string, params?: unknown[]) => {
    return funWalletProvider.request({ method, params });
  },
  
  /**
   * Legacy sendAsync method
   */
  sendAsync: (
    payload: { method: string; params?: unknown[] },
    callback: (error: Error | null, response?: { result: unknown }) => void
  ) => {
    funWalletProvider.request(payload)
      .then((result) => callback(null, { result }))
      .catch((error) => callback(error));
  },
  
  // Event emitter methods
  _events: {} as Record<string, Array<(...args: unknown[]) => void>>,
  
  on: (event: string, callback: (...args: unknown[]) => void) => {
    if (!funWalletProvider._events[event]) {
      funWalletProvider._events[event] = [];
    }
    funWalletProvider._events[event].push(callback);
    return funWalletProvider;
  },
  
  removeListener: (event: string, callback: (...args: unknown[]) => void) => {
    if (funWalletProvider._events[event]) {
      funWalletProvider._events[event] = funWalletProvider._events[event]
        .filter(cb => cb !== callback);
    }
    return funWalletProvider;
  },
  
  removeAllListeners: (event?: string) => {
    if (event) {
      delete funWalletProvider._events[event];
    } else {
      funWalletProvider._events = {};
    }
    return funWalletProvider;
  },
  
  emit: (event: string, ...args: unknown[]) => {
    if (funWalletProvider._events[event]) {
      funWalletProvider._events[event].forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error('[FUN Wallet] Event handler error:', error);
        }
      });
    }
  },
  
  // Legacy method aliases
  enable: () => funWalletProvider.request({ method: 'eth_requestAccounts' }),
};

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle approval responses from popup via background
  if (message.type === 'FUN_WALLET_RESPONSE') {
    const handlers = pendingPageRequests.get(message.requestId);
    if (handlers) {
      pendingPageRequests.delete(message.requestId);
      if (message.error) {
        handlers.reject(new Error(message.error));
      } else {
        handlers.resolve(message.result);
      }
    }
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
      funWalletProvider.chainId = message.chainId;
      funWalletProvider.networkVersion = parseInt(message.chainId, 16).toString();
      funWalletProvider.emit('chainChanged', message.chainId);
      funWalletProvider.emit('networkChanged', funWalletProvider.networkVersion);
      // Forward to page
      window.postMessage({
        type: 'FUN_WALLET_EVENT',
        event: 'chainChanged',
        data: message.chainId,
      }, '*');
      break;
      
    case 'accountsChanged':
      funWalletProvider.selectedAddress = message.accounts?.[0] || null;
      funWalletProvider.emit('accountsChanged', message.accounts);
      // Forward to page
      window.postMessage({
        type: 'FUN_WALLET_EVENT',
        event: 'accountsChanged',
        data: message.accounts,
      }, '*');
      break;
      
    case 'disconnect':
      funWalletProvider.selectedAddress = null;
      funWalletProvider.emit('disconnect', { code: 4900, message: 'Disconnected' });
      window.postMessage({
        type: 'FUN_WALLET_EVENT',
        event: 'disconnect',
        data: { code: 4900, message: 'Disconnected' },
      }, '*');
      break;
      
    case 'connect':
      funWalletProvider.emit('connect', { chainId: funWalletProvider.chainId });
      window.postMessage({
        type: 'FUN_WALLET_EVENT',
        event: 'connect',
        data: { chainId: funWalletProvider.chainId },
      }, '*');
      break;
  }
});

// Inject the provider into the page
function injectProvider() {
  // Create script element to inject into page context
  const script = document.createElement('script');
  script.textContent = `
    (function() {
      // Provider object to be injected
      const provider = {
        isFunWallet: true,
        isMetaMask: false,
        chainId: '0x38',
        networkVersion: '56',
        selectedAddress: null,
        _events: {},
        _pendingRequests: new Map(),
      };
      
      // Request method
      provider.request = async function(args) {
        return new Promise((resolve, reject) => {
          const id = Date.now().toString() + '_' + Math.random().toString(36).slice(2);
          
          provider._pendingRequests.set(id, { resolve, reject });
          
          const handler = (event) => {
            if (event.data.type === 'FUN_WALLET_RESPONSE' && event.data.id === id) {
              window.removeEventListener('message', handler);
              provider._pendingRequests.delete(id);
              if (event.data.error) {
                reject(new Error(event.data.error));
              } else {
                resolve(event.data.result);
              }
            }
          };
          
          window.addEventListener('message', handler);
          
          window.postMessage({
            type: 'FUN_WALLET_REQUEST',
            id,
            method: args.method,
            params: args.params,
          }, '*');
          
          // Timeout after 5 minutes
          setTimeout(() => {
            if (provider._pendingRequests.has(id)) {
              window.removeEventListener('message', handler);
              provider._pendingRequests.delete(id);
              reject(new Error('Request timeout'));
            }
          }, 300000);
        });
      };
      
      // Event handling
      provider.on = function(event, callback) {
        if (!this._events[event]) this._events[event] = [];
        this._events[event].push(callback);
        return this;
      };
      
      provider.removeListener = function(event, callback) {
        if (this._events[event]) {
          this._events[event] = this._events[event].filter(cb => cb !== callback);
        }
        return this;
      };
      
      provider.removeAllListeners = function(event) {
        if (event) {
          delete this._events[event];
        } else {
          this._events = {};
        }
        return this;
      };
      
      provider.emit = function(event, ...args) {
        if (this._events[event]) {
          this._events[event].forEach(cb => {
            try { cb(...args); } catch(e) { console.error('[FUN Wallet] Event error:', e); }
          });
        }
      };
      
      provider.isConnected = function() { return true; };
      provider.enable = function() { return this.request({ method: 'eth_requestAccounts' }); };
      
      // Legacy methods
      provider.send = function(method, params) { return this.request({ method, params }); };
      provider.sendAsync = function(payload, callback) {
        this.request(payload)
          .then(result => callback(null, { result }))
          .catch(error => callback(error));
      };
      
      // Listen for events from content script
      window.addEventListener('message', (event) => {
        if (event.data.type === 'FUN_WALLET_EVENT') {
          provider.emit(event.data.event, event.data.data);
          
          // Update provider state
          if (event.data.event === 'chainChanged') {
            provider.chainId = event.data.data;
            provider.networkVersion = parseInt(event.data.data, 16).toString();
          } else if (event.data.event === 'accountsChanged') {
            provider.selectedAddress = event.data.data?.[0] || null;
          }
        }
      });
      
      // Expose provider
      window.funWallet = provider;
      
      // Also expose as ethereum if no other wallet is present
      if (!window.ethereum) {
        window.ethereum = provider;
      }
      
      // Announce provider (EIP-6963)
      const announceEvent = new CustomEvent('eip6963:announceProvider', {
        detail: Object.freeze({
          info: {
            uuid: 'fun-wallet-extension-' + Date.now(),
            name: 'FUN Wallet',
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🦊</text></svg>',
            rdns: 'app.funwallet',
          },
          provider: provider,
        }),
      });
      
      window.dispatchEvent(announceEvent);
      
      // Listen for provider requests (EIP-6963)
      window.addEventListener('eip6963:requestProvider', () => {
        window.dispatchEvent(announceEvent);
      });
      
      // Dispatch initialization event
      window.dispatchEvent(new Event('fun-wallet#initialized'));
      
      console.log('[FUN Wallet] Provider injected');
    })();
  `;
  
  // Insert script at document start
  const container = document.head || document.documentElement;
  container.insertBefore(script, container.firstChild);
  script.remove();
}

// Handle messages from injected script
window.addEventListener('message', async (event) => {
  if (event.data.type !== 'FUN_WALLET_REQUEST') return;
  
  try {
    const result = await funWalletProvider.request({
      method: event.data.method,
      params: event.data.params,
    });
    
    window.postMessage({
      type: 'FUN_WALLET_RESPONSE',
      id: event.data.id,
      result,
    }, '*');
  } catch (error) {
    window.postMessage({
      type: 'FUN_WALLET_RESPONSE',
      id: event.data.id,
      error: (error as Error).message,
    }, '*');
  }
});

// Inject provider when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectProvider);
} else {
  injectProvider();
}

console.log('[FUN Wallet] Content script loaded');
