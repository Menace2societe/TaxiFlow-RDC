import Link from "next/link";
import { Home, LogIn } from "lucide-react";
import { ROUTES } from "@/lib/routes";

export default function NotFound() {
  return (
    <div className={`plate-world flex min-h-screen flex-col`}>
      <header className="border-b-2 border-plate-ink bg-plate-white">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center px-5 sm:px-8">
          <Link href={ROUTES.HOME} className="font-plate text-[26px] font-bold no-underline">
            TaxiFlow RDC
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-start justify-center px-5 py-12 sm:px-8 md:items-center">
        <div className="w-full max-w-[460px]">
          <h1 className="font-plate text-[clamp(2.4rem,6vw,3rem)] font-bold leading-none">Page introuvable</h1>
          <p className="mt-3 text-[17px] leading-relaxed">
            Cette adresse ne correspond à aucune page de TaxiFlow RDC (erreur 404). Vérifiez l&apos;adresse ou revenez à
            l&apos;accueil.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href={ROUTES.HOME} className="btn-primary px-6 no-underline">
              <Home size={18} aria-hidden />
              Retour à l&apos;accueil
            </Link>
            <Link href={ROUTES.LOGIN} className="btn-secondary px-6 no-underline">
              <LogIn size={18} aria-hidden />
              Connexion
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
