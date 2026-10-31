import { createElement } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

createRoot(document.getElementById("root")!).render(<App />);

// A new release takes over from the cached one in the background. Offer a reload
// rather than forcing it, so a payment being signed is never interrupted.
if ("serviceWorker" in navigator) {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController) return; // first install, nothing old on screen
    toast({
      title: "Đã có phiên bản mới của FUN Wallet",
      description: "Bấm Tải lại để dùng bản mới nhất.",
      duration: 1_000_000,
      action: createElement(ToastAction, { altText: "Tải lại", onClick: () => window.location.reload() }, "Tải lại"),
    });
  });
  // Look for a new release every 15 minutes and when the tab comes back into view
  const check = () => navigator.serviceWorker.getRegistration().then(r => r?.update()).catch(() => {});
  setInterval(check, 15 * 60_000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") void check(); });
}
