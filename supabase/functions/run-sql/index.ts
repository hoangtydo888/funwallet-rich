// Temporary admin-only SQL runner used ONLY for restoring backup.
// Requires header x-admin-secret matching RUN_SQL_SECRET env var.
// DELETE this function after restore is complete.
import { Client } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });
  const secret = Deno.env.get("RUN_SQL_SECRET");
  if (!secret || req.headers.get("x-admin-secret") !== secret) {
    return new Response("forbidden", { status: 403 });
  }
  const sql = await req.text();
  if (!sql.trim()) return new Response("empty", { status: 400 });
  const dbUrl = Deno.env.get("SUPABASE_DB_URL");
  if (!dbUrl) return new Response("no db url", { status: 500 });
  const client = new Client(dbUrl);
  try {
    await client.connect();
    await client.queryArray(sql);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: String(e?.message ?? e) }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  } finally {
    try { await client.end(); } catch (_) {}
  }
});
