import Link from "next/link";
import { ROUTES } from "@/lib/routes";

/** Coquille commune des pages légales (brouillons à faire valider par un juriste). */
export function LegalPage({ title, updatedAt, children }: { title: string; updatedAt: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#0b1210] px-5 py-10 text-white sm:px-8">
      <article className="mx-auto max-w-3xl">
        <Link href={ROUTES.HOME} className="text-sm font-semibold text-emerald-300 hover:underline">
          ← TaxiFlow RDC
        </Link>
        <p className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Brouillon : ce texte doit être relu et validé par un juriste avant toute utilisation commerciale.
          Les passages entre crochets sont à compléter.
        </p>
        <h1 className="mt-6 text-3xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-white/50">Dernière mise à jour : {updatedAt}</p>
        <div className="mt-8 space-y-6 leading-7 text-white/75 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_li]:ml-5 [&_li]:list-disc">
          {children}
        </div>
      </article>
    </main>
  );
}
