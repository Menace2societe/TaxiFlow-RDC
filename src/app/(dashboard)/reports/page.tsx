"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Currency, DEFAULT_EXCHANGE_RATE, formatAmount, toDisplayCurrency } from "@/lib/currency";
type Period = "7d" | "30d" | "all";
type Entry = {
  id: string; entry_date: string; revenue: number; fuel_cost: number;
  other_expenses: number; mileage: number; currency: Currency;
  exchange_rate: number; drivers: { name: string } | null;
};
export default function ReportsPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("30d");
  const [displayCurrency, setDisplayCurrency] = useState<Currency>("USD");
  const [exchangeRate, setExchangeRate] = useState(DEFAULT_EXCHANGE_RATE);
  const supabase = createClient();
  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("daily_entries")
      .select("id, entry_date, revenue, fuel_cost, other_expenses, mileage, currency, exchange_rate, drivers(name)")
      .order("entry_date", { ascending: false });
    if (period !== "all") {
      const d = new Date();
      d.setDate(d.getDate() - (period === "7d" ? 7 : 30));
      q = q.gte("entry_date", d.toISOString().split("T")[0]);
    }
    const { data } = await q.limit(500);
    setEntries((data as any) || []);
    setLoading(false);
  }, [period]);
  useEffect(() => {
    load();
    const c = localStorage.getItem("taxiflow_currency") as Currency;
    if (c) setDisplayCurrency(c);
    const r = localStorage.getItem("taxiflow_rate");
    if (r) setExchangeRate(parseFloat(r));
  }, [load]);
  function conv(amount: number, eCur: Currency, eRate: number) {
    return toDisplayCurrency(amount, eCur, displayCurrency, eRate);
  }
  let totalRev = 0, totalFuel = 0, totalOther = 0, totalKm = 0;
  const byDriver: Record<string, { name: string; rev: number; exp: number; count: number }> = {};
  for (const e of entries) {
    const r = conv(e.revenue, e.currency, e.exchange_rate);
    const f = conv(e.fuel_cost, e.currency, e.exchange_rate);
    const o = conv(e.other_expenses, e.currency, e.exchange_rate);
    totalRev += r; totalFuel += f; totalOther += o; totalKm += e.mileage || 0;
    const name = e.drivers?.name || "Non assigné";
    if (!byDriver[name]) byDriver[name] = { name, rev: 0, exp: 0, count: 0 };
    byDriver[name].rev += r; byDriver[name].exp += f + o; byDriver[name].count++;
  }
  const totalExp = totalFuel + totalOther;
  const net = totalRev - totalExp;
  const topDrivers = Object.values(byDriver).sort((a, b) => b.rev - a.rev).slice(0, 6);
  function shareWhatsApp() {
    const pLabel = period === "7d" ? "7 derniers jours" : period === "30d" ? "30 derniers jours" : "tout l'historique";
    const text = [
      `📊 *Rapport taxiflow \u2014 ${pLabel}*`,
      ``,
      `💰 Revenu : ${formatAmount(totalRev, displayCurrency)}`,
      `⛽ Dépenses : ${formatAmount(totalExp, displayCurrency)}`,
      `✅ Bénéfice net : ${formatAmount(net, displayCurrency)}`,
      `🚗 Kilométrage : ${totalKm.toFixed(0)} km`,
      `📝 Saisies : ${entries.length}`,
      ``,
      `_Généré par taxiflow_`,
    ].join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }
  return (
    <div className="p-5 md:p-8 max-w-3xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Rapports</h1>
          <p className="text-[#64748b] text-sm mt-1">Analyse de vos performances</p>
        </div>
        <button onClick={shareWhatsApp}
          className="flex items-center gap-2 px-4 py-2 bg-[#25D366]/10 border border-[#25D366]/30 hover:bg-[#25D366]/20 rounded-xl text-sm font-medium text-[#25D366] transition-colors">
          📱 WhatsApp
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-1 bg-[#12121e] border border-[#2a2a40] rounded-xl p-1">
          {(["7d", "30d", "all"] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                period === p ? "bg-[#7c63f5] text-white" : "text-[#94a3b8] hover:text-white"
              }`}>
              {p === "7d" ? "7 jours" : p === "30d" ? "30 jours" : "Tout"}
            </button>
          ))}
        </div>
        <button
          onClick={() => { const n: Currency = displayCurrency === "USD" ? "CDF" : "USD"; setDisplayCurrency(n); localStorage.setItem("taxiflow_currency", n); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#12121e] border border-[#2a2a40] rounded-xl text-sm font-medium text-white hover:border-[#7c63f5] transition-colors">
          <span className={displayCurrency === "USD" ? "text-[#22c55e]" : "text-[#f59e0b]"}>{displayCurrency}</span>
          <span className="text-[#64748b]">&#8644;</span>
          <span className="text-[#64748b]">{displayCurrency === "USD" ? "CDF" : "USD"}</span>
        </button>
      </div>
      {loading ? (
        <p className="text-[#64748b] text-sm text-center py-12">Chargement...</p>
      ) : entries.length === 0 ? (
        <p className="text-[#64748b] text-sm text-center py-16">Aucune donnée pour cette période</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="col-span-2 bg-[#12121e] border border-[#2a2a40] rounded-2xl p-5">
              <p className="text-xs text-[#64748b] mb-1">Bénéfice net</p>
              <p className={`text-3xl font-bold ${net >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                {net >= 0 ? "+" : ""}{formatAmount(net, displayCurrency)}
              </p>
              <p className="text-xs text-[#64748b] mt-1">{entries.length} saisie(s) • {totalKm.toFixed(0)} km</p>
            </div>
            <div className="bg-[#12121e] border border-[#2a2a40] rounded-2xl p-4">
              <p className="text-xs text-[#64748b] mb-1">Revenu total</p>
              <p className="text-xl font-bold text-white">{formatAmount(totalRev, displayCurrency)}</p>
            </div>
            <div className="bg-[#12121e] border border-[#2a2a40] rounded-2xl p-4">
              <p className="text-xs text-[#64748b] mb-1">Dépenses totales</p>
              <p className="text-xl font-bold text-[#ef4444]">{formatAmount(totalExp, displayCurrency)}</p>
              <p className="text-xs text-[#64748b] mt-0.5">⛽ {formatAmount(totalFuel, displayCurrency)}</p>
            </div>
          </div>
          {topDrivers.length > 0 && (
            <div className="bg-[#12121e] border border-[#2a2a40] rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Performance par conducteur</h3>
              <div className="space-y-4">
                {topDrivers.map(d => (
                  <div key={d.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-white">{d.name}</span>
                      <div className="text-right">
                        <span className="text-sm font-bold text-[#22c55e]">{formatAmount(d.rev - d.exp, displayCurrency)}</span>
                        <span className="text-xs text-[#64748b] ml-2">{d.count} saisie(s)</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-[#1a1a2e] rounded-full overflow-hidden">
                      <div className="h-full bg-[#7c63f5] rounded-full" style={{ width: totalRev > 0 ? `${Math.min(100, (d.rev / totalRev) * 100)}%` : "0%" }} />
                    </div>
                    <p className="text-xs text-[#64748b] mt-0.5">{formatAmount(d.rev, displayCurrency)} revenu • {formatAmount(d.exp, displayCurrency)} dép.</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
