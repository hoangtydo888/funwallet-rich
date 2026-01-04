import { ethers } from "ethers";
import { getProvider, ERC20_ABI } from "./wallet";
import { fetchTokenFromDexScreener, TOKEN_ADDRESSES } from "./dexscreener";

// PancakeSwap Router V2 on BSC
export const PANCAKE_ROUTER = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
export const WBNB_ADDRESS = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";

// PancakeSwap Router ABI
export const PANCAKE_ROUTER_ABI = [
  "function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)",
  "function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)",
  "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)",
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)",
  // Fee-on-transfer token functions (for tax tokens like CAMLY, BABYDOGE)
  "function swapExactETHForTokensSupportingFeeOnTransferTokens(uint amountOutMin, address[] path, address to, uint deadline) payable",
  "function swapExactTokensForETHSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline)",
  "function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline)",
];

// Swap token type
export interface SwapToken {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  isNative?: boolean;
  logo: string;
}

// Quote result type
export interface QuoteResult {
  amountOut: string;
  path: string[];
  priceImpact: string;
  source: "PancakeSwap" | "DexScreener" | "Estimated";
  isEstimate?: boolean;
}

// Tax tokens that require special swap functions
export const TAX_TOKENS = ["CAMLY", "BABYDOGE", "SHIB"];

