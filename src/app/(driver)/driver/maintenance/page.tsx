import Link from "next/link";
import { redirect } from "next/navigation";
import { Wrench } from "lucide-react";
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
import { LicensePlate, StateMark, VehicleStatusText, type DayState } from "@/components/driver/plate";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("fr-CD", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(iso));
}

const statusConfig: Record<BreakdownStatus, { label: string; state: DayState }> = {
  open: { label: "Signalée, en attente de réparation", state: "bad" },
  in_progress: { label: "Réparation en cours", state: "wait" },
  resolved: { label: "Réparée", state: "ok" }
};

/** Les types sont enregistrés sans accent : on les affiche comme on les dit. */
const breakdownTypeLabels: Record<string, string> = {
  Electricite: "Électricité",
  Freinage: "Freins"
};

const transitions: Record<BreakdownStatus, readonly BreakdownStatus[]> = {
  open: ["in_progress"],
  in_progress: ["resolved"],
  resolved: []
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
    <div className="pb-6">
      <h1 className="font-plate text-[26px] font-bold leading-tight">Pannes</h1>
      <p className="mt-1 text-[16px]">Les pannes de votre véhicule et où en est la réparation.</p>

      {/* ─── Véhicule ─── */}
      {vehicle ? (
        <section aria-label="Mon véhicule" className="mt-4">
          <LicensePlate plateNumber={vehicle.plate_number} size="sm" />
          <p className="mt-2 flex items-baseline justify-between gap-3 text-[15px]">
            <span>
              {vehicle.label} · <b>{vehicle.type === "moto" ? "moto-taxi" : "taxi"}</b>
              {isOwnerDriver ? " · à vous" : null}
            </span>
            <VehicleStatusText status={vehicle.status} />
          </p>
        </section>
      ) : (
        <section className="mt-5 rounded-xl border-2 border-dashed border-plate-ink px-5 py-6">
          <h2 className="font-plate text-[24px] font-bold leading-tight">Pas encore de véhicule</h2>
          <p className="mt-1 text-[16px]">
            Sans véhicule, il n&apos;y a pas de panne à suivre. Votre investisseur doit d&apos;abord vous affecter un
            véhicule.
          </p>
        </section>
      )}

      {/* ─── Compteurs ─── */}
      {vehicle ? (
        <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-y-2 border-plate-rule py-3 text-[15px] font-semibold">
          <li className="flex items-center gap-2">
            <StateMark state="bad" />
            {openCount} signalée{openCount > 1 ? "s" : ""}
          </li>
          <li className="flex items-center gap-2">
            <StateMark state="wait" />
            {inProgressCount} en réparation
          </li>
          <li className="flex items-center gap-2">
            <StateMark state="ok" />
            {resolvedCount} réparée{resolvedCount > 1 ? "s" : ""}
          </li>
        </ul>
      ) : null}

      {/* ─── Historique ─── */}
      <section aria-labelledby="history-title" className="mt-8">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="history-title" className="font-plate text-[24px] font-bold">
            Historique des pannes
          </h2>
          <p className="text-[14px] font-medium">
            {breakdowns.length} panne{breakdowns.length > 1 ? "s" : ""}
          </p>
        </div>

        {breakdowns.length > 0 ? (
          <ol className="mt-2 border-b-2 border-plate-rule">
            {breakdowns.map((breakdown) => {
              const cfg = statusConfig[breakdown.status];
              const canTransition = transitions[breakdown.status].length > 0;

              return (
                <li key={breakdown.id} className="border-t-2 border-plate-rule py-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-[17px] font-bold">
                      {breakdownTypeLabels[breakdown.type] ?? breakdown.type}
                    </h3>
                    <span className="shrink-0 text-[14px] font-medium">{formatDate(breakdown.created_at)}</span>
                  </div>
                  <p className="mt-1 flex items-center gap-2 text-[15px] font-semibold">
                    <StateMark state={cfg.state} />
                    {cfg.label}
                  </p>
                  {breakdown.description ? <p className="mt-1 text-[15px]">{breakdown.description}</p> : null}
                  {breakdown.estimated_cost > 0 ? (
                    <p className="mt-1 text-[15px]">
                      Coût estimé : <b>{formatCDF(breakdown.estimated_cost)}</b>
                    </p>
                  ) : null}

                  {/* Actions — seulement avec un véhicule et une panne non réparée */}
                  {vehicle && canTransition ? (
                    <div className="mt-3">
                      <BreakdownStatusForm breakdownId={breakdown.id} currentStatus={breakdown.status} />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="mt-3 rounded-xl border-2 border-dashed border-plate-ink px-5 py-6">
            <p className="text-[17px] font-bold">{vehicle ? "Aucune panne enregistrée" : "Aucun véhicule affecté"}</p>
            <p className="mt-1 text-[16px]">
              {vehicle
                ? "Tant mieux. Si le véhicule tombe en panne, signalez-le depuis l'écran Aujourd'hui."
                : "Les pannes apparaîtront ici quand vous aurez un véhicule."}
            </p>
            {vehicle ? (
              <Link href={`${ROUTES.DRIVER_PORTAL}#panne-title`} className="btn-warning mt-4 w-full no-underline">
                <Wrench size={18} aria-hidden />
                Signaler une panne
              </Link>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
