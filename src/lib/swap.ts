import { ethers } from "ethers";
import { getProvider, COMMON_TOKENS, ERC20_ABI } from "./wallet";

// PancakeSwap Router V2 on BSC
export const PANCAKE_ROUTER = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
export const WBNB_ADDRESS = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";

// PancakeSwap Router ABI
export const PANCAKE_ROUTER_ABI = [
  "function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)",
  "function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)",
  "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)",
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)",
];

// Swap tokens available
export const SWAP_TOKENS = [
  { symbol: "BNB", name: "BNB", address: WBNB_ADDRESS, decimals: 18, isNative: true },
  { symbol: "USDT", name: "Tether USD", address: "0x55d398326f99059fF775485246999027B3197955", decimals: 18 },
  { symbol: "USDC", name: "USD Coin", address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", decimals: 18 },
  { symbol: "BUSD", name: "Binance USD", address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", decimals: 18 },
  { symbol: "CAKE", name: "PancakeSwap", address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82", decimals: 18 },
  { symbol: "ETH", name: "Ethereum", address: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8", decimals: 18 },
];

// Get quote for swap
export const getSwapQuote = async (
  amountIn: string,
  tokenIn: typeof SWAP_TOKENS[0],
  tokenOut: typeof SWAP_TOKENS[0]
): Promise<{ amountOut: string; path: string[]; priceImpact: string } | null> => {
  try {
    const provider = getProvider();
    const router = new ethers.Contract(PANCAKE_ROUTER, PANCAKE_ROUTER_ABI, provider);

    const amountInWei = ethers.parseUnits(amountIn, tokenIn.decimals);
    const path = tokenIn.isNative
      ? [WBNB_ADDRESS, tokenOut.address]
      : tokenOut.isNative
      ? [tokenIn.address, WBNB_ADDRESS]
      : [tokenIn.address, WBNB_ADDRESS, tokenOut.address];

    const amounts = await router.getAmountsOut(amountInWei, path);
    const amountOut = ethers.formatUnits(amounts[amounts.length - 1], tokenOut.decimals);

    // Calculate simple price impact (mock for demo)
    const priceImpact = parseFloat(amountIn) > 100 ? "0.5" : "0.1";

    return { amountOut, path, priceImpact };
  } catch (error) {
    console.error("Error getting swap quote:", error);
    return null;
  }
};

// Execute swap
export const executeSwap = async (
  privateKey: string,
  amountIn: string,
  amountOutMin: string,
  tokenIn: typeof SWAP_TOKENS[0],
  tokenOut: typeof SWAP_TOKENS[0],
  slippage: number = 0.5
): Promise<{ hash: string } | { error: string }> => {
  try {
    const provider = getProvider();
    const wallet = new ethers.Wallet(privateKey, provider);
    const router = new ethers.Contract(PANCAKE_ROUTER, PANCAKE_ROUTER_ABI, wallet);

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
    const amountInWei = ethers.parseUnits(amountIn, tokenIn.decimals);
    const minOutWei = ethers.parseUnits(
      (parseFloat(amountOutMin) * (1 - slippage / 100)).toFixed(tokenOut.decimals),
      tokenOut.decimals
    );

    let tx;

    if (tokenIn.isNative) {
      // BNB -> Token
      const path = [WBNB_ADDRESS, tokenOut.address];
      tx = await router.swapExactETHForTokens(
        minOutWei,
        path,
        wallet.address,
        deadline,
        { value: amountInWei }
      );
    } else if (tokenOut.isNative) {
      // Token -> BNB
      // First approve
      const tokenContract = new ethers.Contract(tokenIn.address, ERC20_ABI, wallet);
      const allowance = await tokenContract.allowance(wallet.address, PANCAKE_ROUTER);
      if (allowance < amountInWei) {
        const approveTx = await tokenContract.approve(PANCAKE_ROUTER, ethers.MaxUint256);
        await approveTx.wait();
      }

      const path = [tokenIn.address, WBNB_ADDRESS];
      tx = await router.swapExactTokensForETH(
        amountInWei,
        minOutWei,
        path,
        wallet.address,
        deadline
      );
    } else {
      // Token -> Token
      const tokenContract = new ethers.Contract(tokenIn.address, ERC20_ABI, wallet);
      const allowance = await tokenContract.allowance(wallet.address, PANCAKE_ROUTER);
      if (allowance < amountInWei) {
        const approveTx = await tokenContract.approve(PANCAKE_ROUTER, ethers.MaxUint256);
        await approveTx.wait();
      }

      const path = [tokenIn.address, WBNB_ADDRESS, tokenOut.address];
      tx = await router.swapExactTokensForTokens(
        amountInWei,
        minOutWei,
        path,
        wallet.address,
        deadline
      );
    }

    return { hash: tx.hash };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Swap failed";
    return { error: errorMessage };
  }
};