// Swap tokens available (19 tokens)
export const SWAP_TOKENS: SwapToken[] = [
  { symbol: "BNB", name: "BNB", address: WBNB_ADDRESS, decimals: 18, isNative: true, logo: "/tokens/bnb.png" },
  { symbol: "USDT", name: "Tether USD", address: "0x55d398326f99059fF775485246999027B3197955", decimals: 18, logo: "/tokens/usdt.svg" },
  { symbol: "USDC", name: "USD Coin", address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", decimals: 18, logo: "/tokens/usdc.svg" },
  { symbol: "CAMLY", name: "CAMLY COIN", address: "0x0910320181889fefde0bb1ca63962b0a8882e413", decimals: 18, logo: "/tokens/camly.png" },
  { symbol: "BTCB", name: "Bitcoin BEP-20", address: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", decimals: 18, logo: "/tokens/btc.svg" },
  { symbol: "ETH", name: "Ethereum BEP-20", address: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8", decimals: 18, logo: "/tokens/eth.svg" },
  { symbol: "CAKE", name: "PancakeSwap", address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82", decimals: 18, logo: "/tokens/cake.svg" },
  { symbol: "LINK", name: "Chainlink", address: "0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD", decimals: 18, logo: "/tokens/link.svg" },
  { symbol: "UNI", name: "Uniswap", address: "0xBf5140A22578168FD562DcEaAB237dA49E0c34C7", decimals: 18, logo: "/tokens/uni.svg" },
  { symbol: "SHIB", name: "Shiba Inu", address: "0x2859e4544c4bb03966803b044a93563bd2d0dd4d", decimals: 18, logo: "/tokens/shib.svg" },
  { symbol: "DOGE", name: "Dogecoin BEP-20", address: "0xbA2aE424d960c26247Dd6c32edC70B295c744C43", decimals: 8, logo: "/tokens/doge.svg" },
  { symbol: "BABYDOGE", name: "Baby Doge", address: "0xc748673057861a797275CD8A068AbB95A902e8de", decimals: 9, logo: "/tokens/babydoge.svg" },
  { symbol: "ADA", name: "Cardano BEP-20", address: "0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47", decimals: 18, logo: "/tokens/ada.svg" },
  { symbol: "MATIC", name: "Polygon BEP-20", address: "0xCC42724C6683B7E57334c4E856f4C9965ED682bD", decimals: 18, logo: "/tokens/matic.svg" },
  { symbol: "AVAX", name: "Avalanche BEP-20", address: "0x1CE0c2827e2eF14D5C4f29a091d735A204794041", decimals: 18, logo: "/tokens/avax.svg" },
  { symbol: "SOL", name: "Solana BEP-20", address: "0x570A5D26f7765Ecb712C0924E4De545B89fD43dF", decimals: 18, logo: "/tokens/sol.svg" },
  { symbol: "XRP", name: "Ripple BEP-20", address: "0x1D2F0dA169ceB9fC7B3144628dB156f3F6c60dBE", decimals: 18, logo: "/tokens/xrp.svg" },
  { symbol: "MANA", name: "Decentraland", address: "0x26433c8127d9b4e9B71Eaa15111DF99Ea2EeB2f8", decimals: 18, logo: "/tokens/mana.svg" },
  { symbol: "BTT", name: "BitTorrent", address: "0x352Cb5E19b12FC216548a2677bD0fce83BaE434B", decimals: 18, logo: "/tokens/btt.svg" },
];

// Get quote from PancakeSwap Router directly
const getPancakeQuote = async (
  amountIn: string,
  tokenIn: SwapToken,
  tokenOut: SwapToken
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

    // Calculate simple price impact
    const priceImpact = parseFloat(amountIn) > 100 ? "0.5" : "0.1";

    return { amountOut, path, priceImpact };
  } catch (error) {
    console.error("PancakeSwap quote error:", error);
    return null;
  }
};

// Get estimated quote from DexScreener prices (fallback for low liquidity tokens)
const getEstimatedQuote = async (
  amountIn: string,
  tokenIn: SwapToken,
  tokenOut: SwapToken
): Promise<{ amountOut: string; path: string[]; priceImpact: string } | null> => {
  try {
    // Get prices from DexScreener
    const priceInData = await fetchTokenFromDexScreener(tokenIn.address);
    const priceOutData = await fetchTokenFromDexScreener(tokenOut.address);

    if (!priceInData?.priceUsd || !priceOutData?.priceUsd) {
      return null;
    }

    // Calculate estimated output based on USD values
    const valueInUsd = parseFloat(amountIn) * priceInData.priceUsd;
    const estimatedOut = valueInUsd / priceOutData.priceUsd;

    // Apply estimated slippage for low liquidity
    const liquidity = priceOutData.liquidity || 0;
    let slippageEstimate = 1; // 1% default
    if (liquidity < 10000) slippageEstimate = 5;
    else if (liquidity < 50000) slippageEstimate = 3;
    else if (liquidity < 100000) slippageEstimate = 2;

    const amountOut = (estimatedOut * (1 - slippageEstimate / 100)).toFixed(6);

    return {
      amountOut,
      path: [tokenIn.address, tokenOut.address],
      priceImpact: slippageEstimate.toString(),
    };
  } catch (error) {
    console.error("DexScreener estimate error:", error);
    return null;
  }
};

// Get quote for swap - tries multiple sources
export const getSwapQuote = async (
  amountIn: string,
  tokenIn: SwapToken,
  tokenOut: SwapToken
): Promise<QuoteResult | null> => {
  try {
    // 1. Try PancakeSwap Router first (most reliable for major tokens)
    const pancakeQuote = await getPancakeQuote(amountIn, tokenIn, tokenOut);
    if (pancakeQuote) {
      return {
        ...pancakeQuote,
        source: "PancakeSwap",
        isEstimate: false,
      };
    }
  } catch (error) {
    console.error("PancakeSwap failed, trying DexScreener:", error);
  }

  // 2. Fallback: Estimate from DexScreener prices
  const estimatedQuote = await getEstimatedQuote(amountIn, tokenIn, tokenOut);
  if (estimatedQuote) {
    return {
      ...estimatedQuote,
      source: "DexScreener",
      isEstimate: true,
    };
  }

  return null;
};

// Check if token is a tax token
const isTaxToken = (token: SwapToken): boolean => {
  return TAX_TOKENS.includes(token.symbol);
};

// Execute swap
export const executeSwap = async (
  privateKey: string,
  amountIn: string,
  amountOutMin: string,
  tokenIn: SwapToken,
  tokenOut: SwapToken,
  slippage: number = 0.5
): Promise<{ hash: string } | { error: string }> => {
  try {
    const provider = getProvider();
    const wallet = new ethers.Wallet(privateKey, provider);
    const router = new ethers.Contract(PANCAKE_ROUTER, PANCAKE_ROUTER_ABI, wallet);

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
    const amountInWei = ethers.parseUnits(amountIn, tokenIn.decimals);
    
    // Use higher slippage for tax tokens (minimum 10%)
    const effectiveSlippage = (isTaxToken(tokenIn) || isTaxToken(tokenOut)) 
      ? Math.max(slippage, 10) 
      : slippage;
    
    const minOutWei = ethers.parseUnits(
      (parseFloat(amountOutMin) * (1 - effectiveSlippage / 100)).toFixed(tokenOut.decimals),
      tokenOut.decimals
    );

    // Check if we need to use fee-on-transfer functions
    const useFeeOnTransfer = isTaxToken(tokenIn) || isTaxToken(tokenOut);

    let tx;

    if (tokenIn.isNative) {
      // BNB -> Token
      const path = [WBNB_ADDRESS, tokenOut.address];
      if (useFeeOnTransfer) {
        tx = await router.swapExactETHForTokensSupportingFeeOnTransferTokens(
          minOutWei,
          path,
          wallet.address,
          deadline,
          { value: amountInWei }
        );
      } else {
        tx = await router.swapExactETHForTokens(
          minOutWei,
          path,
          wallet.address,
          deadline,
          { value: amountInWei }
        );
      }
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
      if (useFeeOnTransfer) {
        tx = await router.swapExactTokensForETHSupportingFeeOnTransferTokens(
          amountInWei,
          minOutWei,
          path,
          wallet.address,
          deadline
        );
      } else {
        tx = await router.swapExactTokensForETH(
          amountInWei,
          minOutWei,
          path,
          wallet.address,
          deadline
        );
      }
    } else {
      // Token -> Token
      const tokenContract = new ethers.Contract(tokenIn.address, ERC20_ABI, wallet);
      const allowance = await tokenContract.allowance(wallet.address, PANCAKE_ROUTER);
      if (allowance < amountInWei) {
        const approveTx = await tokenContract.approve(PANCAKE_ROUTER, ethers.MaxUint256);
        await approveTx.wait();
      }

      const path = [tokenIn.address, WBNB_ADDRESS, tokenOut.address];
      if (useFeeOnTransfer) {
        tx = await router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
          amountInWei,
          minOutWei,
          path,
          wallet.address,
          deadline
        );
      } else {
        tx = await router.swapExactTokensForTokens(
          amountInWei,
          minOutWei,
          path,
          wallet.address,
          deadline
        );
      }
    }

    return { hash: tx.hash };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Swap failed";
    
    // Provide better error messages for common issues
    if (errorMessage.includes("execution reverted")) {
      return { error: "Giao dịch thất bại. Vui lòng thử tăng slippage lên 15-20% hoặc giảm số lượng swap." };
    }
    if (errorMessage.includes("insufficient")) {
      return { error: "Số dư không đủ để thực hiện giao dịch (bao gồm phí gas)." };
    }
    
    return { error: errorMessage };
  }
};

// Generate PancakeSwap URL for direct swap
export const getPancakeSwapUrl = (tokenIn: SwapToken, tokenOut: SwapToken): string => {
  return `https://pancakeswap.finance/swap?inputCurrency=${tokenIn.address}&outputCurrency=${tokenOut.address}`;
};
