import { CalendarDays, TrendingUp, WalletCards } from "lucide-react";

const monthlyRevenue = [
  { month: "Jan", value: "880,000 FC", progress: 58 },
  { month: "Fev", value: "1,020,000 FC", progress: 68 },
  { month: "Mar", value: "1,180,000 FC", progress: 78 },
  { month: "Avr", value: "1,250,000 FC", progress: 83 }
];

const payouts = [
  { date: "05 Mai 2026", label: "Distribution investisseur", amount: "420,000 FC" },
  { date: "28 Avr 2026", label: "Reserve maintenance", amount: "85,000 FC" },
  { date: "20 Avr 2026", label: "Bonus performance flotte", amount: "60,000 FC" }
];

export default function InvestorRevenuePage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium text-palm dark:text-emerald-300">Rendements</p>
          <h1 className="mt-1 text-3xl font-semibold">Revenus Investisseur</h1>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-stone-600 shadow-soft dark:bg-stone-950 dark:text-stone-300">
          <CalendarDays size={17} aria-hidden />
          Mai 2026
        </span>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-lg border border-stone-200 bg-white p-5 shadow-soft dark:border-stone-800 dark:bg-stone-950">
          <WalletCards className="text-palm dark:text-emerald-300" size={24} aria-hidden />
          <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">Revenus bruts</p>
          <p className="mt-1 text-2xl font-semibold">1,250,000 FC</p>
        </article>
        <article className="rounded-lg border border-stone-200 bg-white p-5 shadow-soft dark:border-stone-800 dark:bg-stone-950">
          <TrendingUp className="text-river dark:text-cyan-300" size={24} aria-hidden />
          <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">Rendement net</p>
          <p className="mt-1 text-2xl font-semibold">420,000 FC</p>
        </article>
        <article className="rounded-lg border border-stone-200 bg-white p-5 shadow-soft dark:border-stone-800 dark:bg-stone-950">
          <CalendarDays className="text-copper dark:text-amber-300" size={24} aria-hidden />
          <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">Croissance</p>
          <p className="mt-1 text-2xl font-semibold">+18%</p>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-soft dark:border-stone-800 dark:bg-stone-950">
          <h2 className="text-lg font-semibold">Evolution mensuelle</h2>
          <div className="mt-5 space-y-4">
            {monthlyRevenue.map((item) => (
              <div key={item.month}>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="font-medium">{item.month}</span>
                  <span className="text-stone-500 dark:text-stone-400">{item.value}</span>
                </div>
                <div className="h-3 rounded-full bg-stone-100 dark:bg-stone-800">
                  <div className="h-3 rounded-full bg-river" style={{ width: `${item.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-soft dark:border-stone-800 dark:bg-stone-950">
          <h2 className="text-lg font-semibold">Mouvements recents</h2>
          <div className="mt-4 space-y-3">
            {payouts.map((payout) => (
              <div key={`${payout.date}-${payout.label}`} className="rounded-md bg-stone-50 p-3 dark:bg-stone-900">
                <p className="text-xs text-stone-500 dark:text-stone-400">{payout.date}</p>
                <p className="mt-1 text-sm font-medium">{payout.label}</p>
                <p className="mt-2 font-semibold">{payout.amount}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
