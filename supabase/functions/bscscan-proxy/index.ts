import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const BSCSCAN_API = "https://api.bscscan.com/api";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address, action, page = 1, offset = 50 } = await req.json();

    console.log("[BSCScan Proxy] Request:", { address, action, page, offset });

    if (!address || !action) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: address and action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate action
    if (!["txlist", "tokentx"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "Invalid action. Must be 'txlist' or 'tokentx'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const params = new URLSearchParams({
      module: "account",
      action: action,
      address: address,
      startblock: "0",
      endblock: "99999999",
      page: page.toString(),
      offset: offset.toString(),
      sort: "desc",
    });

    console.log("[BSCScan Proxy] Calling BSCScan API:", `${BSCSCAN_API}?${params}`);

    const response = await fetch(`${BSCSCAN_API}?${params}`, {
      headers: {
        "Accept": "application/json",
      },
    });

    const data = await response.json();

    console.log("[BSCScan Proxy] BSCScan Response:", {
      status: data.status,
      message: data.message,
      resultCount: Array.isArray(data.result) ? data.result.length : "not an array",
    });

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("[BSCScan Proxy] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
