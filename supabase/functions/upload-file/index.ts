// Retired one-time restoration endpoint. Never restore a service-role backdoor here.
Deno.serve(() => new Response(JSON.stringify({ error: 'Restoration endpoint retired' }), {
  status: 410, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
}));
