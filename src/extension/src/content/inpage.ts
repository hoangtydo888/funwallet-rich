/**
 * FUN Wallet - Inpage Script
 * 
 * This script runs in the PAGE CONTEXT (not content script context)
 * It provides the EIP-1193 compatible provider that DApps can interact with
 * 
 * Registered by the service worker as a MAIN world script at document_start.
 */

export {};

// Declare window types
declare global {
  interface Window {
    funWallet: typeof provider;
    ethereum?: typeof provider;
  }
}

// Provider object for page context
const provider = {
  isFunWallet: true,
  isMetaMask: false,
  chainId: '0x38', // BSC default
  networkVersion: '56',
  selectedAddress: null as string | null,
  _events: {} as Record<string, Array<(...args: unknown[]) => void>>,
  _pendingRequests: new Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void }>(),

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return true;
  },

  /**
   * Main request method (EIP-1193)
   */
  request: async function<T = unknown>(args: { method: string; params?: unknown[] }): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = Date.now().toString() + '_' + Math.random().toString(36).slice(2);
      
      this._pendingRequests.set(id, { 
        resolve: resolve as (value: unknown) => void, 
        reject 
      });
      
      // Listen for response
      const handler = (event: MessageEvent) => {
        if (event.source !== window || event.origin !== window.location.origin || !event.data) return;
        if (event.data.type === 'FUN_WALLET_RESPONSE' && event.data.id === id) {
        clearTimeout(timer);
          window.removeEventListener('message', handler);
          this._pendingRequests.delete(id);
          
          if (event.data.error) {
            reject(Object.assign(new Error(event.data.error), { code: event.data.code ?? -32603, ...(event.data.data !== undefined ? { data: event.data.data } : {}) }));
          } else {
            if (args.method === 'eth_accounts' || args.method === 'eth_requestAccounts') this.selectedAddress = event.data.result?.[0] || null;
            if (args.method === 'eth_chainId') {
              this.chainId = event.data.result;
              this.networkVersion = parseInt(this.chainId, 16).toString();
            }
            resolve(event.data.result as T);
          }
        }
      };
      
      window.addEventListener('message', handler);
      
      // Send request to content script
      window.postMessage({
        type: 'FUN_WALLET_REQUEST',
        id,
        method: args.method,
        params: args.params,
      }, window.location.origin);
      
      // Timeout after 5 minutes
      const timer = setTimeout(() => {
        if (this._pendingRequests.has(id)) {
          window.removeEventListener('message', handler);
          this._pendingRequests.delete(id);
          reject(Object.assign(new Error('Request timeout'), { code: -32000 }));
        }
      }, 300000);
    });
  },

  /**
   * Event emitter: on
   */
  on(event: string, callback: (...args: unknown[]) => void) {
    if (!this._events[event]) {
      this._events[event] = [];
    }
    this._events[event].push(callback);
    return this;
  },

  /**
   * Event emitter: removeListener
   */
  removeListener(event: string, callback: (...args: unknown[]) => void) {
    if (this._events[event]) {
      this._events[event] = this._events[event].filter(cb => cb !== callback);
    }
    return this;
  },

  /**
   * Event emitter: removeAllListeners
   */
  removeAllListeners(event?: string) {
    if (event) {
      delete this._events[event];
    } else {
      this._events = {};
    }
    return this;
  },

  /**
   * Event emitter: emit
   */
  emit(event: string, ...args: unknown[]) {
    if (this._events[event]) {
      this._events[event].forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error('[FUN Wallet] Event handler error:', error);
        }
      });
    }
  },

  /**
   * Legacy enable method
   */
  enable() {
    return this.request({ method: 'eth_requestAccounts' });
  },

  /**
   * Legacy send method
   */
  send(method: string, params?: unknown[]) {
    return this.request({ method, params });
  },

  /**
   * Legacy sendAsync method
   */
  sendAsync(
    payload: { method: string; params?: unknown[] },
    callback: (error: Error | null, response?: { result: unknown }) => void
  ) {
    this.request(payload)
      .then(result => callback(null, { result }))
      .catch(error => callback(error));
  },
};

// Listen for events from content script
window.addEventListener('message', (event) => {
  if (event.source !== window || event.origin !== window.location.origin || !event.data) return;
  if (event.data.type === 'FUN_WALLET_EVENT') {
    
    // Update provider state
    if (event.data.event === 'chainChanged') {
      provider.chainId = event.data.data;
      provider.networkVersion = parseInt(event.data.data, 16).toString();
    } else if (event.data.event === 'accountsChanged') {
      provider.selectedAddress = event.data.data?.[0] || null;
    } else if (event.data.event === 'disconnect') {
      provider.selectedAddress = null;
    }
    provider.emit(event.data.event, event.data.data);
  }
});

// Detached calls like `const { request } = provider` must keep working.
provider.request = provider.request.bind(provider);

// Never replace a provider that a dApp may already hold a reference to.
if (window.funWallet?.isFunWallet) throw new Error('[FUN Wallet] Provider already injected');

// Expose provider globally
window.funWallet = provider;

// Also expose as ethereum if no other wallet is present
if (!window.ethereum) {
  window.ethereum = provider;
}

// EIP-6963: Announce provider
// FUN Wallet logo; RainbowKit shows this EIP-6963 icon instead of the dApp's configured one.
const iconDataUrl = 'data:image/png;base64,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';

// Provider info theo chuẩn EIP-6963 với UUID cố định
const providerInfo = {
  uuid: crypto.randomUUID(),
  name: 'FUN Wallet',
  icon: iconDataUrl,
  rdns: 'io.funwallet.wallet',  // Chuẩn reverse domain notation
};

// Hàm announce để có thể gọi nhiều lần
function announceProvider() {
  window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
    detail: Object.freeze({
      info: providerInfo,
      provider: provider,
    }),
  }));
}

// 1. Announce ngay lập tức
announceProvider();

// 2. Lắng nghe request từ DApp
window.addEventListener('eip6963:requestProvider', announceProvider);

// 3. Announce sau DOMContentLoaded (cho DApps load chậm)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', announceProvider);
} else if (document.readyState === 'interactive') {
  announceProvider();
}

// 4. Announce với delay cho DApps khởi tạo async
setTimeout(announceProvider, 100);
setTimeout(announceProvider, 500);
setTimeout(announceProvider, 1000);

// Dispatch initialization event
window.dispatchEvent(new Event('fun-wallet#initialized'));

// EIP-1193: emit connect once the wallet reports its chain.
provider.request<string>({ method: 'eth_chainId' })
  .then(chainId => provider.emit('connect', { chainId }))
  .catch(() => {});

console.log('[FUN Wallet] Provider injected successfully');
