import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const ADDR_RE = /^0x[a-fA-F0-9]{40}$/;
const HASH_RE = /^0x[a-fA-F0-9]{64}$/;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    // Require an authenticated Supabase user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || claimsData?.claims?.role !== "authenticated" || typeof claimsData?.claims?.sub !== "string") {
      return json({ error: "Unauthorized" }, 401);
    }
    const userId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: "Invalid JSON body" }, 400);

    const tokenSymbol = String((body as any).tokenSymbol ?? "").trim();
    const amountRaw = (body as any).amount;
    const tokenAddress = (body as any).tokenAddress ? String((body as any).tokenAddress) : null;
    const donorAddress = (body as any).donorAddress ? String((body as any).donorAddress) : null;
    const toAddress = (body as any).toAddress ? String((body as any).toAddress) : null;
    const txHash = (body as any).txHash ? String((body as any).txHash) : null;
    const chain = String((body as any).chain ?? "bsc").trim() || "bsc";

    const errors: string[] = [];
    if (!tokenSymbol || tokenSymbol.length > 32) errors.push("tokenSymbol is required (max 32 chars)");
    const amount = typeof amountRaw === "number" ? amountRaw : Number(String(amountRaw ?? "").trim());
    if (!Number.isFinite(amount) || amount <= 0) errors.push("amount must be a positive number");
    for (const [name, value] of [["tokenAddress", tokenAddress], ["donorAddress", donorAddress], ["toAddress", toAddress]] as const) {
      if (value !== null && !ADDR_RE.test(value)) errors.push(`${name} must be a valid 0x address`);
    }
    if (txHash !== null && !HASH_RE.test(txHash)) errors.push("txHash must be a valid 0x transaction hash");
    if (typeof chain !== "string" || chain.length > 32) errors.push("chain is invalid");
    if (errors.length > 0) return json({ error: "Validation failed", details: errors }, 400);

    // Record the donation in the user's transaction history (tx_type = donation).
    // RLS on `transactions` scopes the insert to auth.uid(); the service-role client
    // is used only to return the inserted row deterministically.
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { data, error } = await adminClient
      .from("transactions")
      .insert({
        user_id: userId,
        tx_type: "donation",
        token_symbol: tokenSymbol.toUpperCase(),
        token_address: tokenAddress,
        amount: String(amount),
        from_address: donorAddress,
        to_address: toAddress,
        status: "pending",
        tx_hash: txHash,
      })
      .select()
      .single();

    if (error) {
      console.error("record-donation insert error:", error);
      return json({ error: "Failed to record donation" }, 500);
    }

    return json({ donation: data });
  } catch (err) {
    console.error("record-donation error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
