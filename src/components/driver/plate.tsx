import type { PaymentStatus, VehicleStatus } from "@/lib/supabase/types";
import { cn } from "@/lib/utils/cn";

/** « 4821BK01 » ou « 4821 BK 01 » → numéro et code de province séparés, comme sur la plaque. */
function splitPlate(plate: string): { main: string; province: string | null } {
  const compact = plate.trim().toUpperCase();
  const match = compact.match(/^(\d{4})\s*([A-Z]{2})\s*(\d{2})$/);
  if (match) return { main: `${match[1]} ${match[2]}`, province: match[3] };
  return { main: compact, province: null };
}

/** La plaque du véhicule : le seul grand titre de l'espace chauffeur. */
export function LicensePlate({ plateNumber, size = "lg" }: { plateNumber: string | null; size?: "lg" | "sm" }) {
  const { main, province } = splitPlate(plateNumber ?? "");
  const empty = !plateNumber;
  const long = main.length > 9;

  return (
    <div
      className={cn(
        "flex overflow-hidden rounded-[10px] border-[3px] border-plate-ink bg-plate-white",
        "shadow-[inset_0_0_0_3px_theme(colors.plate.white),inset_0_0_0_5px_theme(colors.plate.ink),0_2px_6px_rgba(17,17,17,0.12)]",
        size === "lg" ? "h-24" : "h-14"
      )}
    >
      <div
        className={cn(
          "flex shrink-0 flex-col items-center justify-end bg-plate-band font-plate font-bold tracking-wide text-plate-white",
          size === "lg" ? "w-12 pb-2.5 text-base" : "w-8 pb-1 text-[11px]"
        )}
        aria-hidden
      >
        CGO
      </div>
      <p
        className={cn(
          "flex flex-1 items-center justify-center whitespace-nowrap font-plate font-bold leading-none tracking-[0.03em]",
          size === "lg" ? (long ? "text-[clamp(2rem,9vw,2.75rem)]" : "text-[clamp(2.5rem,13vw,3.75rem)]") : "text-[28px]",
          empty && "text-plate-soft"
        )}
      >
        <span className="sr-only">Plaque </span>
        {empty ? "— — —" : main}
        {province ? (
          <span className={cn("self-end", size === "lg" ? "mb-5 ml-2 text-[0.5em]" : "mb-2 ml-1 text-[0.55em]")}>{province}</span>
        ) : null}
      </p>
    </div>
  );
}

export type DayState = "ok" | "wait" | "bad" | "none";

export function paymentDayState(status: PaymentStatus): DayState {
  if (status === "approved" || status === "validated") return "ok";
  if (status === "rejected") return "bad";
  return "wait";
}

export const dayStateLabels: Record<DayState, string> = {
  ok: "Validé",
  wait: "En attente de validation",
  bad: "Rejeté",
  none: "Rien déclaré"
};

/** Un marqueur par état, le même partout : rond plein, anneau, losange, pointillé. */
export function StateMark({ state, className }: { state: DayState; className?: string }) {
  return <span className={cn("state-mark", `state-mark--${state}`, className)} aria-hidden />;
}

export const vehicleStatusLabels: Record<VehicleStatus, string> = {
  "en service": "En service",
  maintenance: "En réparation",
  repos: "Au repos"
};

export function VehicleStatusText({ status }: { status: VehicleStatus }) {
  const state: DayState = status === "en service" ? "ok" : status === "maintenance" ? "wait" : "none";
  return (
    <span className="inline-flex items-center gap-2 font-semibold">
      <StateMark state={state} />
      {vehicleStatusLabels[status]}
    </span>
  );
}
