"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, PlusCircle, RefreshCw, UserPlus, Wrench, X } from "lucide-react";
import { reportInvestorBreakdown } from "@/actions/breakdowns";
import { getInvestorDashboardData, type InvestorDashboardDataResult } from "@/actions/investor-dashboard";
import { registerOrAssignDriverByPhone } from "@/actions/investor-fleet";
import { createVehicleFromInvestorDashboard } from "@/actions/vehicles";
import { RevenueChart } from "@/components/RevenueChart";
import { PlateChip, StateMark, VehicleStatusText, type DayState } from "@/components/driver/plate";
import { MaintenanceActionButtons } from "@/components/shared/MaintenanceActionButtons";
import { SuspiciousEntriesPanel } from "@/components/shared/SuspiciousEntriesPanel";
import type { DashboardEntry, DashboardVehicle } from "@/lib/dashboard/data";
import { ROUTES } from "@/lib/routes";
import type { BreakdownStatus } from "@/lib/supabase/types";
import { recentDates, todayInAppTimezone } from "@/lib/time/kinshasa";
import { cn } from "@/lib/utils/cn";

type ModalName = "vehicle" | "driver" | "breakdown";
type Notice = { type: "success" | "error"; message: string } | null;

const phonePattern = "\\+243[0-9]{9}";

const breakdownStateView: Record<BreakdownStatus, { label: string; state: DayState }> = {
  open: { label: "Panne signalée, pas encore réparée", state: "bad" },
  in_progress: { label: "Réparation en cours", state: "wait" },
  resolved: { label: "Réparée", state: "ok" }
};

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

/** « 2026-11-01 » → « Samedi 1er novembre » */
function longDay(isoDate: string) {
  const label = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(`${isoDate}T12:00:00Z`)
  );
  const withFirst = label.replace(/^(\S+) 1 /, "$1 1er ");
  return `${withFirst.charAt(0).toUpperCase()}${withFirst.slice(1)}`;
}

/** « 2026-10-31 » → « ven. 31 » */
function shortDay(isoDate: string) {
  const date = new Date(`${isoDate}T12:00:00Z`);
  const weekday = new Intl.DateTimeFormat("fr-FR", { weekday: "short", timeZone: "UTC" }).format(date);
  return `${weekday} ${date.getUTCDate()}`;
}

function plural(count: number, word: string) {
  return `${count} ${word}${count > 1 ? "s" : ""}`;
}

function vehicleName(vehicle?: DashboardVehicle) {
  if (!vehicle) {
    return "Véhicule";
  }
  return `${vehicle.label} - ${vehicle.plate_number}`;
}

function entryDay(entry: DashboardEntry) {
  return entry.entry_date.slice(0, 10);
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

/** Recettes des 7 derniers jours (aujourd'hui compris), par véhicule et par jour. */
function weekByVehicle(entries: DashboardEntry[], vehicles: DashboardVehicle[]) {
  const days = recentDates(7);
  const rows = vehicles.map((vehicle) => {
    const perDay = days.map((date) =>
      entries
        .filter((entry) => entry.vehicle_id === vehicle.id && entryDay(entry) === date)
        .reduce((sum, entry) => sum + entry.revenue_cdf, 0)
    );
    return { vehicle, perDay, total: perDay.reduce((sum, amount) => sum + amount, 0) };
  });
  // Une seule échelle pour toute la flotte : le plus gros jour ou le plus gros objectif.
  const scale = Math.max(1, ...rows.flatMap((row) => row.perDay), ...vehicles.map((vehicle) => vehicle.target_daily_revenue));
  return { days, rows, scale };
}

function topDriverName(entries: DashboardEntry[], vehicles: DashboardVehicle[]) {
  const vehiclesById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
  const totals = entries.reduce<Record<string, number>>((acc, entry) => {
    const vehicle = vehiclesById.get(entry.vehicle_id);
    // Recette d'un véhicule supprimé ou sans chauffeur : ne compte pas.
    if (!vehicle?.driver_name) return acc;
    acc[vehicle.driver_name] = (acc[vehicle.driver_name] ?? 0) + entry.revenue_cdf;
    return acc;
  }, {});

  return Object.entries(totals).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Aucun";
}

const labelClass = "grid gap-1.5 text-[15px] font-semibold";

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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-plate-ink/50 p-4 sm:items-center" role="dialog" aria-modal aria-label={title}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border-2 border-plate-ink bg-plate-white p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-plate text-[24px] font-bold leading-tight">{title}</h2>
          <button
            type="button"
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg hover:bg-plate-ground"
            onClick={onClose}
            aria-label="Fermer"
          >
            <X size={22} aria-hidden />
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
    <p
      role={ok ? "status" : "alert"}
      className={cn(
        "flex items-start gap-2 rounded-lg border-2 bg-plate-white px-4 py-3 text-[15px] font-semibold",
        ok ? "border-plate-ok text-plate-ok" : "border-plate-bad text-plate-bad"
      )}
    >
      {ok ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden /> : <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />}
      {notice.message}
    </p>
  );
}

