import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// BSCScan API with API key
const BSCSCAN_API = "https://api.bscscan.com/api";
const BSCSCAN_API_KEY = Deno.env.get("BSCSCAN_API_KEY") || "";

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
    
    console.log(`[BSCScan Proxy] Fetching ${action} for ${address}, page ${page}`);

    if (!address || !action) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: address and action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const params = new URLSearchParams({
      module: "account",
      action: action, // "txlist" or "tokentx"
      address,
      startblock: "0",
      endblock: "99999999",
      page: page.toString(),
      offset: offset.toString(),
      sort: "desc",
      apikey: BSCSCAN_API_KEY,
    });

    const response = await fetch(`${BSCSCAN_API}?${params}`);
    const data = await response.json();
    
    console.log(`[BSCScan Proxy] Response status: ${data.status}, message: ${data.message}, results: ${Array.isArray(data.result) ? data.result.length : 'N/A'}`);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[BSCScan Proxy] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage, status: "0", result: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
