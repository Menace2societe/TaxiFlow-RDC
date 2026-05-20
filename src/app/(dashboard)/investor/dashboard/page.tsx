import { ArrowUpRight, CarTaxiFront, ShieldCheck, TrendingUp, WalletCards } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/roles";

const stats = [
  {
    label: "Revenu Total",
    value: "1,250,000 FC",
    helper: "+18% vs mois dernier",
    icon: WalletCards,
    tone: "text-emerald-600 dark:text-emerald-300"
  },
  {
    label: "Taxis actifs",
    value: "14",
    helper: "10 taxis, 4 motos",
    icon: CarTaxiFront,
    tone: "text-cyan-700 dark:text-cyan-300"
  },
  {
    label: "Performance du mois",
    value: "92%",
    helper: "Objectif presque atteint",
    icon: TrendingUp,
    tone: "text-amber-700 dark:text-amber-300"
  }
];

const highlights = [
  { label: "Flotte en service", value: "12 vehicules", detail: "2 en repos planifie" },
  { label: "Versement estime", value: "420,000 FC", detail: "Prochaine distribution" },
  { label: "Risque maintenance", value: "Faible", detail: "1 controle a programmer" }
];

export default async function InvestorDashboardPage() {
  const profileRaw = await getCurrentProfile();
  const profile = profileRaw as any;

  console.log("[INVESTOR DASHBOARD] Rendering /investor/dashboard.", {
    detectedRole: profile?.role ?? null,
    redirectAttempt: profile?.role === "investor" ? "none - already on investor dashboard" : "handled by parent layout/middleware"
  });

  return (
    <div className="space-y-6">
      <header className="rounded-lg border border-stone-200 bg-white p-5 shadow-soft dark:border-stone-800 dark:bg-stone-950">
        <p className="text-sm font-medium text-palm dark:text-emerald-300">Portail investisseur</p>
        <div className="mt-3 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="text-3xl font-semibold">Vue Investisseur Kinshasa</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500 dark:text-stone-400">
              Suivez vos actifs, les recettes consolidees et la sante operationnelle de votre flotte taxi-moto.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <ShieldCheck size={17} aria-hidden />
            Donnees test actives
          </span>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <article key={stat.label} className="rounded-lg border border-stone-200 bg-white p-5 shadow-soft dark:border-stone-800 dark:bg-stone-950">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-stone-500 dark:text-stone-400">{stat.label}</p>
                  <p className="mt-2 text-2xl font-semibold">{stat.value}</p>
                </div>
                <Icon className={stat.tone} size={24} aria-hidden />
              </div>
              <p className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                <ArrowUpRight size={16} aria-hidden />
                {stat.helper}
              </p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-soft dark:border-stone-800 dark:bg-stone-950">
          <h2 className="text-lg font-semibold">Projection mensuelle</h2>
          <div className="mt-5 space-y-4">
            {["Semaine 1", "Semaine 2", "Semaine 3", "Semaine 4"].map((week, index) => (
              <div key={week}>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-stone-500 dark:text-stone-400">{week}</span>
                  <span className="font-semibold">{[72, 84, 91, 63][index]}%</span>
                </div>
                <div className="h-3 rounded-full bg-stone-100 dark:bg-stone-800">
                  <div className="h-3 rounded-full bg-palm" style={{ width: `${[72, 84, 91, 63][index]}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-soft dark:border-stone-800 dark:bg-stone-950">
          <h2 className="text-lg font-semibold">Points cles</h2>
          <div className="mt-4 space-y-3">
            {highlights.map((item) => (
              <div key={item.label} className="rounded-md bg-stone-50 p-3 dark:bg-stone-900">
                <p className="text-sm text-stone-500 dark:text-stone-400">{item.label}</p>
                <p className="mt-1 font-semibold">{item.value}</p>
                <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
