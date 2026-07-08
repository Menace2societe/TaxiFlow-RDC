import { redirect } from "next/navigation";
import {
  AlertTriangle,
  CarTaxiFront,
  CheckCircle2,
  Clock,
  Wrench,
  Construction,
  ArrowRight
} from "lucide-react";
import {
  getCurrentUserId,
  getDriverAssignedVehicle,
  getDriverVehicleBreakdowns,
  getDriverProfile
} from "@/lib/dashboard/data";
import { loginWithNext, ROUTES } from "@/lib/routes";
import type { BreakdownStatus } from "@/lib/supabase/types";
import { formatCDF } from "@/lib/utils/currency";
import { BreakdownStatusForm } from "@/components/driver/BreakdownStatusForm";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("fr-CD", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(iso));
}

const statusConfig: Record<
  BreakdownStatus,
  { label: string; icon: typeof Wrench; badgeClass: string; dotClass: string }
> = {
  open: {
    label: "Signalée",
    icon: AlertTriangle,
    badgeClass: "badge badge-red",
    dotClass: "bg-red-400"
  },
  in_progress: {
    label: "En réparation",
    icon: Construction,
    badgeClass: "badge badge-amber",
    dotClass: "bg-amber-400"
  },
  resolved: {
    label: "Résolue",
    icon: CheckCircle2,
    badgeClass: "badge badge-green",
    dotClass: "bg-emerald-400"
  }
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DriverMaintenancePage() {
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect(loginWithNext(ROUTES.DRIVER_MAINTENANCE));
  }

  const [vehicle, breakdowns, profile] = await Promise.all([
    getDriverAssignedVehicle(userId),
    getDriverVehicleBreakdowns(userId),
    getDriverProfile(userId)
  ]);

  const isOwnerDriver = Boolean(profile?.is_owner_driver);

  const openCount = breakdowns.filter((b) => b.status === "open").length;
  const inProgressCount = breakdowns.filter((b) => b.status === "in_progress").length;
  const resolvedCount = breakdowns.filter((b) => b.status === "resolved").length;

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-12 animate-fade-in-up">

      {/* ─── Hero Header ─── */}
      <header className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-gradient-to-br from-neutral-900 via-neutral-900 to-amber-950/20 p-6 shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(245,158,11,0.07)_0%,_transparent_60%)]" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">
              <Wrench size={10} />
              Suivi de maintenance
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Maintenance Moto / Taxi
            </h1>
            <p className="mt-1.5 text-sm text-neutral-400">
              Historique des pannes et gestion de l&apos;état de votre véhicule.
            </p>
          </div>
          <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
            <Wrench size={24} className="text-amber-400" />
          </div>
        </div>
      </header>

      {/* ─── Véhicule assigné ─── */}
      {vehicle ? (
        <section className="card overflow-hidden">
          <div className="card-header flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-2">
              <CarTaxiFront className="text-emerald-400" size={18} aria-hidden />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Mon véhicule</h2>
              {isOwnerDriver && (
                <span className="text-[10px] font-medium text-emerald-400">
                  Chauffeur-patron · Propriétaire
                </span>
              )}
            </div>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-white truncate">{vehicle.label}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <span className="badge badge-neutral">{vehicle.plate_number}</span>
                  <span className="badge badge-neutral uppercase">{vehicle.type}</span>
                  <span
                    className={`badge ${
                      vehicle.status === "en service"
                        ? "badge-green"
                        : vehicle.status === "maintenance"
                        ? "badge-amber"
                        : "badge-neutral"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        vehicle.status === "en service"
                          ? "bg-emerald-400"
                          : vehicle.status === "maintenance"
                          ? "bg-amber-400"
                          : "bg-neutral-400"
                      }`}
                    />
                    {vehicle.status === "en service"
                      ? "En service"
                      : vehicle.status === "maintenance"
                      ? "Maintenance"
                      : "Au repos"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-neutral-800 border-dashed bg-neutral-900/30 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-800">
            <CarTaxiFront size={22} className="text-neutral-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-300">Aucun véhicule assigné</p>
            <p className="mt-1 text-xs text-neutral-500">
              Vous ne pouvez pas suivre la maintenance sans véhicule assigné.
            </p>
          </div>
        </div>
      )}

      {/* ─── KPI pannes ─── */}
      {vehicle && (
        <section className="grid grid-cols-3 gap-3">
          <div className="card p-4">
            <div className="rounded-lg bg-red-500/10 p-2 w-fit">
              <AlertTriangle className="text-red-400" size={16} aria-hidden />
            </div>
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              Signalées
            </p>
            <p className="mt-1 text-xl font-bold text-white tabular-nums">{openCount}</p>
          </div>
          <div className="card p-4">
            <div className="rounded-lg bg-amber-500/10 p-2 w-fit">
              <Construction className="text-amber-400" size={16} aria-hidden />
            </div>
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              En réparation
            </p>
            <p className="mt-1 text-xl font-bold text-white tabular-nums">{inProgressCount}</p>
          </div>
          <div className="card p-4">
            <div className="rounded-lg bg-emerald-500/10 p-2 w-fit">
              <CheckCircle2 className="text-emerald-400" size={16} aria-hidden />
            </div>
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              Résolues
            </p>
            <p className="mt-1 text-xl font-bold text-white tabular-nums">{resolvedCount}</p>
          </div>
        </section>
      )}

      {/* ─── Liste des pannes ─── */}
      <section className="card overflow-hidden">
        <div className="card-header flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Historique des pannes</h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              {breakdowns.length} panne(s) enregistrée(s)
            </p>
          </div>
          <Wrench size={16} className="text-neutral-600" aria-hidden />
        </div>

        {breakdowns.length > 0 ? (
          <div className="divide-y divide-neutral-800">
            {breakdowns.map((breakdown) => {
              const cfg = statusConfig[breakdown.status];
              const StatusIcon = cfg.icon;
              const transitions = {
                open: ["in_progress"],
                in_progress: ["resolved"],
                resolved: []
              } as const;
              const canTransition = (transitions[breakdown.status] as readonly string[]).length > 0;

              return (
                <div key={breakdown.id} className="p-4 space-y-3">
                  {/* Ligne principale */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div
                        className={`mt-0.5 rounded-lg p-2 shrink-0 ${
                          breakdown.status === "open"
                            ? "bg-red-500/10"
                            : breakdown.status === "in_progress"
                            ? "bg-amber-500/10"
                            : "bg-emerald-500/10"
                        }`}
                      >
                        <StatusIcon
                          size={14}
                          className={
                            breakdown.status === "open"
                              ? "text-red-400"
                              : breakdown.status === "in_progress"
                              ? "text-amber-400"
                              : "text-emerald-400"
                          }
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-white text-sm">{breakdown.type}</p>
                          <span className={cfg.badgeClass}>
                            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotClass}`} />
                            {cfg.label}
                          </span>
                        </div>
                        {breakdown.description && (
                          <p className="mt-1 text-xs text-neutral-400 line-clamp-2">
                            {breakdown.description}
                          </p>
                        )}
                        <div className="mt-1.5 flex flex-wrap gap-3">
                          <div className="flex items-center gap-1 text-[10px] text-neutral-500">
                            <Clock size={10} />
                            {formatDate(breakdown.created_at)}
                          </div>
                          {breakdown.estimated_cost > 0 && (
                            <div className="text-[10px] font-medium text-amber-400">
                              {formatCDF(breakdown.estimated_cost)} estimé
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions de transition — disponibles si véhicule assigné ET panne non résolue */}
                  {vehicle && canTransition && (
                    <div className="flex items-center gap-2 pl-9">
                      <ArrowRight size={12} className="text-neutral-600 shrink-0" />
                      <BreakdownStatusForm
                        breakdownId={breakdown.id}
                        currentStatus={breakdown.status}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-800">
              <CheckCircle2 size={20} className="text-neutral-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-300">
                {vehicle ? "Aucune panne enregistrée" : "Aucun véhicule assigné"}
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                {vehicle
                  ? "Signalez une panne depuis le portail chauffeur si besoin."
                  : "Vous ne pouvez pas consulter les pannes sans véhicule assigné."}
              </p>
            </div>
          </div>
        )}
      </section>

    </div>
  );
}
