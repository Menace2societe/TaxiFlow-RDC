export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { formatAmount } from "@/lib/currency";
import Link from "next/link";
export default async function OverviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const today = new Date().toISOString().split("T")[0];
  let stats = { revenue: 0, fuel: 0, other: 0, entries: 0, drivers: 0, vehicles: 0 };
  let recentEntries: any[] = [];
  let dbError = false;
  try {
    const [todayRes, driversRes, vehiclesRes, recentRes] = await Promise.all([
      supabase.from("daily_entries").select("revenue, fuel_cost, other_expenses, currency, exchange_rate").eq("owner_id", user.id).eq("entry_date", today),
      supabase.from("drivers").select("id", { count: "exact" }).eq("owner_id", user.id).eq("active", true),
      supabase.from("vehicles").select("id", { count: "exact" }).eq("owner_id", user.id).eq("active", true),
      supabase.from("daily_entries").select("id, entry_date, revenue, fuel_cost, other_expenses, currency, exchange_rate, drivers(name), vehicles(plate)").eq("owner_id", user.id).order("entry_date", { ascending: false }).order("created_at", { ascending: false }).limit(5),
    ]);
    for (const e of (todayRes.data || [])) {
      const rate = e.exchange_rate || 2800;
      const toUSD = (v: number) => e.currency === "CDF" ? v / rate : v;
      stats.revenue += toUSD(e.revenue);
      stats.fuel += toUSD(e.fuel_cost);
      stats.other += toUSD(e.other_expenses);
      stats.entries++;
    }
    stats.drivers = driversRes.count || 0;
    stats.vehicles = vehiclesRes.count || 0;
    recentEntries = (recentRes.data as any) || [];
  } catch { dbError = true; }
  const net = stats.revenue - stats.fuel - stats.other;
  const todayLabel = new Date().toLocaleDateString("fr-CD", { weekday: "long", day: "numeric", month: "long" });
  return (
    <div className="p-5 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Tableau de bord</h1>
        <p className="text-[#64748b] text-sm mt-1 capitalize">{todayLabel}</p>
      </div>
      {dbError && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-sm">
          ⚠️ Configurez Supabase pour voir vos données.
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Revenu du jour" value={formatAmount(stats.revenue, "USD")} color="green" />
        <StatCard label="Dépenses" value={formatAmount(stats.fuel + stats.other, "USD")} color="red" />
        <StatCard label="Bénéfice net" value={formatAmount(net, "USD")} color={net >= 0 ? "green" : "red"} />
        <StatCard label="Conducteurs actifs" value={`${stats.drivers}`} sub={`${stats.vehicles} véhicule(s)`} />
      </div>
      <div className="bg-[#12121e] border border-[#2a2a40] rounded-2xl p-5 max-w-3xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Dernières saisies</h2>
          <Link href="/entries" className="text-xs text-[#7c63f5] hover:underline">Voir tout →</Link>
        </div>
        {recentEntries.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[#64748b] text-sm">Aucune saisie aujourd&apos;hui</p>
            <Link href="/entries" className="mt-3 inline-block text-[#7c63f5] text-sm hover:underline">Ajouter une saisie →</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentEntries.map((e: any) => {
              const net = e.revenue - e.fuel_cost - e.other_expenses;
              return (
                <div key={e.id} className="flex items-center justify-between p-3 bg-[#0a0a14] rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-white">{e.drivers?.name || "—"} • {e.vehicles?.plate || "—"}</p>
                    <p className="text-xs text-[#64748b]">{new Date(e.entry_date).toLocaleDateString("fr-CD", { day: "numeric", month: "short" })}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#22c55e]">+{formatAmount(e.revenue, e.currency)}</p>
                    <p className="text-xs text-[#64748b]">net: {net >= 0 ? "+" : ""}{formatAmount(net, e.currency)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: "green" | "red" }) {
  const valueColor = color === "green" ? "text-[#22c55e]" : color === "red" ? "text-[#ef4444]" : "text-white";
  return (
    <div className="bg-[#12121e] border border-[#2a2a40] rounded-2xl p-4">
      <p className="text-xs text-[#64748b] mb-2">{label}</p>
      <p className={`text-lg font-bold ${valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-[#64748b] mt-0.5">{sub}</p>}
    </div>
  );
}
