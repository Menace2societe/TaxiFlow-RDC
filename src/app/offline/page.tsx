import type { Viewport } from "next";
import { WifiOff } from "lucide-react";

export const metadata = { title: "Hors connexion — TaxiFlow RDC" };

export const viewport: Viewport = {
  themeColor: "#f7f7f2"
};

/** Affichée par le service worker quand une page n'a jamais été ouverte en ligne. */
export default function OfflinePage() {
  return (
    <div className={`plate-world flex min-h-screen flex-col`}>
      <header className="border-b-2 border-plate-ink bg-plate-white">
        {/* Pas de lien vers l'accueil : il ne s'ouvrirait pas sans réseau. */}
        <p className="mx-auto flex h-[72px] max-w-6xl items-center px-5 font-plate text-[26px] font-bold sm:px-8">TaxiFlow RDC</p>
      </header>
      <main className="flex flex-1 items-start justify-center px-5 py-12 sm:px-8 md:items-center">
        <div className="w-full max-w-[460px]">
          <WifiOff size={40} strokeWidth={2.25} aria-hidden />
          <h1 className="mt-4 font-plate text-[clamp(2.4rem,6vw,3rem)] font-bold leading-none">Pas de réseau</h1>
          <p className="mt-3 text-[17px] leading-relaxed">
            Cette page n&apos;a pas encore été ouverte sur ce téléphone. Les pages déjà visitées, comme le portail chauffeur,
            restent disponibles hors connexion, et vos versements sont gardés puis envoyés au retour du réseau.
          </p>
          <a href="/driver/portal" className="btn-primary mt-6 w-full px-6 no-underline sm:w-auto">
            Ouvrir le portail chauffeur
          </a>
        </div>
      </main>
    </div>
  );
}
