import { ethers } from 'ethers';
import { chromeStorageAdapter as storage } from '../../storage/ChromeStorageAdapter';
import { STORAGE_KEYS } from '@shared/storage/types';
import { decryptPrivateKey } from '@shared/lib/encryption';
import { DAppConnection, SecureWalletStorage } from '@shared/types';
import { getChainById } from '@shared/constants/chains';
import {
  ApprovalRequest, TransactionReview, RpcTransaction, RpcError, PUBLIC_METHODS, READ_METHODS,
  REQUEST_TTL, pageOrigin, trustedPopup, normalizeTransaction, toEthersTransaction, decodeTokenCall, quantity,
} from '../lib/approval';

type Message = { type: string; payload?: unknown; requestId?: string };
type Response = { success: boolean; data?: unknown; error?: string; code?: number; errorData?: unknown; pending?: boolean };
type Quote = { review: TransactionReview; transaction: ethers.TransactionRequest };
let isLocked = true;
let currentChainId = 56;
let busy = false;
const connections = new Map<string, DAppConnection>();
const pending = new Map<string, ApprovalRequest>();
const quotes = new Map<string, Quote>();
const CONNECT_METHODS = ['eth_requestAccounts', 'wallet_requestPermissions'];
const SWITCH_METHODS = ['wallet_switchEthereumChain', 'wallet_addEthereumChain'];

// MAIN world + document_start: the provider exists before dApp scripts run,
// so FUN Profile detects window.funWallet instead of falling back to the web wallet.
async function registerInpage() {
  const script: chrome.scripting.RegisteredContentScript = {
    id: 'fun-wallet-inpage', js: ['inpage.js'], matches: ['http://*/*', 'https://*/*'],
    runAt: 'document_start', world: 'MAIN', allFrames: false,
  };
  const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [script.id] });
  await (existing.length ? chrome.scripting.updateContentScripts([script]) : chrome.scripting.registerContentScripts([script]));
}

async function initialize() {
  // Content scripts must not read the vault or approval queue directly.
  await chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
  await chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
  const saved = await storage.get(STORAGE_KEYS.DAPP_CONNECTIONS);
  if (saved) for (const connection of JSON.parse(saved)) connections.set(connection.origin, connection);
  const chain = Number(await storage.get(STORAGE_KEYS.CURRENT_CHAIN));
  if (getChainById(chain)) currentChainId = chain;
  const session = await chrome.storage.session.get(STORAGE_KEYS.PENDING_REQUESTS);
  for (const request of (session[STORAGE_KEYS.PENDING_REQUESTS] || []) as ApprovalRequest[]) {
    // Never retry an in-flight broadcast after a worker restart.
    if (!request.status && Date.now() - request.timestamp < REQUEST_TTL) pending.set(request.id, request);
    else await reply(request, undefined, new RpcError(4001, `Yêu cầu đã hết hạn hoặc bị gián đoạn. ${request.submittedHash ? `Tra cứu ${request.submittedHash}. ` : ''}Kiểm tra lịch sử trước khi thử lại.`));
  }
  await persistPending();
  await registerInpage().catch(error => console.error('[FUN Wallet] Cannot register provider', error));
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  await chrome.alarms.create('approval-expiry', { periodInMinutes: 1 });
}
const ready = initialize();

