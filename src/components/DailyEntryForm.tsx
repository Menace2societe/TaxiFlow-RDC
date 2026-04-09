"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Currency, formatAmount } from "@/lib/currency";
interface Driver { id: string; name: string; }
interface Vehicle { id: string; plate: string; }
interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  currency: Currency;
  exchangeRate: number;
}
export default function DailyEntryBottomSheet({ open, onClose, onSaved, currency, exchangeRate }: Props) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [driverId, setDriverId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [revenue, setRevenue] = useState("");
  const [fuelCost, setFuelCost] = useState("");
  const [otherExpenses, setOtherExpenses] = useState("");
  const [mileage, setMileage] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [offline, setOffline] = useState(false);
  const supabase = createClient();
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    setOffline(!navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  useEffect(() => {
    if (!open) return;
    Promise.all([
      supabase.from("drivers").select("id, name").eq("active", true).order("name"),
      supabase.from("vehicles").select("id, plate").eq("active", true).order("plate"),
    ]).then(([d, v]) => {
      setDrivers(d.data || []);
      setVehicles(v.data || []);
    });
  }, [open]);
  async function handleSave() {
    setSaving(true);
    const entry = {
      driver_id: driverId || null,
      vehicle_id: vehicleId || null,
      entry_date: date,
      revenue: parseFloat(revenue) || 0,
      fuel_cost: parseFloat(fuelCost) || 0,
      other_expenses: parseFloat(otherExpenses) || 0,
      mileage: parseFloat(mileage) || 0,
      currency,
      exchange_rate: exchangeRate,
      notes: notes || null,
    };
    if (offline) {
      const q = JSON.parse(localStorage.getItem("taxiflow_queue") || "[]");
      q.push({ id: crypto.randomUUID(), data: entry, ts: Date.now() });
      localStorage.setItem("taxiflow_queue", JSON.stringify(q));
    } else {
      await supabase.from("daily_entries").insert(entry);
      // Flush offline queue
      const q = JSON.parse(localStorage.getItem("taxiflow_queue") || "[]");
      if (q.length > 0) {
        for (const item of q) await supabase.from("daily_entries").insert(item.data);
        localStorage.removeItem("taxiflow_queue");
      }
    }
    setSaving(false);
    resetForm();
    onSaved();
  }
  function resetForm() {
    setDriverId(""); setVehicleId(""); setRevenue(""); setFuelCost("");
    setOtherExpenses(""); setMileage(""); setNotes("");
    setDate(new Date().toISOString().split("T")[0]);
    onClose();
  }
  const net = (parseFloat(revenue) || 0) - (parseFloat(fuelCost) || 0) - (parseFloat(otherExpenses) || 0);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60 backdrop-enter" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-[#12121e] border-t border-[#2a2a40] rounded-t-3xl bottom-sheet-enter max-h-[92vh] overflow-y-auto">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-[#3a3a55] rounded-full" />
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">Nouvelle saisie</h2>
            <div className="flex items-center gap-3">
              {offline && <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-lg">Hors ligne</span>}
              <button onClick={onClose} className="text-[#64748b] hover:text-white text-xl leading-none">&times;</button>
            </div>
          </div>
          <div className="mb-4 p-3 bg-[#0a0a14] rounded-xl flex items-center gap-2 text-xs">
            <span className="text-[#64748b]">Devise :</span>
            <span className="font-semibold text-[#7c63f5]">{currency}</span>
            <span className="text-[#64748b] ml-2">Taux : 1 USD = {exchangeRate.toLocaleString()} CDF</span>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">Conducteur</label>
                <select value={driverId} onChange={e => setDriverId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0a0a14] border border-[#2a2a40] rounded-xl text-sm text-white focus:outline-none focus:border-[#7c63f5]">
                  <option value="">Sélectionner</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">Véhicule</label>
                <select value={vehicleId} onChange={e => setVehicleId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0a0a14] border border-[#2a2a40] rounded-xl text-sm text-white focus:outline-none focus:border-[#7c63f5]">
                  <option value="">Sélectionner</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#0a0a14] border border-[#2a2a40] rounded-xl text-sm text-white focus:outline-none focus:border-[#7c63f5]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">Revenu ({currency})</label>
              <input type="number" value={revenue} onChange={e => setRevenue(e.target.value)}
                placeholder="0.00" min="0" step="0.01"
                className="w-full px-3 py-2.5 bg-[#0a0a14] border border-[#2a2a40] rounded-xl text-sm text-white placeholder:text-[#3a3a55] focus:outline-none focus:border-[#22c55e]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">Carburant ({currency})</label>
                <input type="number" value={fuelCost} onChange={e => setFuelCost(e.target.value)}
                  placeholder="0.00" min="0" step="0.01"
                  className="w-full px-3 py-2.5 bg-[#0a0a14] border border-[#2a2a40] rounded-xl text-sm text-white placeholder:text-[#3a3a55] focus:outline-none focus:border-[#ef4444]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">Autres dép. ({currency})</label>
                <input type="number" value={otherExpenses} onChange={e => setOtherExpenses(e.target.value)}
                  placeholder="0.00" min="0" step="0.01"
                  className="w-full px-3 py-2.5 bg-[#0a0a14] border border-[#2a2a40] rounded-xl text-sm text-white placeholder:text-[#3a3a55] focus:outline-none focus:border-[#ef4444]" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">Kilométrage</label>
              <input type="number" value={mileage} onChange={e => setMileage(e.target.value)}
                placeholder="0" min="0"
                className="w-full px-3 py-2.5 bg-[#0a0a14] border border-[#2a2a40] rounded-xl text-sm text-white placeholder:text-[#3a3a55] focus:outline-none focus:border-[#7c63f5]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">Notes (optionnel)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Remarques..." rows={2}
                className="w-full px-3 py-2.5 bg-[#0a0a14] border border-[#2a2a40] rounded-xl text-sm text-white placeholder:text-[#3a3a55] focus:outline-none focus:border-[#7c63f5] resize-none" />
            </div>
            {(revenue || fuelCost || otherExpenses) && (
              <div className={`p-3 rounded-xl flex items-center justify-between border ${
                net >= 0 ? "bg-[#22c55e]/10 border-[#22c55e]/20" : "bg-red-500/10 border-red-500/20"
              }`}>
                <span className="text-xs text-[#94a3b8]">Bénéfice net estimé</span>
                <span className={`text-sm font-bold ${net >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                  {net >= 0 ? "+" : ""}{net.toFixed(2)} {currency}
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-3 mt-6 pb-4">
            <button onClick={onClose}
              className="flex-1 py-3 bg-[#1a1a2e] rounded-xl text-sm font-medium text-[#94a3b8] hover:text-white transition-colors">
              Annuler
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-[2] py-3 bg-[#7c63f5] hover:bg-[#9580ff] disabled:opacity-60 rounded-xl text-sm font-semibold text-white transition-colors">
              {saving ? "Sauvegarde..." : offline ? "Sauvegarder (hors ligne)" : "Sauvegarder"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
