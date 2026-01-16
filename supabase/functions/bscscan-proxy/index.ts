import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// MegaNode BSCTrace API - Free alternative for BSC
const API_KEY = Deno.env.get("MEGANODE_API_KEY") || "";
const MEGANODE_API = `https://bsc-mainnet.nodereal.io/v1/${API_KEY}`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address, action, page = 1, offset = 50 } = await req.json();
    
    console.log(`[MegaNode] Fetching ${action} for ${address}, page ${page}`);

    if (!address || !action) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: address and action", status: "0", result: [] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine category based on action
    // external = native BNB transfers, erc20 = BEP-20 token transfers
    const category = action === "tokentx" ? ["erc20"] : ["external"];
    
    console.log(`[MegaNode] Using category: ${JSON.stringify(category)}`);

    // Use nr_getAssetTransfers for transaction history
    // Query both fromAddress and toAddress to get sent and received transactions
    const response = await fetch(MEGANODE_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "nr_getAssetTransfers",
        params: [{
          fromAddress: address,
          toAddress: address,
          category: category,
          maxCount: `0x${offset.toString(16)}`,
          order: "desc",
        }]
      })
    });

    const data = await response.json();
    console.log(`[MegaNode] Response received, result keys: ${data.result ? Object.keys(data.result) : 'null'}`);

    // Check for error in response
    if (data.error) {
      console.error(`[MegaNode] API Error:`, data.error);
      return new Response(JSON.stringify({
        status: "0",
        message: data.error.message || "API Error",
        result: [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Transform MegaNode response to BSCScan-compatible format
    if (data.result && data.result.transfers) {
      console.log(`[MegaNode] Found ${data.result.transfers.length} transfers`);
      
      const transformedResult = data.result.transfers.map((tx: any) => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value ? String(parseInt(tx.value, 16)) : "0",
        timeStamp: tx.blockTimestamp 
          ? String(Math.floor(new Date(tx.blockTimestamp).getTime() / 1000))
          : String(Math.floor(Date.now() / 1000)),
        blockNumber: tx.blockNumber ? String(parseInt(tx.blockNumber, 16)) : "0",
        gasUsed: "21000",
        gasPrice: "10000000000",
        isError: "0",
        txreceipt_status: "1",
        tokenSymbol: tx.asset || (action === "tokentx" ? "TOKEN" : "BNB"),
        tokenDecimal: tx.decimals ? String(tx.decimals) : "18",
        tokenName: tx.asset || "BNB",
        contractAddress: tx.contractAddress || "",
      }));

      return new Response(JSON.stringify({
        status: "1",
        message: "OK",
        result: transformedResult,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return empty if no transfers
    console.log(`[MegaNode] No transfers found, returning empty array`);
    return new Response(JSON.stringify({
      status: "1",
      message: "OK",
      result: [],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[MegaNode] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage, status: "0", result: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
