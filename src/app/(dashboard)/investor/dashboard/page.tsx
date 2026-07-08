"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  Bike,
  CarTaxiFront,
  CheckCircle2,
  Clock,
  Loader2,
  PlusCircle,
  RefreshCw,
  TrendingUp,
  UserPlus,
  WalletCards,
  Wrench,
  X,
  type LucideIcon
} from "lucide-react";
import { reportInvestorBreakdown } from "@/actions/breakdowns";
import { getInvestorDashboardData, type InvestorDashboardDataResult } from "@/actions/investor-dashboard";
import { registerOrAssignDriverByPhone } from "@/actions/investor-fleet";
import { createVehicleFromInvestorDashboard } from "@/actions/vehicles";
import { RevenueChart } from "@/components/RevenueChart";
import { VehicleMixChart } from "@/components/VehicleMixChart";
import { WeeklyVehicleRevenueChart } from "@/components/WeeklyVehicleRevenueChart";
import { Badge } from "@/components/ui/badge";
import type { DashboardEntry, DashboardVehicle } from "@/lib/dashboard/data";

type ModalName = "vehicle" | "driver" | "breakdown";
type Notice = { type: "success" | "error"; message: string } | null;

const phonePattern = "\\+243[0-9]{9}";

function formatCdf(value: number) {
  return new Intl.NumberFormat("fr-CD", {
    style: "currency",
    currency: "CDF",
    maximumFractionDigits: 0
  }).format(Number(value ?? 0));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-CD", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function vehicleName(vehicle?: DashboardVehicle) {
  if (!vehicle) {
    return "Vehicule";
  }
  return `${vehicle.label} - ${vehicle.plate_number}`;
}

function entriesByDate(entries: DashboardEntry[]) {
  const grouped = entries.reduce<Record<string, { date: string; revenue: number; costs: number }>>((acc, entry) => {
    const date = new Intl.DateTimeFormat("fr-CD", { day: "2-digit", month: "short" }).format(new Date(entry.entry_date));
    acc[date] ??= { date, revenue: 0, costs: 0 };
    acc[date].revenue += entry.revenue_cdf;
    acc[date].costs += entry.fuel_cdf + entry.maintenance_cdf;
    return acc;
  }, {});

  return Object.values(grouped).slice(-14);
}

function vehicleMix(vehicles: DashboardVehicle[]) {
  return [
    { name: "Taxis", value: vehicles.filter((vehicle) => vehicle.type === "taxi").length },
    { name: "Motos", value: vehicles.filter((vehicle) => vehicle.type === "moto").length }
  ].filter((item) => item.value > 0);
}

function weeklyRevenueByVehicle(entries: DashboardEntry[], vehicles: DashboardVehicle[]) {
  const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
  const since = new Date();
  since.setDate(since.getDate() - 6);
  since.setHours(0, 0, 0, 0);

  const grouped = entries
    .filter((entry) => new Date(entry.entry_date) >= since)
    .reduce<Record<string, Record<string, string | number>>>((acc, entry) => {
      const date = new Intl.DateTimeFormat("fr-CD", { weekday: "short" }).format(new Date(entry.entry_date));
      const vehicle = vehicleById.get(entry.vehicle_id);
      const label = vehicle?.label ?? "Vehicule";
      acc[date] ??= { date };
      acc[date][label] = Number(acc[date][label] ?? 0) + entry.revenue_cdf;
      return acc;
    }, {});

  return Object.values(grouped);
}

function topDriverName(entries: DashboardEntry[], vehicles: DashboardVehicle[]) {
  const vehiclesById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
  const totals = entries.reduce<Record<string, number>>((acc, entry) => {
    const vehicle = vehiclesById.get(entry.vehicle_id);
    const name = vehicle?.driver_name ?? "Non assigne";
    acc[name] = (acc[name] ?? 0) + entry.revenue_cdf;
    return acc;
  }, {});

  return Object.entries(totals).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Aucun";
}

function VehicleIcon({ type }: { type: "taxi" | "moto" }) {
  const Icon = type === "taxi" ? CarTaxiFront : Bike;
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-300">
      <Icon size={17} aria-hidden />
    </span>
  );
}

