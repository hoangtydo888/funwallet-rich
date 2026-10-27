import {exactRawTransferValue} from '../_shared/explorerValues.ts';
import {readBoundedJson,upstreamJson,requireScanBudget,scannerFailure} from '../_shared/scannerSafety.ts';
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

  if(req.method!=='POST')return new Response('POST only',{status:405,headers:corsHeaders});

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
    if (claimsError || typeof claimsData?.claims?.sub !== 'string' || claimsData.claims.role !== 'authenticated') {
      return new Response(
        JSON.stringify({ error: "Unauthorized", status: "0", result: [] }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const budgetClient=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
    await requireScanBudget(budgetClient,claimsData.claims.sub,'bscscan-proxy');
    const { address, action, page = 1, offset = 50 } = await readBoundedJson(req) as any;
    


    if (typeof address !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(address) || !['tokentx','txlist'].includes(action) || !Number.isInteger(page) || page < 1 || page > 100 || !Number.isInteger(offset) || offset < 1 || offset > 100) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: address and action", status: "0", result: [] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const category = action === "tokentx" ? ["20"] : ["external"];
    const halfOffset = Math.max(Math.floor(offset / 2), 10);
    
    console.log(`[MegaNode] Using category: ${JSON.stringify(category)}, halfOffset: ${halfOffset}`);

    const [sentData, receivedData] = await Promise.all([
      upstreamJson(MEGANODE_API, {
        method: "POST",
        signal: AbortSignal.timeout(10000),
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
      upstreamJson(MEGANODE_API, {
        method: "POST",
        signal: AbortSignal.timeout(10000),
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

    if (sentData.error) console.error('Upstream scanner failed');
    if (receivedData.error) console.error('Upstream scanner failed');

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
        const value=exactRawTransferValue(tx);

        let timeStamp = String(Math.floor(Date.now() / 1000));
        if (tx.blockTimeStamp) timeStamp = String(tx.blockTimeStamp);

        return {
          hash: tx.hash || "",
          from: tx.from || "",
          to: tx.to || "",
          value: value,
          timeStamp: timeStamp,
          blockNumber: tx.blockNum ? String(parseInt(tx.blockNum, 16)) : "0",
          gasUsed: "",
          gasPrice: "",
          isError: "unknown",
          txreceipt_status: "unknown",
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
    return scannerFailure(error,corsHeaders);
  }
});
