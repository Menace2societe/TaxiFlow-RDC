"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
type Driver = { id: string; name: string; phone: string | null; active: boolean; vehicles: { plate: string } | null };
type Vehicle = { id: string; plate: string; model: string | null; active: boolean };
export default function FleetPage() {
  const [tab, setTab] = useState<"drivers" | "vehicles">("drivers");
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [driverVehicleId, setDriverVehicleId] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [saving, setSaving] = useState(false);
  const supabase = createClient();
  async function load() {
    setLoading(true);
    const [d, v] = await Promise.all([
      supabase.from("drivers").select("id, name, phone, active, vehicles(plate)").order("name"),
      supabase.from("vehicles").select("id, plate, model, active").order("plate"),
    ]);
    setDrivers((d.data as any) || []);
    setVehicles((v.data as any) || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);
  async function addDriver() {
    if (!driverName.trim()) return;
    setSaving(true);
    await supabase.from("drivers").insert({ name: driverName.trim(), phone: driverPhone || null, vehicle_id: driverVehicleId || null });
    setDriverName(""); setDriverPhone(""); setDriverVehicleId("");
    setShowAddDriver(false); setSaving(false); load();
  }
  async function addVehicle() {
    if (!vehiclePlate.trim()) return;
    setSaving(true);
    await supabase.from("vehicles").insert({ plate: vehiclePlate.trim(), model: vehicleModel || null });
    setVehiclePlate(""); setVehicleModel("");
    setShowAddVehicle(false); setSaving(false); load();
  }
  const input = "w-full px-3 py-2.5 bg-[#0a0a14] border border-[#2a2a40] rounded-xl text-sm text-white placeholder:text-[#3a3a55] focus:outline-none focus:border-[#7c63f5] transition-colors";
  return (
    <div className="p-5 md:p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Flotte</h1>
        <p className="text-[#64748b] text-sm mt-1">Gérez vos conducteurs et véhicules</p>
      </div>
      <div className="flex gap-1 mb-6 bg-[#12121e] border border-[#2a2a40] rounded-xl p-1 w-fit">
        {(["drivers", "vehicles"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? "bg-[#7c63f5] text-white" : "text-[#94a3b8] hover:text-white"
            }`}>
            {t === "drivers" ? `Conducteurs (${drivers.filter(d => d.active).length})` : `Véhicules (${vehicles.filter(v => v.active).length})`}
          </button>
        ))}
      </div>
      {loading ? <p className="text-[#64748b] text-sm">Chargement...</p> : tab === "drivers" ? (
        <div className="space-y-3">
          {drivers.map(d => (
            <div key={d.id} className={`bg-[#12121e] border border-[#2a2a40] rounded-xl p-4 flex items-center justify-between ${!d.active ? "opacity-40" : ""}`}>
              <div>
                <p className="text-sm font-semibold text-white">{d.name}</p>
                <p className="text-xs text-[#64748b]">{d.phone || "Sans tél"} • {(d.vehicles as any)?.plate || "Sans véhicule"}</p>
              </div>
              <button onClick={() => supabase.from("drivers").update({ active: !d.active }).eq("id", d.id).then(load)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  d.active ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" : "bg-[#22c55e]/10 text-[#22c55e] hover:bg-[#22c55e]/20"
                }`}>{d.active ? "Désactiver" : "Activer"}</button>
            </div>
          ))}
          {drivers.length === 0 && <p className="text-[#64748b] text-sm text-center py-8">Aucun conducteur enregistré</p>}
          <button onClick={() => setShowAddDriver(true)}
            className="w-full py-3 border-2 border-dashed border-[#2a2a40] rounded-xl text-sm text-[#64748b] hover:text-[#7c63f5] hover:border-[#7c63f5] transition-colors">
            + Ajouter un conducteur
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {vehicles.map(v => (
            <div key={v.id} className={`bg-[#12121e] border border-[#2a2a40] rounded-xl p-4 flex items-center justify-between ${!v.active ? "opacity-40" : ""}`}>
              <div>
                <p className="text-sm font-semibold text-white">{v.plate}</p>
                <p className="text-xs text-[#64748b]">{v.model || "Modèle non spécifié"}</p>
              </div>
              <button onClick={() => supabase.from("vehicles").update({ active: !v.active }).eq("id", v.id).then(load)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  v.active ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" : "bg-[#22c55e]/10 text-[#22c55e] hover:bg-[#22c55e]/20"
                }`}>{v.active ? "Désactiver" : "Activer"}</button>
            </div>
          ))}
          {vehicles.length === 0 && <p className="text-[#64748b] text-sm text-center py-8">Aucun véhicule enregistré</p>}
          <button onClick={() => setShowAddVehicle(true)}
            className="w-full py-3 border-2 border-dashed border-[#2a2a40] rounded-xl text-sm text-[#64748b] hover:text-[#7c63f5] hover:border-[#7c63f5] transition-colors">
            + Ajouter un véhicule
          </button>
        </div>
      )}
      {/* Add Driver Modal */}
      {showAddDriver && (
        <Modal title="Nouveau conducteur" onClose={() => setShowAddDriver(false)}>
          <input className={input} value={driverName} onChange={e => setDriverName(e.target.value)} placeholder="Nom complet *" />
          <input className={input} type="tel" value={driverPhone} onChange={e => setDriverPhone(e.target.value)} placeholder="Téléphone (optionnel)" />
          <select className={input} value={driverVehicleId} onChange={e => setDriverVehicleId(e.target.value)}>
            <option value="">Véhicule (optionnel)</option>
            {vehicles.filter(v => v.active).map(v => <option key={v.id} value={v.id}>{v.plate}{v.model ? ` (${v.model})` : ""}</option>)}
          </select>
          <div className="flex gap-3 mt-2">
            <button onClick={() => setShowAddDriver(false)} className="flex-1 py-2.5 bg-[#1a1a2e] rounded-xl text-sm text-[#94a3b8] hover:text-white">Annuler</button>
            <button onClick={addDriver} disabled={!driverName.trim() || saving} className="flex-1 py-2.5 bg-[#7c63f5] hover:bg-[#9580ff] disabled:opacity-50 rounded-xl text-sm font-semibold text-white">{saving ? "..." : "Ajouter"}</button>
          </div>
        </Modal>
      )}
      {/* Add Vehicle Modal */}
      {showAddVehicle && (
        <Modal title="Nouveau véhicule" onClose={() => setShowAddVehicle(false)}>
          <input className={input} value={vehiclePlate} onChange={e => setVehiclePlate(e.target.value)} placeholder="Plaque d'immatriculation *" />
          <input className={input} value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} placeholder="Modèle (ex: Toyota Corolla)" />
          <div className="flex gap-3 mt-2">
            <button onClick={() => setShowAddVehicle(false)} className="flex-1 py-2.5 bg-[#1a1a2e] rounded-xl text-sm text-[#94a3b8] hover:text-white">Annuler</button>
            <button onClick={addVehicle} disabled={!vehiclePlate.trim() || saving} className="flex-1 py-2.5 bg-[#7c63f5] hover:bg-[#9580ff] disabled:opacity-50 rounded-xl text-sm font-semibold text-white">{saving ? "..." : "Ajouter"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-end md:items-center justify-center z-50 p-4">
      <div className="bg-[#12121e] border border-[#2a2a40] rounded-2xl p-5 w-full max-w-sm space-y-3">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        {children}
      </div>
    </div>
  );
}
