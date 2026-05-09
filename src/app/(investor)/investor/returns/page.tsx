import { BarChart3 } from "lucide-react";

export default function InvestorReturnsPage() {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-soft dark:border-stone-800 dark:bg-stone-950">
      <BarChart3 className="text-river dark:text-cyan-300" size={24} aria-hidden />
      <h1 className="mt-4 text-2xl font-semibold">Rendements Mensuels</h1>
      <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">Synthese mensuelle des revenus et distributions investisseurs.</p>
    </section>
  );
}
