import Link from "next/link";
import { Home, LogIn } from "lucide-react";
import { ROUTES } from "@/lib/routes";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-stone-100 px-4 text-stone-900 dark:bg-stone-950 dark:text-stone-50">
      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">404</p>
      <h1 className="mt-2 text-center text-2xl font-bold">Page introuvable</h1>
      <p className="mt-3 max-w-md text-center text-sm text-stone-600 dark:text-stone-400">
        Cette adresse ne correspond a aucune route TaxiFlow RDC. Verifiez l&apos;URL ou revenez a l&apos;accueil.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href={ROUTES.HOME}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
        >
          <Home size={18} aria-hidden />
          Retour accueil
        </Link>
        <Link
          href={ROUTES.LOGIN}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-5 text-sm font-semibold text-stone-800 transition hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800"
        >
          <LogIn size={18} aria-hidden />
          Connexion
        </Link>
      </div>
    </main>
  );
}
