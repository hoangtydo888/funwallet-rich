// Etherscan API V2 integration for BSC
const ETHERSCAN_V2_API = "https://api.etherscan.io/v2/api";
const BSC_CHAIN_ID = "56"; // BSC Mainnet

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

// Fetch normal transactions
export const getNormalTransactions = async (
  address: string,
  page: number = 1,
  offset: number = 20
): Promise<Transaction[]> => {
  try {
    const params = new URLSearchParams({
      chainid: BSC_CHAIN_ID,
      module: "account",
      action: "txlist",
      address,
      startblock: "0",
      endblock: "99999999",
      page: page.toString(),
      offset: offset.toString(),
      sort: "desc",
    });

    const response = await fetch(`${ETHERSCAN_V2_API}?${params}`);
    const data = await response.json();

    if (data.status === "1" && data.result) {
      return data.result.map((tx: Record<string, string>) => ({
        ...tx,
        type: "native" as const,
        tokenSymbol: "BNB",
      }));
    }
    return [];
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return [];
  }
};

// Fetch BEP-20 token transactions
export const getTokenTransactions = async (
  address: string,
  page: number = 1,
  offset: number = 20
): Promise<Transaction[]> => {
  try {
    const params = new URLSearchParams({
      chainid: BSC_CHAIN_ID,
      module: "account",
      action: "tokentx",
      address,
      startblock: "0",
      endblock: "99999999",
      page: page.toString(),
      offset: offset.toString(),
      sort: "desc",
    });

    const response = await fetch(`${ETHERSCAN_V2_API}?${params}`);
    const data = await response.json();

    if (data.status === "1" && data.result) {
      return data.result.map((tx: Record<string, string>) => ({
        ...tx,
        type: "token" as const,
      }));
    }
    return [];
  } catch (error) {
    console.error("Error fetching token transactions:", error);
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
    const [nativeTxs, tokenTxs] = await Promise.all([
      getNormalTransactions(address, page, offset),
      getTokenTransactions(address, page, offset),
    ]);

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