function EmptyState({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-plate-ink px-5 py-6">
      <p className="text-[17px] font-bold">{title}</p>
      <p className="mt-1 max-w-xl text-[16px]">{text}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function ModalButtons({
  onClose,
  isSubmitting,
  icon,
  label,
  busyLabel
}: {
  onClose: () => void;
  isSubmitting: boolean;
  icon: React.ReactNode;
  label: string;
  busyLabel: string;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
      <button type="button" className="btn-secondary px-5" onClick={onClose} disabled={isSubmitting}>
        Annuler
      </button>
      <button type="submit" className="btn-primary px-5" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="animate-spin" size={18} aria-hidden /> : icon}
        {isSubmitting ? busyLabel : label}
      </button>
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
      setNotice({ type: "error", message: "Impossible d'ajouter le véhicule pour le moment." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ModalShell title="Ajouter un véhicule" onClose={onClose}>
      <form onSubmit={onSubmit} className="mt-5 grid gap-4">
        <label className={labelClass}>
          Plaque d&apos;immatriculation
          <input className="field" name="plate_number" required minLength={3} value={plateNumber} onChange={(event) => setPlateNumber(event.target.value)} placeholder="4821 BK 01" />
        </label>
        <label className={labelClass}>
          Modèle
          <input className="field" name="label" required minLength={2} value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Toyota Noah" />
        </label>
        <label className={labelClass}>
          Type
          <select className="field" name="type" value={type} onChange={(event) => setType(event.target.value as "taxi" | "moto")}>
            <option value="taxi">Taxi</option>
            <option value="moto">Moto</option>
          </select>
        </label>
        <label className={labelClass}>
          Versement attendu par jour (FC)
          <input className="field" name="target_daily_revenue" type="number" min="1" step="1" inputMode="numeric" required value={targetDailyRevenue} onChange={(event) => setTargetDailyRevenue(event.target.value)} />
        </label>
        <ModalButtons
          onClose={onClose}
          isSubmitting={isSubmitting}
          icon={<PlusCircle size={18} aria-hidden />}
          label="Ajouter le véhicule"
          busyLabel="Enregistrement…"
        />
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
        <div className="mt-4">
          <EmptyState title="Aucun véhicule disponible" text="Ajoutez d'abord un taxi ou une moto avant d'associer un chauffeur." />
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-5 grid gap-4">
          <label className={labelClass}>
            Véhicule
            <select className="field" name="vehicle_id" required value={vehicleId} onChange={(event) => setVehicleId(event.target.value)}>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicleName(vehicle)}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Nom du chauffeur
            <input className="field" name="full_name" required minLength={2} value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Jean Kabongo" />
          </label>
          <label className={labelClass}>
            Téléphone (+243)
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
          <label className="flex min-h-12 items-start gap-3 rounded-lg border-2 border-plate-rule px-3 py-3 text-[15px]">
            <input className="mt-0.5 h-5 w-5 shrink-0 accent-plate-band" type="checkbox" checked={confirmReassign} onChange={(event) => setConfirmReassign(event.target.checked)} />
            Si ce chauffeur conduit déjà un autre véhicule de ma flotte, le déplacer sur celui-ci.
          </label>
          <ModalButtons
            onClose={onClose}
            isSubmitting={isSubmitting}
            icon={<UserPlus size={18} aria-hidden />}
            label="Associer le chauffeur"
            busyLabel="Association…"
          />
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
      setNotice({ type: "error", message: "Impossible de déclarer la panne pour le moment." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ModalShell title="Déclarer une panne" onClose={onClose}>
      {vehicles.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="Aucun véhicule disponible" text="Votre flotte est vide. Ajoutez un véhicule avant de déclarer une panne." />
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-5 grid gap-4">
          <label className={labelClass}>
            Véhicule
            <select className="field" name="vehicle_id" required value={vehicleId} onChange={(event) => setVehicleId(event.target.value)}>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicleName(vehicle)}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Type de panne
            <input className="field" name="type" required minLength={2} value={type} onChange={(event) => setType(event.target.value)} placeholder="Moteur, pneu, freins…" />
          </label>
          <label className={labelClass}>
            Ce qui s&apos;est passé
            <textarea className="field min-h-24 py-3" name="description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ce qui aidera le garagiste" />
          </label>
          <label className={labelClass}>
            Coût estimé (FC)
            <input className="field" name="estimated_cost" type="number" min="0" step="1" inputMode="numeric" required value={estimatedCost} onChange={(event) => setEstimatedCost(event.target.value)} />
          </label>
          <ModalButtons
            onClose={onClose}
            isSubmitting={isSubmitting}
            icon={<Wrench size={18} aria-hidden />}
            label="Déclarer la panne"
            busyLabel="Déclaration…"
          />
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
        message: "Le tableau de bord n'a pas pu être chargé. Vérifiez la configuration Supabase et votre session.",
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
      setNotice({ type: "error", message: "Chargement impossible. Vérifiez votre connexion, puis touchez « Actualiser »." });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const vehicles = useMemo(() => data?.vehicles ?? [], [data]);
  const entries = useMemo(() => data?.entries ?? [], [data]);
  const breakdowns = useMemo(() => data?.breakdowns ?? [], [data]);
  const stats = data?.stats;

  const today = todayInAppTimezone();
  const vehicleById = useMemo(() => new Map(vehicles.map((vehicle) => [vehicle.id, vehicle])), [vehicles]);
  const revenueSeries = useMemo(() => entriesByDate(entries), [entries]);
  const week = useMemo(() => weekByVehicle(entries, vehicles), [entries, vehicles]);
  const topDriver = useMemo(() => topDriverName(entries, vehicles), [entries, vehicles]);

  // Aujourd'hui : qui a déclaré, combien, et ce qui manque.
  const todayByVehicle = useMemo(() => {
    const totals = new Map<string, number>();
    entries
      .filter((entry) => entryDay(entry) === today)
      .forEach((entry) => totals.set(entry.vehicle_id, (totals.get(entry.vehicle_id) ?? 0) + entry.revenue_cdf));
    return totals;
  }, [entries, today]);
  const todayRevenue = Array.from(todayByVehicle.values()).reduce((sum, amount) => sum + amount, 0);
  const inService = vehicles.filter((vehicle) => vehicle.status === "en service");
  const expectedToday = inService.reduce((sum, vehicle) => sum + vehicle.target_daily_revenue, 0);
  const notDeclared = inService.filter((vehicle) => !todayByVehicle.has(vehicle.id));
  const declaredCount = inService.length - notDeclared.length;

  const suspiciousCount = entries.filter((entry) => entry.is_suspicious).length;
  const openBreakdowns = stats?.openBreakdowns ?? 0;
  // La panne active la plus récente de chaque véhicule (la liste arrive triée, la plus récente d'abord).
  const activeBreakdownByVehicle = useMemo(() => {
    const map = new Map<string, BreakdownStatus>();
    breakdowns.forEach((breakdown) => {
      if (breakdown.status !== "resolved" && !map.has(breakdown.vehicle_id)) map.set(breakdown.vehicle_id, breakdown.status);
    });
    return map;
  }, [breakdowns]);

  const taxis = vehicles.filter((vehicle) => vehicle.type === "taxi").length;
  const motos = vehicles.length - taxis;

  const todayHeadline =
    inService.length === 0
      ? "Aucun véhicule en service"
      : notDeclared.length === 0
        ? "Tous ont déclaré"
        : `${declaredCount} sur ${inService.length} ont déclaré`;

  return (
    <div className="pb-6">
      {/* ─── En-tête ──────────────────────────────────────────────────────── */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-plate text-[30px] font-bold leading-tight">Aujourd&apos;hui</h1>
          <p className="mt-1 text-[16px]">{longDay(today)}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <button type="button" className="btn-secondary px-4" onClick={() => setModal("vehicle")}>
            <PlusCircle size={18} aria-hidden />
            Ajouter un véhicule
          </button>
          <button type="button" className="btn-secondary px-4" onClick={() => setModal("driver")}>
            <UserPlus size={18} aria-hidden />
            Associer un chauffeur
          </button>
          <button type="button" className="btn-secondary px-4" onClick={() => setModal("breakdown")}>
            <Wrench size={18} aria-hidden />
            Déclarer une panne
          </button>
          <button type="button" className="btn-secondary px-4" onClick={() => void loadDashboard()} disabled={isRefreshing}>
            {isRefreshing ? <Loader2 className="animate-spin" size={18} aria-hidden /> : <RefreshCw size={18} aria-hidden />}
            Actualiser
          </button>
        </div>
      </header>

      {notice ? (
        <div className="mt-4">
          <Message notice={notice} />
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-6 flex min-h-[240px] items-center justify-center rounded-xl border-2 border-plate-rule bg-plate-white">
          <p role="status" className="flex items-center gap-3 text-[16px] font-semibold">
            <Loader2 className="animate-spin" size={22} aria-hidden />
            Chargement de votre flotte…
          </p>
        </div>
      ) : (
        <>
          {/* ─── Ce qui demande votre action ─────────────────────────────── */}
          <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-10">
            {vehicles.length > 0 ? (
              <section aria-labelledby="today-title" className="rounded-2xl bg-plate-vignette px-5 pb-5 pt-4">
                <h2 id="today-title" className="font-plate text-[30px] font-bold leading-[1.05]">
                  {todayHeadline}
                </h2>
                <p className="mt-2 text-[16px] leading-snug">
                  <b>{formatCdf(todayRevenue)}</b> de recettes déclarées aujourd&apos;hui
                  {expectedToday > 0 ? (
                    <>
                      {" "}
                      sur <b>{formatCdf(expectedToday)}</b> attendus
                    </>
                  ) : null}
                  .
                </p>
                {notDeclared.length > 0 ? (
                  <div className="mt-3">
                    <p className="flex items-center gap-2 text-[15px] font-semibold">
                      <StateMark state="none" />
                      Rien déclaré pour l&apos;instant
                    </p>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {notDeclared.map((vehicle) => (
                        <li key={vehicle.id}>
                          <PlateChip plateNumber={vehicle.plate_number} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <Link href={ROUTES.INVESTOR_REVENUE} className="btn-primary mt-4 w-full no-underline">
                  Valider les versements
                </Link>
              </section>
            ) : null}

            <section aria-labelledby="todo-title">
              <h2 id="todo-title" className="font-plate text-[24px] font-bold">
                À surveiller
              </h2>
              <ul className="mt-2 border-b-2 border-plate-rule text-[16px]">
                <li className="border-t-2 border-plate-rule">
                  <a href="#pannes" className="flex min-h-[56px] items-center justify-between gap-3 py-2">
                    <span className="flex items-center gap-2 font-semibold">
                      <StateMark state={openBreakdowns > 0 ? "bad" : "none"} />
                      Pannes non réparées
                    </span>
                    <span className={cn("font-plate text-[22px] font-bold", openBreakdowns > 0 && "text-plate-bad")}>
                      {openBreakdowns > 0 ? openBreakdowns : "Aucune"}
                    </span>
                  </a>
                </li>
                <li className="border-t-2 border-plate-rule">
                  <a href="#alertes-km" className="flex min-h-[56px] items-center justify-between gap-3 py-2">
                    <span className="flex items-center gap-2 font-semibold">
                      <StateMark state={suspiciousCount > 0 ? "bad" : "none"} />
                      Recettes suspectes
                    </span>
                    <span className={cn("font-plate text-[22px] font-bold", suspiciousCount > 0 && "text-plate-bad")}>
                      {suspiciousCount > 0 ? suspiciousCount : "Aucune"}
                    </span>
                  </a>
                </li>
                <li className="border-t-2 border-plate-rule">
                  <Link href={ROUTES.INVESTOR_CONTROL} className="flex min-h-[56px] items-center justify-between gap-3 py-2">
                    <span>
                      <span className="block font-semibold underline underline-offset-4">Contrôler les recettes</span>
                      <span className="block text-[15px] text-plate-soft">Compteurs, photos et écarts à vérifier</span>
                    </span>
                  </Link>
                </li>
                <li className="border-t-2 border-plate-rule">
                  <Link href={ROUTES.INVESTOR_DOCUMENTS} className="flex min-h-[56px] items-center justify-between gap-3 py-2">
                    <span>
                      <span className="block font-semibold underline underline-offset-4">Papiers qui expirent</span>
                      <span className="block text-[15px] text-plate-soft">Assurance, carte rose, contrôle technique</span>
                    </span>
                  </Link>
                </li>
              </ul>
            </section>
          </div>

          {/* ─── La flotte, plaque par plaque ────────────────────────────── */}
          <section aria-labelledby="fleet-title" className="mt-10">
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
              <div>
                <h2 id="fleet-title" className="font-plate text-[24px] font-bold">
                  Ma flotte
                </h2>
                {vehicles.length > 0 ? (
                  <p className="text-[15px] text-plate-soft">
                    {stats?.activeVehicles ?? 0} en service sur {stats?.totalVehicles ?? vehicles.length}
                    {taxis > 0 ? ` · ${plural(taxis, "taxi")}` : ""}
                    {motos > 0 ? ` · ${plural(motos, "moto")}` : ""}
                  </p>
                ) : null}
              </div>
              {vehicles.length > 0 ? (
                <Link href={ROUTES.INVESTOR_FLEET} className="py-2 text-[16px] font-bold underline underline-offset-4">
                  Gérer ma flotte
                </Link>
              ) : null}
            </div>

            {vehicles.length === 0 ? (
              <div className="mt-3">
                <EmptyState
                  title="Votre flotte est vide"
                  text="Ajoutez votre premier taxi ou votre première moto pour commencer le suivi."
                  action={
                    <button type="button" className="btn-primary px-5" onClick={() => setModal("vehicle")}>
                      <PlusCircle size={18} aria-hidden />
                      Ajouter un véhicule
                    </button>
                  }
                />
              </div>
            ) : (
              <>
                {/* Téléphone */}
                <ul className="mt-2 border-b-2 border-plate-rule md:hidden">
                  {vehicles.map((vehicle) => {
                    const amount = todayByVehicle.get(vehicle.id);
                    const breakdown = activeBreakdownByVehicle.get(vehicle.id);
                    return (
                      <li key={vehicle.id} className="border-t-2 border-plate-rule py-3">
                        <div className="flex items-center justify-between gap-3">
                          <PlateChip plateNumber={vehicle.plate_number} />
                          <span className="font-plate text-[21px] font-bold">{amount ? formatCdf(amount) : "—"}</span>
                        </div>
                        <p className="mt-1.5 truncate text-[15px]">
                          {vehicle.label} · <b>{vehicle.type === "moto" ? "moto" : "taxi"}</b> · {vehicle.driver_name ?? "Sans chauffeur"}
                        </p>
                        <p className="mt-1 flex flex-wrap items-center justify-between gap-x-3 text-[15px]">
                          {breakdown === "open" ? (
                            <span className="inline-flex items-center gap-2 font-semibold">
                              <StateMark state="bad" />
                              Panne signalée
                            </span>
                          ) : (
                            <VehicleStatusText status={vehicle.status} />
                          )}
                          <span className="text-plate-soft">objectif {formatCdf(vehicle.target_daily_revenue)}/jour</span>
                        </p>
                      </li>
                    );
                  })}
                </ul>

                {/* Ordinateur */}
                <table className="mt-2 hidden w-full border-b-2 border-plate-rule text-left text-[15px] md:table">
                  <thead>
                    <tr className="text-[14px]">
                      <th scope="col" className="py-2 pr-4 font-semibold">Plaque</th>
                      <th scope="col" className="py-2 pr-4 font-semibold">Véhicule</th>
                      <th scope="col" className="py-2 pr-4 font-semibold">Chauffeur</th>
                      <th scope="col" className="py-2 pr-4 font-semibold">État</th>
                      <th scope="col" className="py-2 pr-4 text-right font-semibold">Objectif / jour</th>
                      <th scope="col" className="py-2 text-right font-semibold">Aujourd&apos;hui</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicles.map((vehicle) => {
                      const amount = todayByVehicle.get(vehicle.id);
                      const breakdown = activeBreakdownByVehicle.get(vehicle.id);
                      return (
                        <tr key={vehicle.id} className="border-t-2 border-plate-rule">
                          <td className="py-3 pr-4">
                            <PlateChip plateNumber={vehicle.plate_number} />
                          </td>
                          <td className="py-3 pr-4">
                            {vehicle.label} · <b>{vehicle.type === "moto" ? "moto" : "taxi"}</b>
                          </td>
                          <td className="py-3 pr-4">{vehicle.driver_name ?? "Sans chauffeur"}</td>
                          <td className="py-3 pr-4">
                            {breakdown === "open" ? (
                              <span className="inline-flex items-center gap-2 font-semibold">
                                <StateMark state="bad" />
                                Panne signalée
                              </span>
                            ) : (
                              <VehicleStatusText status={vehicle.status} />
                            )}
                          </td>
                          <td className="whitespace-nowrap py-3 pr-4 text-right font-plate text-[17px] font-bold">
                            {formatCdf(vehicle.target_daily_revenue)}
                          </td>
                          <td className="whitespace-nowrap py-3 text-right font-plate text-[21px] font-bold">
                            {amount ? formatCdf(amount) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}
          </section>

          {/* ─── Pannes et alertes ───────────────────────────────────────── */}
          <div className="mt-10 grid gap-10 lg:grid-cols-2 lg:gap-12">
            <section id="pannes" aria-labelledby="breakdowns-title" className="scroll-mt-20">
              <h2 id="breakdowns-title" className="font-plate text-[24px] font-bold">
                Pannes récentes
              </h2>
              {breakdowns.length > 0 ? (
                <ol className="mt-2 border-b-2 border-plate-rule">
                  {breakdowns.slice(0, 5).map((breakdown) => {
                    const view = breakdownStateView[breakdown.status];
                    const vehicle = vehicleById.get(breakdown.vehicle_id);
                    return (
                      <li key={breakdown.id} className="border-t-2 border-plate-rule py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              {vehicle ? <PlateChip plateNumber={vehicle.plate_number} /> : null}
                              <p className="text-[16px] font-bold">{breakdown.type}</p>
                            </div>
                            <p className="mt-1 text-[15px]">
                              {breakdown.vehicle_label}
                              {breakdown.description ? ` : ${breakdown.description}` : ""}
                            </p>
                            <p className="mt-0.5 text-[15px] text-plate-soft">{formatDate(breakdown.created_at)}</p>
                          </div>
                          <span className="shrink-0 font-plate text-[21px] font-bold">{formatCdf(breakdown.estimated_cost)}</span>
                        </div>
                        <p className="mt-1.5 flex items-center gap-2 text-[14px] font-semibold">
                          <StateMark state={view.state} />
                          {view.label}
                        </p>
                        {breakdown.status !== "resolved" ? (
                          <div className="mt-2">
                            <MaintenanceActionButtons breakdownId={breakdown.id} currentStatus={breakdown.status} />
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="mt-2 border-y-2 border-plate-rule py-5 text-[16px]">Aucune panne signalée. Les signalements récents apparaîtront ici.</p>
              )}
            </section>

            <div id="alertes-km" className="scroll-mt-20">
              <SuspiciousEntriesPanel entries={entries} vehicles={vehicles} />
            </div>
          </div>

          {/* ─── La semaine, véhicule par véhicule ───────────────────────── */}
          {vehicles.length > 0 ? (
            <section aria-labelledby="week-title" className="mt-10">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 id="week-title" className="font-plate text-[24px] font-bold">
                  Les 7 derniers jours, par véhicule
                </h2>
                <p className="text-[15px] text-plate-soft">
                  Du {shortDay(week.days[0])} au {shortDay(week.days[week.days.length - 1])}, une barre par jour, même échelle pour tous
                </p>
              </div>
              <ol className="mt-2 border-b-2 border-plate-rule">
                {week.rows.map(({ vehicle, perDay, total }) => (
                  <li
                    key={vehicle.id}
                    className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 border-t-2 border-plate-rule py-3 md:grid-cols-[minmax(0,240px)_1fr_auto]"
                  >
                    <div className="min-w-0">
                      <PlateChip plateNumber={vehicle.plate_number} />
                      <p className="mt-1 truncate text-[15px]">{vehicle.driver_name ?? vehicle.label}</p>
                    </div>
                    <span className="text-right font-plate text-[21px] font-bold md:order-last">
                      {total ? formatCdf(total) : "—"}
                    </span>
                    <div
                      role="img"
                      aria-label={`${vehicle.plate_number} : ${perDay.filter((amount) => amount > 0).length} jours déclarés sur 7, ${formatCdf(total)}`}
                      className="col-span-2 flex h-10 items-end gap-1 border-b-2 border-plate-ink md:col-span-1"
                    >
                      {perDay.map((amount, index) => (
                        <span
                          key={week.days[index]}
                          title={`${shortDay(week.days[index])} : ${formatCdf(amount)}`}
                          className={cn("flex-1 rounded-t-[2px]", amount > 0 ? "bg-plate-ink" : "h-1 bg-plate-rule")}
                          style={amount > 0 ? { height: `${Math.max(6, (amount / week.scale) * 100)}%` } : undefined}
                        />
                      ))}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {/* ─── Recettes, coûts et chiffres ─────────────────────────────── */}
          <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-12">
            <section aria-labelledby="revenue-title">
              <h2 id="revenue-title" className="font-plate text-[24px] font-bold">
                Recettes et coûts, par jour
              </h2>
              <div className="mt-3">
                {revenueSeries.length > 0 ? (
                  <RevenueChart data={revenueSeries} />
                ) : (
                  <EmptyState title="Aucune recette" text="Les recettes apparaîtront ici après les premières déclarations de vos chauffeurs." />
                )}
              </div>
            </section>

            <section aria-labelledby="figures-title">
              <h2 id="figures-title" className="font-plate text-[24px] font-bold">
                Les chiffres
              </h2>
              <p className="text-[15px] text-plate-soft">
                {entries.length > 1
                  ? `Sur les ${entries.length} dernières recettes déclarées`
                  : entries.length === 1
                    ? "Sur la seule recette déclarée"
                    : "Aucune recette déclarée pour l'instant"}
              </p>
              <dl className="mt-2 border-b-2 border-plate-rule text-[16px]">
                <div className="flex items-center justify-between gap-3 border-t-2 border-plate-rule py-3">
                  <dt className="font-semibold">Recettes</dt>
                  <dd className="font-plate text-[22px] font-bold">{formatCdf(stats?.totalRevenue ?? 0)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-t-2 border-plate-rule py-3">
                  <dt className="font-semibold">
                    Coûts déclarés
                    <span className="block text-[15px] font-normal text-plate-soft">Carburant et entretien</span>
                  </dt>
                  <dd className="font-plate text-[22px] font-bold">{formatCdf(stats?.totalCosts ?? 0)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-t-2 border-plate-rule py-3">
                  <dt className="font-semibold">Ce qui vous reste</dt>
                  <dd className="font-plate text-[22px] font-bold">{formatCdf(stats?.netRevenue ?? 0)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-t-2 border-plate-rule py-3">
                  <dt className="font-semibold">
                    Objectif journalier de la flotte
                    <span className="block text-[15px] font-normal text-plate-soft">Somme des objectifs de vos véhicules</span>
                  </dt>
                  <dd className="font-plate text-[22px] font-bold">{formatCdf(stats?.target ?? 0)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-t-2 border-plate-rule py-3">
                  <dt className="font-semibold">Meilleur chauffeur</dt>
                  <dd className="min-w-0 truncate text-right text-[17px] font-bold">{topDriver}</dd>
                </div>
              </dl>
            </section>
          </div>
        </>
      )}

      {modal === "vehicle" ? <VehicleModal onClose={() => setModal(null)} onSaved={loadDashboard} setNotice={setNotice} /> : null}
      {modal === "driver" ? <DriverModal vehicles={vehicles} onClose={() => setModal(null)} onSaved={loadDashboard} setNotice={setNotice} /> : null}
      {modal === "breakdown" ? <BreakdownModal vehicles={vehicles} onClose={() => setModal(null)} onSaved={loadDashboard} setNotice={setNotice} /> : null}
    </div>
  );
}
