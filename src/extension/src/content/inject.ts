/**
 * FUN Wallet - Content Script
 * 
 * Injects the wallet provider into web pages
 * Implements EIP-1193 compatible provider
 */

// Create the provider object
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
      chrome.runtime.sendMessage(
        { type: method, payload: params, origin: window.location.origin },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          
          if (response?.success) {
            resolve(response.data as T);
          } else {
            reject(new Error(response?.error || 'Request failed'));
          }
        }
      );
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
chrome.runtime.onMessage.addListener((message) => {
  switch (message.type) {
    case 'chainChanged':
      funWalletProvider.chainId = message.chainId;
      funWalletProvider.networkVersion = parseInt(message.chainId, 16).toString();
      funWalletProvider.emit('chainChanged', message.chainId);
      funWalletProvider.emit('networkChanged', funWalletProvider.networkVersion);
      break;
      
    case 'accountsChanged':
      funWalletProvider.selectedAddress = message.accounts[0] || null;
      funWalletProvider.emit('accountsChanged', message.accounts);
      break;
      
    case 'disconnect':
      funWalletProvider.selectedAddress = null;
      funWalletProvider.emit('disconnect', { code: 4900, message: 'Disconnected' });
      break;
      
    case 'connect':
      funWalletProvider.emit('connect', { chainId: funWalletProvider.chainId });
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
      const provider = ${JSON.stringify({
        isFunWallet: true,
        isMetaMask: false,
        chainId: funWalletProvider.chainId,
        networkVersion: funWalletProvider.networkVersion,
      })};
      
      // Proxy to handle method calls
      const providerProxy = new Proxy(provider, {
        get(target, prop) {
          if (prop === 'request') {
            return (args) => {
              return new Promise((resolve, reject) => {
                const id = Date.now().toString();
                
                const handler = (event) => {
                  if (event.data.type === 'FUN_WALLET_RESPONSE' && event.data.id === id) {
                    window.removeEventListener('message', handler);
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
              });
            };
          }
          
          if (prop === 'on' || prop === 'removeListener' || prop === 'emit') {
            // Event handling
            if (!target._events) target._events = {};
            
            if (prop === 'on') {
              return (event, callback) => {
                if (!target._events[event]) target._events[event] = [];
                target._events[event].push(callback);
                return target;
              };
            }
            
            if (prop === 'removeListener') {
              return (event, callback) => {
                if (target._events[event]) {
                  target._events[event] = target._events[event].filter(cb => cb !== callback);
                }
                return target;
              };
            }
            
            if (prop === 'emit') {
              return (event, ...args) => {
                if (target._events && target._events[event]) {
                  target._events[event].forEach(cb => cb(...args));
                }
              };
            }
          }
          
          if (prop === 'enable') {
            return () => providerProxy.request({ method: 'eth_requestAccounts' });
          }
          
          if (prop === 'isConnected') {
            return () => true;
          }
          
          return target[prop];
        }
      });
      
      // Listen for responses from content script
      window.addEventListener('message', (event) => {
        if (event.data.type === 'FUN_WALLET_EVENT') {
          providerProxy.emit(event.data.event, event.data.data);
        }
      });
      
      // Expose provider
      window.funWallet = providerProxy;
      
      // Also expose as ethereum if no other wallet is present
      if (!window.ethereum) {
        window.ethereum = providerProxy;
      }
      
      // Announce provider (EIP-6963)
      const announceEvent = new CustomEvent('eip6963:announceProvider', {
        detail: Object.freeze({
          info: {
            uuid: 'fun-wallet-extension',
            name: 'FUN Wallet',
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🦊</text></svg>',
            rdns: 'app.funwallet',
          },
          provider: providerProxy,
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

// Forward events to page
chrome.runtime.onMessage.addListener((message) => {
  if (['chainChanged', 'accountsChanged', 'disconnect', 'connect'].includes(message.type)) {
    window.postMessage({
      type: 'FUN_WALLET_EVENT',
      event: message.type,
      data: message.type === 'chainChanged' ? message.chainId : 
            message.type === 'accountsChanged' ? message.accounts :
            message.type === 'connect' ? { chainId: message.chainId } :
            undefined,
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
