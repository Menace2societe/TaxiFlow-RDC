import Link from "next/link";
import { ROUTES } from "@/lib/routes";

export function AuthPageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-stone-100 to-stone-200 text-ink dark:from-stone-950 dark:to-stone-900 dark:text-stone-50">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 md:grid-cols-[0.9fr_1.1fr]">
        <aside className="hidden border-r border-emerald-900/20 bg-gradient-to-br from-emerald-950 via-stone-900 to-stone-950 px-10 py-12 text-white md:flex md:flex-col md:justify-between">
          <Link href={ROUTES.HOME} className="text-xl font-bold tracking-tight">
            TaxiFlow RDC
          </Link>
          <div>
            <p className="max-w-sm text-3xl font-semibold leading-tight text-emerald-50">Revenus, flotte et chauffeurs.</p>
            <p className="mt-4 max-w-sm text-sm leading-6 text-emerald-100/80">
              Une base moderne pour les proprietaires et les chauffeurs a Kinshasa.
            </p>
          </div>
        </aside>
        <section className="flex items-center justify-center px-5 py-10">{children}</section>
      </div>
    </main>
  );
}
