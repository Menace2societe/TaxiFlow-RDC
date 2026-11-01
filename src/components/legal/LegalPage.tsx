import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { ROUTES } from "@/lib/routes";

/** Coquille commune des pages légales (brouillons à faire valider par un juriste). */
export function LegalPage({ title, updatedAt, children }: { title: string; updatedAt: string; children: React.ReactNode }) {
  return (
    <div className={`plate-world min-h-screen`}>
      <header className="border-b-2 border-plate-ink bg-plate-white">
        <nav className="mx-auto flex h-[72px] max-w-6xl items-center justify-between gap-4 px-5 sm:px-8" aria-label="Navigation principale">
          <Link href={ROUTES.HOME} className="font-plate text-[26px] font-bold no-underline">
            TaxiFlow RDC
          </Link>
          <Link href={ROUTES.LOGIN} className="btn-secondary min-h-[44px] px-4 no-underline">
            Connexion
          </Link>
        </nav>
      </header>

      <main className="px-5 pb-16 pt-10 sm:px-8">
        <article className="mx-auto max-w-3xl">
          <h1 className="font-plate text-[clamp(2.4rem,5vw,3.25rem)] font-bold leading-none">{title}</h1>
          <p className="mt-2 text-[15px] font-medium text-plate-soft">Dernière mise à jour : {updatedAt}</p>
          <p className="mt-6 flex items-start gap-2 rounded-lg border-2 border-plate-wait bg-plate-white px-4 py-3 text-[15px] font-semibold text-plate-wait">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
            <span>
              Brouillon : ce texte doit être relu et validé par un juriste avant toute utilisation commerciale. Les passages
              entre crochets sont à compléter.
            </span>
          </p>
          <div className="mt-8 max-w-[68ch] space-y-5 text-[17px] leading-relaxed [&_h2]:!mt-10 [&_h2]:font-plate [&_h2]:text-[26px] [&_h2]:font-bold [&_h2]:leading-tight [&_li]:ml-5 [&_li]:mt-1.5 [&_li]:list-disc">
            {children}
          </div>
        </article>
      </main>

      <footer className="border-t-2 border-plate-ink bg-plate-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-[15px] sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>© {new Date().getFullYear()} TaxiFlow RDC</p>
          <nav className="flex gap-6" aria-label="Informations légales">
            <Link href={ROUTES.TERMS}>Conditions d&apos;utilisation</Link>
            <Link href={ROUTES.PRIVACY}>Confidentialité</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
