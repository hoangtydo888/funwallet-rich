// Temporary admin-only file uploader used ONLY for restoring KYC storage.
// Requires header x-admin-secret matching RUN_SQL_SECRET env var.
// DELETE after restore is complete.
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });
  const secret = Deno.env.get("RUN_SQL_SECRET");
  if (!secret || req.headers.get("x-admin-secret") !== secret) {
    return new Response("forbidden", { status: 403 });
  }
  const bucket = req.headers.get("x-bucket") ?? "kyc-documents";
  const path = req.headers.get("x-path");
  const contentType = req.headers.get("x-content-type") ?? "application/octet-stream";
  if (!path) return new Response("missing x-path", { status: 400 });

  const url = Deno.env.get("SUPABASE_URL")!;
  const srk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const client = createClient(url, srk);
  const body = new Uint8Array(await req.arrayBuffer());
  const { error } = await client.storage.from(bucket).upload(path, body, {
    contentType,
    upsert: true,
  });
  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500, headers: { "content-type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ ok: true, path }), {
    headers: { "content-type": "application/json" },
  });
});
