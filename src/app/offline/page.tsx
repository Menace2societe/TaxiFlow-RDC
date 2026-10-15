import { WifiOff } from "lucide-react";

export const metadata = { title: "Hors connexion — TaxiFlow RDC" };

/** Affichée par le service worker quand une page n'a jamais été ouverte en ligne. */
export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b1210] px-6 text-center text-stone-100">
      <div className="max-w-sm">
        <WifiOff className="mx-auto text-amber-300" size={40} aria-hidden />
        <h1 className="mt-4 text-2xl font-semibold">Pas de réseau</h1>
        <p className="mt-2 text-sm text-stone-400">
          Cette page n&apos;a pas encore été ouverte sur ce téléphone. Les pages déjà visitées, comme le portail
          chauffeur, restent disponibles hors connexion, et vos versements sont gardés puis envoyés au retour du réseau.
        </p>
        <a href="/driver/portal" className="btn-primary mt-6 inline-flex min-h-11 px-4">
          Ouvrir le portail chauffeur
        </a>
      </div>
    </main>
  );
}
