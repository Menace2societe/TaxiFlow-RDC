import { CheckCircle2, CirclePause, Wrench } from "lucide-react";
import { updateVehicleStatus, type VehicleOperationalStatus } from "@/actions/vehicles";
import type { VehicleStatus } from "@/lib/supabase/types";

const statusActions: Array<{
  label: VehicleOperationalStatus;
  dbStatus: VehicleStatus;
  icon: typeof CheckCircle2;
  baseClass: string;
  activeClass: string;
  ringClass: string;
  dotClass: string;
  description: string;
}> = [
  {
    label: "en service",
    dbStatus: "en service",
    icon: CheckCircle2,
    baseClass:
      "border-emerald-500/20 bg-neutral-900/80 text-neutral-400 hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:text-emerald-300",
    activeClass:
      "border-emerald-500/60 bg-emerald-950/60 text-emerald-300 shadow-[0_0_16px_rgba(16,185,129,0.18)]",
    ringClass: "focus:ring-emerald-500/40",
    dotClass: "bg-emerald-400",
    description: "Véhicule disponible"
  },
  {
    label: "maintenance",
    dbStatus: "maintenance",
    icon: Wrench,
    baseClass:
      "border-amber-500/20 bg-neutral-900/80 text-neutral-400 hover:bg-amber-500/10 hover:border-amber-500/40 hover:text-amber-300",
    activeClass:
      "border-amber-500/60 bg-amber-950/50 text-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.18)]",
    ringClass: "focus:ring-amber-500/40",
    dotClass: "bg-amber-400",
    description: "En réparation"
  },
  {
    label: "repos",
    dbStatus: "repos",
    icon: CirclePause,
    baseClass:
      "border-neutral-700/50 bg-neutral-900/80 text-neutral-400 hover:bg-neutral-800 hover:border-neutral-600 hover:text-neutral-300",
    activeClass:
      "border-neutral-500 bg-neutral-800/80 text-neutral-300 shadow-[0_0_10px_rgba(0,0,0,0.4)]",
    ringClass: "focus:ring-neutral-500/30",
    dotClass: "bg-neutral-400",
    description: "Hors service"
  }
];

export function VehicleStatusControls({
  vehicleId,
  currentStatus,
  compact = false
}: {
  vehicleId: string;
  currentStatus: VehicleStatus;
  compact?: boolean;
}) {
  return (
    <div className={`grid gap-2 ${compact ? "grid-cols-3" : "grid-cols-1 sm:grid-cols-3"}`}>
      {statusActions.map((action) => {
        const Icon = action.icon;
        const active = currentStatus === action.dbStatus;

        return (
          <form
            key={action.label}
            action={updateVehicleStatus.bind(null, vehicleId, action.label)}
          >
            <button
              type="submit"
              aria-pressed={active}
              title={action.description}
              className={[
                "group relative w-full overflow-hidden rounded-xl border font-semibold",
                "transition-all duration-200 focus:outline-none focus:ring-2",
                action.ringClass,
                compact ? "min-h-9 px-2 text-xs" : "min-h-12 px-3 text-sm",
                active ? action.activeClass : action.baseClass
              ].join(" ")}
            >
              <span
                className={`inline-flex w-full items-center justify-center gap-2 ${
                  compact ? "" : "flex-col sm:flex-row"
                }`}
              >
                {/* Indicateur actif */}
                {active && (
                  <span
                    className={[
                      "h-2 w-2 shrink-0 rounded-full",
                      action.dotClass,
                      compact ? "" : "absolute left-2.5 top-1/2 -translate-y-1/2",
                      action.dbStatus === "en service" ? "pulse-ring-active" : ""
                    ].join(" ")}
                  />
                )}
                <Icon size={compact ? 13 : 15} aria-hidden className="shrink-0" />
                <span className="capitalize">{action.label}</span>
              </span>
              {/* Sous-label visible en mode non-compact inactif */}
              {!compact && !active && (
                <span className="mt-0.5 block text-[10px] font-normal opacity-50 transition-opacity group-hover:opacity-70">
                  {action.description}
                </span>
              )}
            </button>
          </form>
        );
      })}
    </div>
  );
}
