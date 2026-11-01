"use client";

import { LogOut } from "lucide-react";
import { clearOfflineCaches } from "@/components/pwa/ServiceWorkerRegister";
import { ROUTES } from "@/lib/routes";

/** Déconnexion : vide aussi les caches hors ligne, comme la colonne de gauche sur ordinateur. */
export function SignOutButton({ className }: { className?: string }) {
  return (
    <form action={ROUTES.AUTH_SIGNOUT} method="post" onSubmit={clearOfflineCaches} className={className}>
      <button type="submit" className="btn-secondary w-full">
        <LogOut size={18} aria-hidden />
        Se déconnecter
      </button>
    </form>
  );
}
