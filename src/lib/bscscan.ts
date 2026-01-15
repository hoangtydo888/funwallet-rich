// BSCScan API integration via Edge Function Proxy (bypasses CORS)
const BSCSCAN_PROXY_URL = "https://xavgatuwiaeewdfpkycn.supabase.co/functions/v1/bscscan-proxy";

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp: string;
  blockNumber: string;
  gasUsed: string;
  gasPrice: string;
  isError: string;
  txreceipt_status: string;
  tokenSymbol?: string;
  tokenDecimal?: string;
  tokenName?: string;
  contractAddress?: string;
  type: "native" | "token";
}

// Fetch normal transactions via Edge Function
export const getNormalTransactions = async (
  address: string,
  page: number = 1,
  offset: number = 50
): Promise<Transaction[]> => {
  try {
    console.log("[BSCScan] Fetching normal txs for:", address);
    
    const response = await fetch(BSCSCAN_PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, action: "txlist", page, offset }),
    });

    const data = await response.json();
    console.log("[BSCScan] Normal txs response:", {
      status: data.status,
      message: data.message,
      count: Array.isArray(data.result) ? data.result.length : 0,
    });

    if (data.status === "1" && Array.isArray(data.result)) {
      return data.result.map((tx: Record<string, string>) => ({
        ...tx,
        type: "native" as const,
        tokenSymbol: "BNB",
      }));
    }
    return [];
  } catch (error) {
    console.error("[BSCScan] Error fetching normal transactions:", error);
    return [];
  }
};

// Fetch BEP-20 token transactions via Edge Function
export const getTokenTransactions = async (
  address: string,
  page: number = 1,
  offset: number = 50
): Promise<Transaction[]> => {
  try {
    console.log("[BSCScan] Fetching token txs for:", address);
    
    const response = await fetch(BSCSCAN_PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, action: "tokentx", page, offset }),
    });

    const data = await response.json();
    console.log("[BSCScan] Token txs response:", {
      status: data.status,
      message: data.message,
      count: Array.isArray(data.result) ? data.result.length : 0,
    });

    if (data.status === "1" && Array.isArray(data.result)) {
      return data.result.map((tx: Record<string, string>) => ({
        ...tx,
        type: "token" as const,
      }));
    }
    return [];
  } catch (error) {
    console.error("[BSCScan] Error fetching token transactions:", error);
    return [];
  }
};

// Get all transactions (native + tokens)
export const getAllTransactions = async (
  address: string,
  page: number = 1,
  offset: number = 10
): Promise<Transaction[]> => {
  try {
    console.log("[BSCScan] Fetching transactions for:", address);
    
    const [nativeTxs, tokenTxs] = await Promise.all([
      getNormalTransactions(address, page, offset),
      getTokenTransactions(address, page, offset),
    ]);

    console.log("[BSCScan] Found:", {
      native: nativeTxs.length,
      token: tokenTxs.length,
    });

    // Combine and sort by timestamp
    const allTxs = [...nativeTxs, ...tokenTxs].sort(
      (a, b) => parseInt(b.timeStamp) - parseInt(a.timeStamp)
    );

    return allTxs;
  } catch (error) {
    console.error("Error fetching all transactions:", error);
    return [];
  }
};

// Format transaction value
export const formatTxValue = (value: string, decimals: number = 18): string => {
  const val = parseFloat(value) / Math.pow(10, decimals);
  if (val === 0) return "0";
  if (val < 0.0001) return "<0.0001";
  return val.toFixed(4);
};

// Get transaction direction
export const getTxDirection = (
  tx: Transaction,
  walletAddress: string
): "in" | "out" => {
  return tx.from.toLowerCase() === walletAddress.toLowerCase() ? "out" : "in";
};

// Format timestamp
export const formatTimestamp = (timestamp: string): string => {
  const date = new Date(parseInt(timestamp) * 1000);
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
