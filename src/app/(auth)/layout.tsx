import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-road">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 md:grid-cols-[0.9fr_1.1fr]">
        <aside className="hidden border-r border-stone-200 bg-ink px-10 py-12 text-white md:flex md:flex-col md:justify-between">
          <Link href="/" className="text-xl font-bold">
            TaxiFlow RDC
          </Link>
          <div>
            <p className="max-w-sm text-3xl font-semibold leading-tight">
              Revenus, flotte et chauffeurs suivis sans friction.
            </p>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/70">
              Une base moderne pour les proprietaires, chauffeurs et investisseurs a Kinshasa.
            </p>
          </div>
        </aside>
        <section className="flex items-center justify-center px-5 py-10">{children}</section>
      </div>
    </main>
  );
}
