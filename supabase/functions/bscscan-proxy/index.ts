import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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
    // Require authenticated Supabase user (protects MEGANODE_API_KEY quota)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", status: "0", result: [] }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", status: "0", result: [] }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { address, action, page = 1, offset = 50 } = await req.json();
    
    console.log(`[MegaNode] Fetching ${action} for ${address}, page ${page}`);

    if (!address || !action) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: address and action", status: "0", result: [] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const category = action === "tokentx" ? ["20"] : ["external"];
    const halfOffset = Math.max(Math.floor(offset / 2), 10);
    
    console.log(`[MegaNode] Using category: ${JSON.stringify(category)}, halfOffset: ${halfOffset}`);

    const [sentResponse, receivedResponse] = await Promise.all([
      fetch(MEGANODE_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "nr_getAssetTransfers",
          params: [{
            fromAddress: address,
            category: category,
            maxCount: `0x${halfOffset.toString(16)}`,
            order: "desc",
          }]
        })
      }),
      fetch(MEGANODE_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "nr_getAssetTransfers",
          params: [{
            toAddress: address,
            category: category,
            maxCount: `0x${halfOffset.toString(16)}`,
            order: "desc",
          }]
        })
      })
    ]);

    const [sentData, receivedData] = await Promise.all([
      sentResponse.json(),
      receivedResponse.json()
    ]);

    if (sentData.error) console.error(`[MegaNode] Sent API Error:`, sentData.error);
    if (receivedData.error) console.error(`[MegaNode] Received API Error:`, receivedData.error);

    const sentTransfers = sentData.result?.transfers || [];
    const receivedTransfers = receivedData.result?.transfers || [];
    const allTransfers = [...sentTransfers, ...receivedTransfers];

    if (allTransfers.length > 0) {
      allTransfers.sort((a: any, b: any) => {
        const blockA = a.blockNum ? parseInt(a.blockNum, 16) : 0;
        const blockB = b.blockNum ? parseInt(b.blockNum, 16) : 0;
        return blockB - blockA;
      });

      const seenHashes = new Set<string>();
      const uniqueTransfers = allTransfers.filter((tx: any) => {
        if (seenHashes.has(tx.hash)) return false;
        seenHashes.add(tx.hash);
        return true;
      });

      const transformedResult = uniqueTransfers.map((tx: any) => {
        let value = "0";
        if (tx.value !== undefined && tx.value !== null) {
          if (typeof tx.value === 'number') {
            const decimals = tx.decimal ? parseInt(tx.decimal, 16) : 18;
            value = String(Math.floor(tx.value * Math.pow(10, decimals)));
          } else if (typeof tx.value === 'string') {
            if (tx.value.startsWith('0x')) {
              value = String(parseInt(tx.value, 16));
            } else {
              value = tx.value;
            }
          }
        }

        let timeStamp = String(Math.floor(Date.now() / 1000));
        if (tx.blockTimeStamp) timeStamp = String(tx.blockTimeStamp);

        return {
          hash: tx.hash || "",
          from: tx.from || "",
          to: tx.to || "",
          value: value,
          timeStamp: timeStamp,
          blockNumber: tx.blockNum ? String(parseInt(tx.blockNum, 16)) : "0",
          gasUsed: "21000",
          gasPrice: "10000000000",
          isError: "0",
          txreceipt_status: "1",
          tokenSymbol: tx.asset || (action === "tokentx" ? "TOKEN" : "BNB"),
          tokenDecimal: tx.decimal ? String(parseInt(tx.decimal, 16)) : "18",
          tokenName: tx.asset || "BNB",
          contractAddress: tx.rawContract?.address || "",
        };
      });

      return new Response(JSON.stringify({
        status: "1",
        message: "OK",
        result: transformedResult,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
