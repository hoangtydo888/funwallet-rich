import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

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

    // Only admins may flag a gift (reward) as ready
    const { data: isAdminData, error: roleError } = await userClient.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (roleError || isAdminData !== true) {
      return json({ error: "Forbidden: admin role required" }, 403);
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: "Invalid JSON body" }, 400);

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const rewardId = String((body as any).rewardId ?? "");
    if (!UUID_RE.test(rewardId)) return json({ error: "rewardId must be a valid UUID" }, 400);

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { data: reward, error: rewardError } = await adminClient
      .from("rewards")
      .select("id, user_id, wallet_address, reward_type, reward_amount, reward_symbol, status")
      .eq("id", rewardId)
      .single();

    if (rewardError || !reward) return json({ error: "Reward not found" }, 404);
    if (reward.status !== "pending") {
      return json({ error: "Reward is not pending", status: reward.status }, 409);
    }

    // Record the "gift ready" event so the recipient (and admins) can see it.
    // The rewards row itself stays pending: the user claims it via claim_reward().
    const { error: logError } = await adminClient.from("security_logs").insert({
      user_id: reward.user_id,
      event_type: "gift_ready",
      event_details: {
        reward_id: reward.id,
        reward_type: reward.reward_type,
        reward_amount: reward.reward_amount,
        reward_symbol: reward.reward_symbol,
        wallet_address: reward.wallet_address,
        notified_by: userId,
      },
      success: true,
    });
    if (logError) {
      console.error("notify-gift-ready log error:", logError);
      return json({ error: "Failed to record notification" }, 500);
    }

    return json({
      notified: true,
      reward: {
        id: reward.id,
        userId: reward.user_id,
        rewardType: reward.reward_type,
        amount: reward.reward_amount,
        symbol: reward.reward_symbol,
        walletAddress: reward.wallet_address,
        status: reward.status,
      },
    });
  } catch (err) {
    console.error("notify-gift-ready error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
