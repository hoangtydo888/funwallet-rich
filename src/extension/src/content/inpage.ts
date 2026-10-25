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
