import { Wrench } from "lucide-react";

export default function DriverMaintenancePage() {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-soft dark:border-stone-800 dark:bg-stone-950">
      <Wrench className="text-copper dark:text-amber-300" size={24} aria-hidden />
      <h1 className="mt-4 text-2xl font-semibold">Maintenance Moto/Taxi</h1>
      <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">Suivi des incidents et demandes de maintenance chauffeur.</p>
    </section>
  );
}
