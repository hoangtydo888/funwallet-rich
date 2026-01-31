/**
 * FUN Wallet - Inpage Script
 * 
 * This script runs in the PAGE CONTEXT (not content script context)
 * It provides the EIP-1193 compatible provider that DApps can interact with
 * 
 * Loaded as external script to bypass CSP restrictions
 */

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
        if (event.data.type === 'FUN_WALLET_RESPONSE' && event.data.id === id) {
          window.removeEventListener('message', handler);
          this._pendingRequests.delete(id);
          
          if (event.data.error) {
            reject(new Error(event.data.error));
          } else {
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
      }, '*');
      
      // Timeout after 5 minutes
      setTimeout(() => {
        if (this._pendingRequests.has(id)) {
          window.removeEventListener('message', handler);
          this._pendingRequests.delete(id);
          reject(new Error('Request timeout'));
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
  if (event.data.type === 'FUN_WALLET_EVENT') {
    provider.emit(event.data.event, event.data.data);
    
    // Update provider state
    if (event.data.event === 'chainChanged') {
      provider.chainId = event.data.data;
      provider.networkVersion = parseInt(event.data.data, 16).toString();
    } else if (event.data.event === 'accountsChanged') {
      provider.selectedAddress = event.data.data?.[0] || null;
    } else if (event.data.event === 'disconnect') {
      provider.selectedAddress = null;
    }
  }
});

// Expose provider globally
window.funWallet = provider;

// Also expose as ethereum if no other wallet is present
if (!window.ethereum) {
  window.ethereum = provider;
}

// EIP-6963: Announce provider
const iconDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAAEkElEQVR4nO2bW4hVVRjHf+OYY5qXvJRpZl7SHtKyIoLKCOqhIIhepDe7PAQF9dJDRBdC6KEuUD1EQReCrpRBRUQXetFurEuXoUJH0xwd7+N45szpYa3D7Dn7ss/eZ58958z+w2IG1t5r/f/f+ta31l57QUFBQUFBQUGnMQU4G7gQWALMB6YBk4FxQD/QCxwBeoADwE5gG/A18Bmwv91K5uF04HngAMEB15vdBdwLnNYuJfPiOuBHwgNttjmwHFjRDoXjYjpwN3AI/0CnlQ3AL8CVwJh2KB2FScAGwgObrHkB2Kfuc2nXAIfwD2xpn8uBp1XZxwnWA78RHuBE+wQ4y5c+eYKkwj7f4D6vUZZDvuQIJBGSKr8DP6j/XwZcpH5LJr8bGNsubcNZhZoZHwbWqvOZwD/q95+Bc9uhZBC+Ba7Ae9V/CHhY/T4P2K1++x6Y0w4lg5gJvEHlNf8YcKn6/S/genVuMnC4ncrGYRLwFnAE70f/J8o3wAwVBdcDN6jzS4Bf261oFNYBR9X5J4C71O9HgTeAS9T/dwKr2qNedFYCpwA9eCN+I7C9bBz4LzC0nUrGZQGwEW/FMgf4BlWzwPvARe1TMj7TgU+B4Xg/+r8L3Kp+Xwx80S4l0zA8rjMN+BY4Be/H/w/A7e1SNg/mA1tV2WP4VoHNwMx2KpoXZwAfqbJH8D7+TwC3qfPnAV+2U9ksmA18qsru57cZQC/wELBQnV8BfNdOZbNiDvAB3o+/G/gIWKh+nwvsaaeyeXAG3qLnONAFfIW3I1zeFOAn4OJ2K5sV04DPgH+B43jXwfXq/DTg53YrmyeTgO+ByuJnB3CHOj8FOKGN+uXGJOBbvAGvbHzeBC5W56cDJ9upbJ5MAXapt87JeL/4NqnzE4HBdiqbN5OAPXgD/p+IZUTOBwbaqWwRmAzsBU7iDXx1I3gycLydyhaBycAB4CTeK/6usvOAf9upbBGYChzGuwqcBOwvOw/4u53KFoGJwBG8AS8vcr7Du/KDNuhWFMbjDXhlkfMdcJlq34e3EhxqOKgGGAe8jTfglUXOJuCasv4j0MYnoqJwCt5d4CTet8CtuHLsgQPQGNeCjHK8MBrYTuVy2SigB47xwsngdKBbvXlO4gu8XNU+hLZ+JTasZY/1E3lPNJjjF1AdBuA1NZ2HA9n/5NduA9pnZVHzJfAdquQMvJ0hW9oGVPkeaJ8sF1Mu31KxXJ6xfA+0f6zLt8AbeTu1fAGt+xpoX1p5C6xg91i+B9rXGHkLrCFaexpo38wW3QKZynaB9y3u/dYGe6B94BbYBUZqDyT3lm+BNkBw4Dn0tneB0dqjCL0FNlAtfpL2QHJD+RZo47XAEqp/D7SvMfIWWEF4D4Qteo6S1wNNkPdAsgi5D1j+HmhfY8R+D7TeJWaL3gJrSO0tMGQPpHyA3AMtHQKj+B5IlrBbYCP3QDJnuQ/IaA8k78J9QOEPxdoFNnMPJPeg/Eu0eiC5F/0fCvdA0v+Qdlq6B5LbfQ+06BZYQf8L/gP8C+X/kP+T/gAAAABJRU5ErkJggg==';

// Provider info theo chuẩn EIP-6963 với UUID cố định
const providerInfo = {
  uuid: '550e8400-e29b-41d4-a716-446655440000',  // Fixed UUID
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

console.log('[FUN Wallet] Provider injected successfully');
