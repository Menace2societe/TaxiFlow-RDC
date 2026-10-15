"use client";

import { useEffect } from "react";

/** Enregistre le service worker (production uniquement : en dev il gênerait le rechargement à chaud). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("[pwa] Service worker non enregistré :", error);
    });
  }, []);

  return null;
}

/** À la déconnexion : efface les pages gardées hors-ligne (téléphone partagé entre chauffeurs). */
export function clearOfflineCaches() {
  navigator.serviceWorker?.controller?.postMessage("clear-caches");
}