function ModalShell({
  title,
  children,
  onClose
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-white/10 bg-[#111d19] p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button type="button" className="rounded-md p-2 text-stone-400 transition hover:bg-white/10 hover:text-white" onClick={onClose} aria-label="Fermer">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Message({ notice }: { notice: Notice }) {
  if (!notice) {
    return null;
  }

  const ok = notice.type === "success";
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${ok ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200" : "border-red-400/30 bg-red-500/10 text-red-200"}`}>
      {notice.message}
    </div>
  );
}

function EmptyState({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-white/10 bg-black/10 px-5 py-8 text-center">
      <p className="font-medium text-white">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-stone-400">{text}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function StatTile({ label, value, helper, icon: Icon }: { label: string; value: string; helper: string; icon: LucideIcon }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-stone-400">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
        </div>
        <span className="rounded-lg bg-emerald-500/10 p-2 text-emerald-300">
          <Icon size={20} aria-hidden />
        </span>
      </div>
      <p className="mt-4 text-sm text-stone-400">{helper}</p>
    </div>
  );
}

function VehicleModal({
  onClose,
  onSaved,
  setNotice
}: {
  onClose: () => void;
  onSaved: () => Promise<void>;
  setNotice: (notice: Notice) => void;
}) {
  const [plateNumber, setPlateNumber] = useState("");
  const [label, setLabel] = useState("");
  const [type, setType] = useState<"taxi" | "moto">("taxi");
  const [targetDailyRevenue, setTargetDailyRevenue] = useState("50000");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setNotice(null);

    try {
      const formData = new FormData();
      formData.set("plate_number", plateNumber);
      formData.set("label", label);
      formData.set("type", type);
      formData.set("target_daily_revenue", targetDailyRevenue);

      const result = await createVehicleFromInvestorDashboard(formData);
      setNotice({ type: result.ok ? "success" : "error", message: result.message });

      if (result.ok) {
        await onSaved();
        onClose();
      }
    } catch (error) {
      console.error("[InvestorDashboard] create vehicle failed", error);
      setNotice({ type: "error", message: "Impossible d'ajouter le vehicule pour le moment." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ModalShell title="Ajouter un vehicule" onClose={onClose}>
      <form onSubmit={onSubmit} className="mt-5 grid gap-4">
        <label className="grid gap-1 text-sm font-medium text-stone-200">
          Plaque d'immatriculation
          <input className="field" name="plate_number" required minLength={3} value={plateNumber} onChange={(event) => setPlateNumber(event.target.value)} placeholder="KN 4215 AB" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-stone-200">
          Modele
          <input className="field" name="label" required minLength={2} value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Toyota Noah" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-stone-200">
          Type
          <select className="field" name="type" value={type} onChange={(event) => setType(event.target.value as "taxi" | "moto")}>
            <option value="taxi">Taxi</option>
            <option value="moto">Moto</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-stone-200">
          Objectif journalier (CDF)
          <input className="field" name="target_daily_revenue" type="number" min="1" step="1" required value={targetDailyRevenue} onChange={(event) => setTargetDailyRevenue(event.target.value)} />
        </label>
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secondary min-h-10" onClick={onClose} disabled={isSubmitting}>
            Annuler
          </button>
          <button type="submit" className="btn-primary min-h-10" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" size={18} aria-hidden /> : <PlusCircle size={18} aria-hidden />}
            {isSubmitting ? "Enregistrement..." : "Ajouter le vehicule"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function DriverModal({
  vehicles,
  onClose,
  onSaved,
  setNotice
}: {
  vehicles: DashboardVehicle[];
  onClose: () => void;
  onSaved: () => Promise<void>;
  setNotice: (notice: Notice) => void;
}) {
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? "");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("+243");
  const [confirmReassign, setConfirmReassign] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setNotice(null);

    try {
      const formData = new FormData();
      formData.set("vehicle_id", vehicleId);
      formData.set("full_name", fullName);
      formData.set("phone", phone);
      formData.set("confirm_reassign", confirmReassign ? "1" : "0");

      const result = await registerOrAssignDriverByPhone(formData);
      setNotice({ type: result.ok ? "success" : "error", message: result.message });

      if (result.ok) {
        await onSaved();
        onClose();
      }
    } catch (error) {
      console.error("[InvestorDashboard] assign driver failed", error);
      setNotice({ type: "error", message: "Impossible d'associer le chauffeur pour le moment." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ModalShell title="Associer un chauffeur" onClose={onClose}>
      {vehicles.length === 0 ? (
        <EmptyState title="Aucun vehicule disponible" text="Ajoutez d'abord un taxi ou une moto avant d'associer un chauffeur." />
      ) : (
        <form onSubmit={onSubmit} className="mt-5 grid gap-4">
          <label className="grid gap-1 text-sm font-medium text-stone-200">
            Vehicule
            <select className="field" name="vehicle_id" required value={vehicleId} onChange={(event) => setVehicleId(event.target.value)}>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicleName(vehicle)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-stone-200">
            Nom du chauffeur
            <input className="field" name="full_name" required minLength={2} value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Jean Kabongo" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-stone-200">
            Telephone RDC
            <input
              className="field"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              pattern={phonePattern}
              value={phone}
              onChange={(event) => setPhone(event.target.value.replace(/\s+/g, ""))}
              placeholder="+243XXXXXXXXX"
            />
          </label>
          <label className="flex items-start gap-2 rounded-lg border border-white/10 bg-black/10 p-3 text-sm text-stone-300">
            <input className="mt-1" type="checkbox" checked={confirmReassign} onChange={(event) => setConfirmReassign(event.target.checked)} />
            Confirmer la reassignation si ce chauffeur est deja lie a un autre vehicule de ma flotte.
          </label>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary min-h-10" onClick={onClose} disabled={isSubmitting}>
              Annuler
            </button>
            <button type="submit" className="btn-primary min-h-10" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" size={18} aria-hidden /> : <UserPlus size={18} aria-hidden />}
              {isSubmitting ? "Association..." : "Associer le chauffeur"}
            </button>
          </div>
        </form>
      )}
    </ModalShell>
  );
}

function BreakdownModal({
  vehicles,
  onClose,
  onSaved,
  setNotice
}: {
  vehicles: DashboardVehicle[];
  onClose: () => void;
  onSaved: () => Promise<void>;
  setNotice: (notice: Notice) => void;
}) {
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? "");
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("0");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setNotice(null);

    try {
      const formData = new FormData();
      formData.set("vehicle_id", vehicleId);
      formData.set("type", type);
      formData.set("description", description);
      formData.set("estimated_cost", estimatedCost);

      const result = await reportInvestorBreakdown(formData);
      setNotice({ type: result.ok ? "success" : "error", message: result.message });

      if (result.ok) {
        await onSaved();
        onClose();
      }
    } catch (error) {
      console.error("[InvestorDashboard] report breakdown failed", error);
      setNotice({ type: "error", message: "Impossible de declarer la panne pour le moment." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ModalShell title="Declarer une panne" onClose={onClose}>
      {vehicles.length === 0 ? (
        <EmptyState title="Aucun vehicule disponible" text="Votre flotte est vide. Ajoutez un vehicule avant de declarer une panne." />
      ) : (
        <form onSubmit={onSubmit} className="mt-5 grid gap-4">
          <label className="grid gap-1 text-sm font-medium text-stone-200">
            Vehicule
            <select className="field" name="vehicle_id" required value={vehicleId} onChange={(event) => setVehicleId(event.target.value)}>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicleName(vehicle)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-stone-200">
            Type de panne
            <input className="field" name="type" required minLength={2} value={type} onChange={(event) => setType(event.target.value)} placeholder="Moteur, pneus, freinage..." />
          </label>
          <label className="grid gap-1 text-sm font-medium text-stone-200">
            Description
            <textarea className="field min-h-24" name="description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Details utiles pour le suivi maintenance" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-stone-200">
            Cout estime (CDF)
            <input className="field" name="estimated_cost" type="number" min="0" step="1" required value={estimatedCost} onChange={(event) => setEstimatedCost(event.target.value)} />
          </label>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary min-h-10" onClick={onClose} disabled={isSubmitting}>
              Annuler
            </button>
            <button type="submit" className="btn-primary min-h-10" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" size={18} aria-hidden /> : <Wrench size={18} aria-hidden />}
              {isSubmitting ? "Declaration..." : "Declarer la panne"}
            </button>
          </div>
        </form>
      )}
    </ModalShell>
  );
}

export default function InvestorDashboardPage() {
  const [data, setData] = useState<InvestorDashboardDataResult | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [modal, setModal] = useState<ModalName | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadDashboard = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const result = await getInvestorDashboardData();
      setData(result);
      if (!result.ok) {
        setNotice({ type: "error", message: result.message });
      }
    } catch (error) {
      console.error("[InvestorDashboard] load failed", error);
      setData({
        ok: false,
        message: "Le tableau de bord n'a pas pu etre charge. Verifiez la configuration Supabase et votre session.",
        vehicles: [],
        entries: [],
        breakdowns: [],
        stats: {
          totalRevenue: 0,
          totalCosts: 0,
          netRevenue: 0,
          activeVehicles: 0,
          totalVehicles: 0,
          target: 0,
          openBreakdowns: 0
        }
      });
      setNotice({ type: "error", message: "Chargement impossible. Verifiez les variables d'environnement Supabase." });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const vehicles = data?.vehicles ?? [];
  const entries = data?.entries ?? [];
  const breakdowns = data?.breakdowns ?? [];
  const stats = data?.stats;

  const revenueSeries = useMemo(() => entriesByDate(entries), [entries]);
  const mixSeries = useMemo(() => vehicleMix(vehicles), [vehicles]);
  const weeklySeries = useMemo(() => weeklyRevenueByVehicle(entries, vehicles), [entries, vehicles]);
  const weeklyVehicleNames = useMemo(() => vehicles.slice(0, 5).map((vehicle) => vehicle.label), [vehicles]);
  const topDriver = useMemo(() => topDriverName(entries, vehicles), [entries, vehicles]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium text-emerald-300">Espace investisseur</p>
          <h1 className="mt-1 text-3xl font-semibold text-white">Tableau de bord</h1>
          <p className="mt-1 text-sm text-stone-400">Vue temps reel de votre flotte, des versements et des pannes.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary min-h-10 px-3" onClick={() => void loadDashboard()} disabled={isRefreshing}>
            {isRefreshing ? <Loader2 className="animate-spin" size={16} aria-hidden /> : <RefreshCw size={16} aria-hidden />}
            Actualiser
          </button>
          <button type="button" className="btn-secondary min-h-10 px-3" onClick={() => setModal("driver")}>
            <UserPlus size={16} aria-hidden />
            Chauffeur
          </button>
          <button type="button" className="btn-secondary min-h-10 px-3" onClick={() => setModal("breakdown")}>
            <Wrench size={16} aria-hidden />
            Panne
          </button>
          <button type="button" className="btn-primary min-h-10 px-3" onClick={() => setModal("vehicle")}>
            <PlusCircle size={16} aria-hidden />
            Vehicule
          </button>
        </div>
      </header>

      <Message notice={notice} />

      {isLoading ? (
        <div className="flex min-h-[360px] items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
          <div className="text-center">
            <Loader2 className="mx-auto animate-spin text-emerald-300" size={28} aria-hidden />
            <p className="mt-3 text-sm text-stone-300">Chargement du tableau de bord...</p>
          </div>
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Revenus bruts" value={formatCdf(stats?.totalRevenue ?? 0)} helper={`Objectif journalier flotte: ${formatCdf(stats?.target ?? 0)}`} icon={WalletCards} />
            <StatTile label="Revenus nets" value={formatCdf(stats?.netRevenue ?? 0)} helper={`Couts declares: ${formatCdf(stats?.totalCosts ?? 0)}`} icon={TrendingUp} />
            <StatTile label="Vehicules actifs" value={`${stats?.activeVehicles ?? 0}/${stats?.totalVehicles ?? 0}`} helper={`Meilleur chauffeur: ${topDriver}`} icon={CarTaxiFront} />
            <StatTile label="Pannes ouvertes" value={`${stats?.openBreakdowns ?? 0}`} helper="Dossiers non resolus a suivre" icon={AlertCircle} />
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">Revenus recents</h2>
                  <p className="text-sm text-stone-400">Revenus et couts des dernieres entrees.</p>
                </div>
                <Activity className="text-emerald-300" size={20} aria-hidden />
              </div>
              {revenueSeries.length > 0 ? <RevenueChart data={revenueSeries} /> : <EmptyState title="Aucun versement" text="Les revenus apparaitront ici apres les premieres entrees journalieres." />}
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">Composition flotte</h2>
                  <p className="text-sm text-stone-400">Repartition taxis et motos.</p>
                </div>
                <CarTaxiFront className="text-emerald-300" size={20} aria-hidden />
              </div>
              {mixSeries.length > 0 ? <VehicleMixChart data={mixSeries} /> : <EmptyState title="Flotte vide" text="Ajoutez un vehicule pour activer les indicateurs." />}
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1fr_420px]">
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">Performance hebdomadaire</h2>
                  <p className="text-sm text-stone-400">Revenus par vehicule sur les derniers jours.</p>
                </div>
                <CheckCircle2 className="text-emerald-300" size={20} aria-hidden />
              </div>
              {weeklySeries.length > 0 && weeklyVehicleNames.length > 0 ? (
                <WeeklyVehicleRevenueChart data={weeklySeries} vehicles={weeklyVehicleNames} />
              ) : (
                <EmptyState title="Pas encore de donnees" text="Les tendances seront disponibles apres quelques versements." />
              )}
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.04]">
              <div className="border-b border-white/10 p-5">
                <h2 className="text-lg font-semibold text-white">Pannes recentes</h2>
                <p className="text-sm text-stone-400">Derniers signalements maintenance.</p>
              </div>
              <div className="divide-y divide-white/10">
                {breakdowns.slice(0, 5).map((breakdown) => (
                  <article key={breakdown.id} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{breakdown.type}</p>
                        <p className="mt-1 text-sm text-stone-400">{breakdown.vehicle_label}</p>
                      </div>
                      <Badge variant={breakdown.status === "resolved" ? "success" : "warning"}>{breakdown.status}</Badge>
                    </div>
                    <p className="mt-3 text-sm text-stone-300">{breakdown.description || "Aucune description."}</p>
                    <div className="mt-3 flex items-center justify-between gap-3 text-xs text-stone-500">
                      <span>{formatDate(breakdown.created_at)}</span>
                      <span>{formatCdf(breakdown.estimated_cost)}</span>
                    </div>
                  </article>
                ))}
                {breakdowns.length === 0 ? <EmptyState title="Aucune panne ouverte" text="Les signalements recents apparaitront ici." /> : null}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-white/10 bg-white/[0.04]">
            <div className="flex flex-col justify-between gap-3 border-b border-white/10 p-5 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-semibold text-white">Flotte</h2>
                <p className="text-sm text-stone-400">Vehicules et chauffeurs associes.</p>
              </div>
              <button type="button" className="btn-primary min-h-10 px-3" onClick={() => setModal("vehicle")}>
                <PlusCircle size={16} aria-hidden />
                Ajouter
              </button>
            </div>
            <div className="divide-y divide-white/10">
              {vehicles.map((vehicle) => (
                <article key={vehicle.id} className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <VehicleIcon type={vehicle.type} />
                    <div>
                      <p className="font-medium text-white">{vehicleName(vehicle)}</p>
                      <p className="text-sm text-stone-400">Chauffeur: {vehicle.driver_name ?? "Non assigne"}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-stone-300">
                    <Badge variant={vehicle.status === "en service" ? "success" : vehicle.status === "maintenance" ? "warning" : "neutral"}>{vehicle.status}</Badge>
                    <span className="inline-flex items-center gap-1">
                      <Clock size={14} aria-hidden />
                      {formatCdf(vehicle.target_daily_revenue)}/jour
                    </span>
                  </div>
                </article>
              ))}
              {vehicles.length === 0 ? (
                <EmptyState
                  title="Votre flotte est vide"
                  text="Ajoutez votre premier taxi ou moto pour commencer le suivi."
                  action={
                    <button type="button" className="btn-primary min-h-10 px-3" onClick={() => setModal("vehicle")}>
                      <PlusCircle size={16} aria-hidden />
                      Ajouter un vehicule
                    </button>
                  }
                />
              ) : null}
            </div>
          </section>
        </>
      )}

      {modal === "vehicle" ? <VehicleModal onClose={() => setModal(null)} onSaved={loadDashboard} setNotice={setNotice} /> : null}
      {modal === "driver" ? <DriverModal vehicles={vehicles} onClose={() => setModal(null)} onSaved={loadDashboard} setNotice={setNotice} /> : null}
      {modal === "breakdown" ? <BreakdownModal vehicles={vehicles} onClose={() => setModal(null)} onSaved={loadDashboard} setNotice={setNotice} /> : null}
    </div>
  );
}
