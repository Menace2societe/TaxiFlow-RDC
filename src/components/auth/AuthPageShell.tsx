import Link from "next/link";
import { LicensePlate, StateMark } from "@/components/driver/plate";
import { ROUTES } from "@/lib/routes";

/** Coquille des pages de connexion et d'inscription : univers « plaque », comme la page d'accueil. */
export function AuthPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={`plate-world min-h-screen`}>
      <div className="grid min-h-screen lg:grid-cols-[440px_minmax(0,1fr)]">
        {/* ── Panneau gauche (ordinateur) ── */}
        <aside className="hidden border-r-2 border-plate-ink bg-plate-white lg:block">
          {/* Reste visible pendant que l'on fait défiler un long formulaire. */}
          <div className="sticky top-0 flex h-screen flex-col overflow-y-auto px-10 py-6">
            <Link href={ROUTES.HOME} className="flex h-[60px] items-center self-start font-plate text-[26px] font-bold no-underline">
              TaxiFlow RDC
            </Link>
            <div className="my-auto py-10">
              <p className="max-w-[34ch] text-[18px] leading-relaxed">
                Chaque soir, vos chauffeurs déclarent leur recette et leurs kilomètres. Vous voyez qui a versé, pour chaque
                taxi et chaque moto.
              </p>
              <figure className="mt-8 max-w-[340px]">
                <LicensePlate plateNumber="4821BK01" />
                <div className="mt-3 flex items-center justify-between gap-3 border-b-2 border-plate-rule pb-3 text-[16px] font-semibold">
                  <span className="flex items-center gap-2">
                    <StateMark state="ok" />
                    Versement validé
                  </span>
                  <span className="whitespace-nowrap font-plate text-[22px] font-bold">55&nbsp;000&nbsp;FC</span>
                </div>
                <figcaption className="mt-2 text-[15px] font-medium text-plate-soft">Exemple : plaque et montant inventés.</figcaption>
              </figure>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col">
          {/* ── Barre de marque (téléphone et tablette) ── */}
          <header className="border-b-2 border-plate-ink bg-plate-white lg:hidden">
            <div className="flex h-[72px] items-center px-5 sm:px-8">
              <Link href={ROUTES.HOME} className="font-plate text-[26px] font-bold no-underline">
                TaxiFlow RDC
              </Link>
            </div>
          </header>

          <main className="flex flex-1 justify-center px-5 pb-12 pt-8 sm:px-8 lg:items-center lg:py-12">
            <div className="w-full max-w-[460px]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