function fail(error: unknown): Response {
  return { success: false, error: error instanceof Error ? error.message : 'Không thể xử lý yêu cầu', code: error instanceof RpcError ? error.code : -32603,
    errorData: (error as { data?: unknown } | null)?.data };
}
function persistPending() {
  return chrome.storage.session.set({ [STORAGE_KEYS.PENDING_REQUESTS]: [...pending.values()] });
}
function saveConnections() { return storage.set(STORAGE_KEYS.DAPP_CONNECTIONS, JSON.stringify([...connections.values()])); }
async function activeAccount() {
  const account = await storage.get(STORAGE_KEYS.ACTIVE_WALLET);
  if (!account || !ethers.isAddress(account)) throw new RpcError(4100, 'Hãy tạo hoặc nhập ví trong FUN Wallet trước');
  return ethers.getAddress(account);
}
async function reply(request: ApprovalRequest, result?: unknown, error?: RpcError) {
  await chrome.tabs.sendMessage(request.tabId, {
    type: 'FUN_WALLET_RESPONSE', requestId: request.clientId, result,
    ...(error ? { error: error.message, code: error.code } : {}),
  }, request.documentId ? { documentId: request.documentId } : { frameId: request.frameId }).catch(() => {});
}
async function finish(request: ApprovalRequest, result?: unknown, error?: RpcError) {
  pending.delete(request.id);
  quotes.delete(request.id);
  await persistPending();
  await reply(request, result, error);
}
function getRequest(id: string, methods?: string[]) {
  const request = pending.get(id);
  if (!request || Date.now() - request.timestamp >= REQUEST_TTL) throw new RpcError(4001, 'Yêu cầu đã hết hạn. Hãy thử lại từ ứng dụng.');
  if (methods && !methods.includes(request.method)) throw new RpcError(4100, 'Sai loại yêu cầu');
  if (request.status) throw new RpcError(-32002, 'Yêu cầu đang được xử lý');
  return request;
}
async function validateContext(request: ApprovalRequest, requireConnection = true) {
  if (request.invalidated) throw new RpcError(4100, 'Trang yêu cầu đã tải lại hoặc đóng');
  if (isLocked) throw new RpcError(4100, 'Ví đã khóa. Mở lại FUN Wallet để tiếp tục.');
  const tab = await chrome.tabs.get(request.tabId);
  if (!tab.url || new URL(tab.url).origin !== request.origin) throw new RpcError(4100, 'Trang yêu cầu đã thay đổi');
  if ((await activeAccount()).toLowerCase() !== request.account.toLowerCase()) throw new RpcError(4100, 'Tài khoản đã thay đổi');
  if (currentChainId !== request.chainId) throw new RpcError(4901, 'Mạng đã thay đổi. Tạo yêu cầu mới.');
  if (requireConnection && !connections.get(request.origin)?.accounts.some(a => a.toLowerCase() === request.account.toLowerCase())) throw new RpcError(4100, 'Ứng dụng chưa được cấp quyền cho tài khoản này');
  if (request.invalidated) throw new RpcError(4100, 'Trang yêu cầu đã tải lại hoặc đóng');
}
async function signer(account: string, password: string) {
  if (!password) throw new RpcError(4100, 'Nhập mật khẩu để xác nhận');
  const raw = await storage.get(STORAGE_KEYS.ENCRYPTED_KEYS);
  const vault: SecureWalletStorage = JSON.parse(raw || '{}');
  const entry = Object.entries(vault.wallets || {}).find(([address]) => address.toLowerCase() === account.toLowerCase());
  if (!entry) throw new RpcError(4100, 'Không tìm thấy khóa của tài khoản');
  let key: string;
  try { key = await decryptPrivateKey(entry[1], password); }
  catch { throw new RpcError(4100, 'Mật khẩu không đúng'); }
  const wallet = new ethers.Wallet(key);
  if (wallet.address.toLowerCase() !== account.toLowerCase()) throw new RpcError(4100, 'Khóa không khớp tài khoản');
  return wallet;
}
async function notifyOrigin(origin: string, type: string, data: Record<string, unknown>) {
  for (const tab of await chrome.tabs.query({})) {
    if (tab.id !== undefined && tab.url && new URL(tab.url).origin === origin) {
      await chrome.tabs.sendMessage(tab.id, { type, ...data }, { frameId: 0 }).catch(() => {});
    }
  }
}
function permissions(origin: string, accounts: string[]) {
  const connection = connections.get(origin);
  return connection && accounts.length ? [{
    invoker: origin, parentCapability: 'eth_accounts', date: connection.connectedAt,
    caveats: [{ type: 'restrictReturnedAccounts', value: accounts }],
  }] : [];
}
async function connectedAccounts(origin: string) {
  if (isLocked) return [];
  const active = await storage.get(STORAGE_KEYS.ACTIVE_WALLET);
  return (connections.get(origin)?.accounts || []).filter(a => a.toLowerCase() === active?.toLowerCase());
}
async function readRpc(method: string, params: unknown) {
  if (params !== undefined && !Array.isArray(params)) throw new RpcError(-32602, 'Params phải là mảng');
  const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method, params: params ?? [] });
  if (body.length > 262144) throw new RpcError(-32602, 'Yêu cầu quá lớn');
  const response = await fetch(getChainById(currentChainId)!.rpcUrl, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: AbortSignal.timeout(20_000),
  }).catch(() => { throw new RpcError(-32603, 'Không kết nối được RPC'); });
  const json = await response.json().catch(() => null) as { result?: unknown; error?: { code?: number; message?: string; data?: unknown } } | null;
  if (!json) throw new RpcError(-32603, `RPC lỗi ${response.status}`);
  if (json.error) throw Object.assign(new RpcError(typeof json.error.code === 'number' ? json.error.code : -32603, json.error.message || 'RPC lỗi'), { data: json.error.data });
  return json.result ?? null;
}
async function openApproval(request: ApprovalRequest) {
  // An async dApp request may no longer carry Chrome's required user gesture.
  try { await chrome.sidePanel.open({ tabId: request.tabId }); return; }
  catch (error) { console.warn('[FUN Wallet] Side panel unavailable, using popup', error); }
  const tab = await chrome.tabs.get(request.tabId);
  const browserWindow = await chrome.windows.get(tab.windowId);
  const width = 420;
  const base = { url: chrome.runtime.getURL(`popup.html?surface=approval#/request?requestId=${request.id}`), type: 'popup' as const, width, height: 640, focused: true };
  // Align with the browser's right edge like MetaMask. Chrome rejects bounds that are
  // mostly off-screen (fullscreen windows, multiple monitors), so then let it place the popup.
  const window = await chrome.windows.create({
    ...base, height: Math.min(760, browserWindow.height || 760),
    top: Math.max(browserWindow.top || 0, 0),
    left: Math.max((browserWindow.left || 0) + (browserWindow.width || 1200) - width, 0),
  }).catch(() => chrome.windows.create(base));
  if (pending.has(request.id)) { request.windowId = window.id; await persistPending(); }
}
async function queue(message: Message, sender: chrome.runtime.MessageSender, origin: string, account: string, params: unknown[]) {
  if ([...pending.values()].some(r => r.tabId === sender.tab!.id)) throw new RpcError(-32002, 'Ứng dụng đã có yêu cầu đang chờ. Hãy xử lý yêu cầu đó trước.');
  if (pending.size >= 8) throw new RpcError(-32002, 'Có quá nhiều yêu cầu đang chờ');
  const request: ApprovalRequest = {
    id: crypto.randomUUID(), clientId: message.requestId!, method: message.type, params, origin,
    account, chainId: currentChainId, tabId: sender.tab!.id!, frameId: sender.frameId!,
    documentId: sender.documentId, timestamp: Date.now(),
    siteIcon: sender.tab?.favIconUrl?.startsWith('https://') ? sender.tab.favIconUrl : undefined,
  };
  pending.set(request.id, request);
  await persistPending();
  try { await openApproval(request); }
  catch (error) {
    console.error('[FUN Wallet] Cannot open approval', error);
    await finish(request, undefined, new RpcError(4001, 'Không thể mở cửa sổ duyệt'));
  }
  return { success: true, pending: true };
}
async function handlePage(message: Message, sender: chrome.runtime.MessageSender): Promise<Response> {
  const origin = pageOrigin(sender, chrome.runtime.id);
  if (!PUBLIC_METHODS.has(message.type)) throw new RpcError(4200, 'Phương thức không được hỗ trợ');
  if (typeof message.requestId !== 'string' || message.requestId.length > 150) throw new RpcError(-32602, 'Request ID không hợp lệ');
  if (message.type === 'eth_chainId') return { success: true, data: ethers.toQuantity(currentChainId) };
  if (message.type === 'net_version') return { success: true, data: String(currentChainId) };
  if (message.type === 'web3_clientVersion') return { success: true, data: `FUNWallet/v${chrome.runtime.getManifest().version}` };
  if (message.type === 'eth_accounts') return { success: true, data: await connectedAccounts(origin) };
  if (message.type === 'wallet_getPermissions') return { success: true, data: permissions(origin, await connectedAccounts(origin)) };
  if (message.type === 'wallet_revokePermissions') {
    if (connections.delete(origin)) {
      await saveConnections();
      await notifyOrigin(origin, 'accountsChanged', { accounts: [] });
    }
    return { success: true, data: null };
  }
  if (READ_METHODS.has(message.type)) return { success: true, data: await readRpc(message.type, message.payload) };
  const account = await activeAccount();
  const authorized = connections.get(origin)?.accounts.some(a => a.toLowerCase() === account.toLowerCase());
  if (message.type === 'eth_requestAccounts') {
    if (authorized && !isLocked) return { success: true, data: [account] };
    return queue(message, sender, origin, account, []);
  }
  const params = message.payload;
  if (!Array.isArray(params)) throw new RpcError(-32602, 'Params phải là mảng');
  if (message.type === 'wallet_requestPermissions') {
    const requested = params[0];
    if (!requested || typeof requested !== 'object' || Object.keys(requested).join() !== 'eth_accounts') throw new RpcError(-32602, 'Chỉ hỗ trợ quyền eth_accounts');
    return queue(message, sender, origin, account, []);
  }
  if (!authorized) throw new RpcError(4100, 'Kết nối tài khoản trước khi yêu cầu ký');
  if (SWITCH_METHODS.includes(message.type)) {
    const chainId = Number(BigInt(quantity(params[0]?.chainId, 'chainId')));
    if (!getChainById(chainId)) throw new RpcError(message.type === 'wallet_addEthereumChain' ? 4200 : 4902, 'Mạng chưa được hỗ trợ trong FUN Wallet');
    if (chainId === currentChainId) return { success: true, data: null };
    return queue(message, sender, origin, account, [{ chainId }]);
  }
  if (message.type === 'eth_sendTransaction') {
    if (params.length !== 1) throw new RpcError(-32602, 'Chỉ hỗ trợ một giao dịch mỗi yêu cầu');
    return queue(message, sender, origin, account, [normalizeTransaction(params[0], account, currentChainId)]);
  }
  let address = message.type === 'personal_sign' ? params[1] : params[0];
  let content = message.type === 'personal_sign' ? params[0] : params[1];
  if (message.type === 'personal_sign') {
    // Like MetaMask, accept [address, message] and plain UTF-8 text.
    if (typeof content === 'string' && ethers.isAddress(content) && !(typeof address === 'string' && ethers.isAddress(address))) [address, content] = [content, address];
    if (typeof content === 'string' && !ethers.isHexString(content)) content = ethers.hexlify(ethers.toUtf8Bytes(content));
  } else if (content && typeof content === 'object') content = JSON.stringify(content);
  if (params.length < 2 || typeof address !== 'string' || address.toLowerCase() !== account.toLowerCase() || typeof content !== 'string' || content.length > 131072) throw new RpcError(-32602, 'Yêu cầu ký không hợp lệ');
  if (message.type === 'personal_sign' && !ethers.isHexString(content, true)) throw new RpcError(-32602, 'Thông điệp personal_sign phải là dữ liệu hex');
  if (message.type === 'eth_signTypedData_v4') {
    const typed = JSON.parse(content);
    if (!typed.domain || !typed.types || !typed.message) throw new RpcError(-32602, 'Typed data không hợp lệ');
    if (typed.domain.chainId !== undefined && BigInt(typed.domain.chainId) !== BigInt(currentChainId)) throw new RpcError(4901, 'Typed data không khớp mạng');
  }
  return queue(message, sender, origin, account, [content]);
}
async function reviewTransaction(request: ApprovalRequest): Promise<TransactionReview> {
  await validateContext(request);
  const chain = getChainById(request.chainId)!;
  const provider = new ethers.JsonRpcProvider(chain.rpcUrl);
  try {
    if ((await provider.getNetwork()).chainId !== BigInt(request.chainId)) throw new Error('RPC trả về sai mạng');
    const tx = request.params[0] as RpcTransaction;
    const transaction: ethers.TransactionRequest = { ...toEthersTransaction(tx), chainId: request.chainId };
    const estimatedGas = await provider.estimateGas(transaction);
    transaction.gasLimit ??= estimatedGas * 120n / 100n;
    if (BigInt(transaction.gasLimit) < estimatedGas) throw new Error('Gas limit thấp hơn ước tính');
    if (transaction.gasPrice == null && transaction.maxFeePerGas == null) {
      const fees = await provider.getFeeData();
      if (fees.maxFeePerGas && fees.maxPriorityFeePerGas !== null) {
        transaction.maxFeePerGas = fees.maxFeePerGas;
        transaction.maxPriorityFeePerGas = fees.maxPriorityFeePerGas;
      } else if (fees.gasPrice) transaction.gasPrice = fees.gasPrice;
      else throw new Error('Không lấy được phí mạng');
    }
    if (transaction.maxFeePerGas != null && transaction.maxPriorityFeePerGas === undefined) transaction.maxPriorityFeePerGas = 0n;
    const fee = BigInt(transaction.gasLimit) * BigInt(transaction.maxFeePerGas ?? transaction.gasPrice!);
    if ((await provider.getBalance(request.account)) < BigInt(tx.value) + fee) throw new Error('Không đủ số dư trả giá trị giao dịch và phí mạng');
    const decoded = decodeTokenCall(tx.data);
    const review: TransactionReview = {
      id: crypto.randomUUID(), expiresAt: Math.min(Date.now() + 60_000, request.timestamp + REQUEST_TTL),
      kind: tx.data === '0x' ? 'native' : 'contract', recipient: tx.to,
      amount: ethers.formatEther(tx.value), nativeAmount: ethers.formatEther(tx.value), symbol: chain.symbol,
      unlimited: false, fee: ethers.formatEther(fee),
    };
    if (decoded) {
      const token = new ethers.Contract(tx.to, ['function decimals() view returns (uint8)', 'function symbol() view returns (string)'], provider);
      const [decimals, symbol] = await Promise.all([token.decimals(), token.symbol()]);
      if (typeof symbol !== 'string' || !/^[\p{L}\p{N} ._$-]{1,32}$/u.test(symbol)) throw new Error('Không đọc được ký hiệu token an toàn');
      Object.assign(review, { kind: decoded.kind, recipient: decoded.recipient, contract: tx.to,
        amount: ethers.formatUnits(decoded.rawAmount, Number(decimals)), symbol,
        unlimited: decoded.kind === 'approve' && decoded.rawAmount === ethers.MaxUint256 });
    }
    getRequest(request.id, ['eth_sendTransaction']);
    quotes.set(request.id, { review, transaction });
    return review;
  } finally { provider.destroy(); }
}
async function approve(request: ApprovalRequest, payload: { password?: string; reviewId?: string }) {
  if (busy) throw new RpcError(-32002, 'Ví đang xử lý yêu cầu khác');
  busy = true;
  request.status = 'processing';
  let broadcastStarted = false;
  try {
    await validateContext(request, !CONNECT_METHODS.includes(request.method));
    await persistPending();
    if (CONNECT_METHODS.includes(request.method)) {
      connections.set(request.origin, { origin: request.origin, name: new URL(request.origin).hostname,
        accounts: [request.account], chainId: request.chainId, connectedAt: Date.now(), permissions: ['eth_accounts'] });
      await saveConnections();
      const result = request.method === 'eth_requestAccounts' ? [request.account] : permissions(request.origin, [request.account]);
      await finish(request, result);
      await notifyOrigin(request.origin, 'accountsChanged', { accounts: [request.account] });
      return result;
    }
    if (SWITCH_METHODS.includes(request.method)) {
      currentChainId = (request.params[0] as { chainId: number }).chainId;
      await storage.set(STORAGE_KEYS.CURRENT_CHAIN, String(currentChainId));
      await finish(request, null);
      for (const origin of connections.keys()) await notifyOrigin(origin, 'chainChanged', { chainId: ethers.toQuantity(currentChainId) });
      return null;
    }
    const wallet = await signer(request.account, payload.password || '');
    await validateContext(request);
    if (Date.now() - request.timestamp >= REQUEST_TTL) throw new RpcError(4001, 'Yêu cầu đã hết hạn');
    if (request.method === 'eth_sendTransaction') {
      const quote = quotes.get(request.id);
      if (!quote || quote.review.id !== payload.reviewId || quote.review.expiresAt <= Date.now()) throw new Error('Ước tính đã hết hạn. Tải lại phí trước khi xác nhận.');
      const provider = new ethers.JsonRpcProvider(getChainById(request.chainId)!.rpcUrl);
      try {
        if ((await provider.getNetwork()).chainId !== BigInt(request.chainId)) throw new Error('RPC trả về sai mạng');
        await validateContext(request);
        if (quote.review.expiresAt <= Date.now()) throw new Error('Ước tính đã hết hạn. Tải lại phí.');
        const transaction = await wallet.connect(provider).populateTransaction(quote.transaction);
        await validateContext(request);
        if (Date.now() - request.timestamp >= REQUEST_TTL) throw new Error('Yêu cầu đã hết hạn');
        const signed = await wallet.signTransaction(transaction);
        await validateContext(request);
        const hash = ethers.keccak256(signed);
        request.submittedHash = hash;
        await persistPending();
        await validateContext(request);
        broadcastStarted = true;
        try { await provider.broadcastTransaction(signed); }
        catch {
          await finish(request, undefined, new RpcError(-32000, `Chưa xác định trạng thái phát giao dịch ${hash}. Kiểm tra explorer trước khi gửi lại.`));
          throw new Error(`Chưa xác định trạng thái phát giao dịch. Tra cứu ${hash} trước khi gửi lại.`);
        }
        await finish(request, hash);
        return hash;
      } finally { provider.destroy(); }
    }
    let signature: string;
    if (request.method === 'personal_sign') signature = await wallet.signMessage(ethers.getBytes(request.params[0] as string));
    else {
      const typed = JSON.parse(request.params[0] as string);
      const types = { ...typed.types }; delete types.EIP712Domain;
      signature = await wallet.signTypedData(typed.domain, types, typed.message);
    }
    await validateContext(request);
    await finish(request, signature);
    return signature;
  } finally {
    busy = false;
    if (!broadcastStarted && pending.has(request.id)) { delete request.status; await persistPending(); }
  }
}
async function handlePopup(message: Message): Promise<Response> {
  const payload = (message.payload || {}) as { requestId?: string; password?: string; reviewId?: string; origin?: string };
  switch (message.type) {
    case 'IS_UNLOCKED': return { success: true, data: { unlocked: !isLocked } };
    case 'UNLOCK_WALLET': {
      const account = await activeAccount();
      await signer(account, payload.password);
      isLocked = false;
      await storage.set(STORAGE_KEYS.LAST_ACTIVITY, String(Date.now()));
      // Sites that already hold permission reconnect on unlock, as in MetaMask.
      const autoApproved: string[] = [];
      for (const request of [...pending.values()]) {
        if (request.method === 'eth_requestAccounts' && !request.status && request.account.toLowerCase() === account.toLowerCase()
          && connections.get(request.origin)?.accounts.some(a => a.toLowerCase() === account.toLowerCase())) {
          await finish(request, [account]);
          autoApproved.push(request.id);
        }
      }
      for (const origin of connections.keys()) {
        const accounts = await connectedAccounts(origin);
        if (accounts.length) await notifyOrigin(origin, 'accountsChanged', { accounts });
      }
      return { success: true, data: { autoApproved } };
    }
    case 'LOCK_WALLET':
      isLocked = true;
      for (const origin of connections.keys()) await notifyOrigin(origin, 'accountsChanged', { accounts: [] });
      return { success: true };
    case 'GET_ACCOUNTS': return { success: true, data: isLocked ? [] : [await activeAccount()] };
    case 'GET_CURRENT_CHAIN': return { success: true, data: ethers.toQuantity(currentChainId) };
    case 'GET_NEXT_PENDING': return { success: true, data: [...pending.values()].find(r => !r.status && Date.now() - r.timestamp < REQUEST_TTL) || null };
    case 'GET_PENDING_REQUEST': return { success: true, data: getRequest(payload.requestId) };
    case 'REVIEW_TRANSACTION': return { success: true, data: await reviewTransaction(getRequest(payload.requestId, ['eth_sendTransaction'])) };
    case 'APPROVE_CONNECTION': return { success: true, data: await approve(getRequest(payload.requestId, [...CONNECT_METHODS, ...SWITCH_METHODS]), payload) };
    case 'APPROVE_TRANSACTION': return { success: true, data: await approve(getRequest(payload.requestId, ['eth_sendTransaction']), payload) };
    case 'APPROVE_SIGN': return { success: true, data: await approve(getRequest(payload.requestId, ['personal_sign', 'eth_signTypedData_v4']), payload) };
    case 'REJECT_CONNECTION': case 'REJECT_TRANSACTION': case 'REJECT_SIGN': {
      const request = getRequest(payload.requestId);
      await finish(request, undefined, new RpcError(4001, 'Người dùng từ chối yêu cầu'));
      return { success: true };
    }
    case 'GET_CONNECTED_DAPPS': return { success: true, data: [...connections.values()] };
    case 'DISCONNECT_DAPP': case 'DISCONNECT_ALL_DAPPS': {
      const origins = message.type === 'DISCONNECT_ALL_DAPPS' ? [...connections.keys()] : [payload.origin];
      for (const origin of origins) {
        connections.delete(origin);
        for (const request of [...pending.values()]) if (request.origin === origin && !request.status) await finish(request, undefined, new RpcError(4100, 'Kết nối đã thu hồi'));
        await notifyOrigin(origin, 'accountsChanged', { accounts: [] });
      }
      await saveConnections();
      return { success: true };
    }
    default: throw new RpcError(4200, 'Phương thức không được hỗ trợ');
  }
}
chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  void (async () => {
    await ready;
    const lastActivity = Number(await storage.get(STORAGE_KEYS.LAST_ACTIVITY));
    if (!lastActivity || Date.now() - lastActivity > 15 * 60_000) isLocked = true;
    if (!message || typeof message.type !== 'string') throw new RpcError(-32602, 'Yêu cầu không hợp lệ');
    return trustedPopup(sender, chrome.runtime.id, chrome.runtime.getURL('popup.html'))
      ? handlePopup(message) : handlePage(message, sender);
  })().then(sendResponse).catch(error => sendResponse(fail(error)));
  return true;
});
chrome.alarms.onAlarm.addListener(() => {
  void ready.then(async () => {
    for (const request of [...pending.values()]) if (!request.status && Date.now() - request.timestamp >= REQUEST_TTL) await finish(request, undefined, new RpcError(4001, 'Yêu cầu đã hết hạn'));
  });
});
chrome.windows.onRemoved.addListener(windowId => {
  void ready.then(async () => {
    for (const request of [...pending.values()]) if (request.windowId === windowId && !request.status) await finish(request, undefined, new RpcError(4001, 'Người dùng đóng cửa sổ duyệt'));
  });
});
chrome.tabs.onRemoved.addListener(tabId => {
  void ready.then(async () => {
    for (const request of [...pending.values()]) if (request.tabId === tabId) {
      request.invalidated = true;
      if (!request.status) await finish(request, undefined, new RpcError(4001, 'Tab yêu cầu đã đóng'));
    }
  });
});
chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status !== 'loading') return;
  void ready.then(async () => {
    for (const request of [...pending.values()]) if (request.tabId === tabId) {
      request.invalidated = true;
      if (!request.status) await finish(request, undefined, new RpcError(4100, 'Trang yêu cầu đã tải lại'));
    }
  });
});
