// WalletConnect integration utilities
// Note: Full WalletConnect requires @walletconnect/web3wallet package
// This is a simplified implementation for demonstration

export interface WalletConnectSession {
  id: string;
  topic: string;
  peerName: string;
  peerUrl: string;
  peerIcon?: string;
  chainId: number;
  accounts: string[];
  expiry: number;
  connected: boolean;
}

export interface WalletConnectRequest {
  id: number;
  topic: string;
  method: string;
  params: unknown[];
  chainId: number;
}

// Storage keys
const SESSIONS_KEY = "wc_sessions";

// Get all active sessions
export const getSessions = (): WalletConnectSession[] => {
  try {
    const stored = localStorage.getItem(SESSIONS_KEY);
    if (!stored) return [];
    const sessions = JSON.parse(stored) as WalletConnectSession[];
    // Filter out expired sessions
    const now = Date.now();
    return sessions.filter((s) => s.expiry > now);
  } catch {
    return [];
  }
};

// Save sessions
export const saveSessions = (sessions: WalletConnectSession[]) => {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
};

// Add a new session
export const addSession = (session: WalletConnectSession) => {
  const sessions = getSessions();
  sessions.push(session);
  saveSessions(sessions);
};

// Remove a session
export const removeSession = (topic: string) => {
  const sessions = getSessions().filter((s) => s.topic !== topic);
  saveSessions(sessions);
};

// Parse WalletConnect URI
export const parseWalletConnectUri = (uri: string): { version: number; topic: string; relay: string; key: string } | null => {
  try {
    // WalletConnect v2 URI format: wc:topic@version?relay-protocol=irn&symKey=key
    if (!uri.startsWith("wc:")) return null;
    
    const withoutPrefix = uri.slice(3);
    const [topicVersion, params] = withoutPrefix.split("?");
    const [topic, version] = topicVersion.split("@");
    
    const searchParams = new URLSearchParams(params);
    const relay = searchParams.get("relay-protocol") || "irn";
    const key = searchParams.get("symKey") || "";
    
    return {
      version: parseInt(version) || 2,
      topic,
      relay,
      key,
    };
  } catch {
    return null;
  }
};

// Simulate connecting to a DApp
export const simulateConnect = async (
  uri: string,
  walletAddress: string,
  chainId: number
): Promise<WalletConnectSession | null> => {
  const parsed = parseWalletConnectUri(uri);
  if (!parsed) return null;
  
  // Simulate connection delay
  await new Promise((resolve) => setTimeout(resolve, 1500));
  
  // Create mock session
  const session: WalletConnectSession = {
    id: `session_${Date.now()}`,
    topic: parsed.topic,
    peerName: "Demo DApp",
    peerUrl: "https://demo.dapp.example",
    peerIcon: undefined,
    chainId,
    accounts: [walletAddress],
    expiry: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    connected: true,
  };
  
  addSession(session);
  return session;
};

// Disconnect from a session
export const disconnectSession = async (topic: string): Promise<boolean> => {
  try {
    await new Promise((resolve) => setTimeout(resolve, 500));
    removeSession(topic);
    return true;
  } catch {
    return false;
  }
};

// Format expiry time
export const formatExpiry = (expiry: number): string => {
  const now = Date.now();
  const diff = expiry - now;
  
  if (diff <= 0) return "Expired";
  
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
};

// Supported WalletConnect methods
export const SUPPORTED_METHODS = [
  "eth_sendTransaction",
  "eth_signTransaction",
  "eth_sign",
  "personal_sign",
  "eth_signTypedData",
  "eth_signTypedData_v3",
  "eth_signTypedData_v4",
];

// Check if method is supported
export const isMethodSupported = (method: string): boolean => {
  return SUPPORTED_METHODS.includes(method);
};
