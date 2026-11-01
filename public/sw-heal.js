// Loaded into the generated service worker. Builds from before the in-app "Tải lại"
// prompt never reload themselves, so the first time this worker takes over on a device
// it reloads open tabs once. Later releases rely on the prompt instead.
const HEAL_FLAG = "fun-sw-heal-v1";

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    if (await caches.has(HEAL_FLAG)) return;
    await caches.open(HEAL_FLAG);
    await self.clients.claim();
    const tabs = await self.clients.matchAll({ type: "window" });
    await Promise.all(tabs.map((tab) => tab.navigate(tab.url).catch(() => {})));
  })());
});
