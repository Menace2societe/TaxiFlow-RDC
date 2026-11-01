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
// Noms de classe écrits en entier : Tailwind ne génère que ceux qu'il voit dans le code.
const stateMarkClass: Record<DayState, string> = {
  ok: "state-mark--ok",
  wait: "state-mark--wait",
  bad: "state-mark--bad",
  none: "state-mark--none"
};

export function StateMark({ state, className }: { state: DayState; className?: string }) {
  return <span className={cn("state-mark", stateMarkClass[state], className)} aria-hidden />;
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

/** 30 jours de versements validés (points de getDriverPaymentTrend) : une barre par jour, toutes à la même échelle. */
export function MonthBars({ points, target }: { points: Array<{ date: string; amount: number }>; target: number }) {
  const scale = Math.max(target, ...points.map((p) => p.amount), 1);
  const total = points.reduce((sum, p) => sum + p.amount, 0);
  const paidDays = points.filter((p) => p.amount > 0).length;
  // Les points arrivent déjà libellés (« 03 oct. »).
  const dayLabel = (label: string) => label;

  if (!points.length) {
    return <p className="rounded-xl border-2 border-dashed border-plate-ink px-4 py-5 text-[16px]">Aucun versement validé sur 30 jours.</p>;
  }

  return (
    <figure>
      <div
        role="img"
        aria-label={`${paidDays} jours payés sur ${points.length}, ${total.toLocaleString("fr-CD")} FC validés`}
        className="relative flex h-32 items-end gap-[3px] border-b-2 border-plate-ink"
      >
        {target > 0 ? (
          <span
            className="absolute inset-x-0 border-t-2 border-dashed border-plate-soft"
            style={{ bottom: `${(target / scale) * 100}%` }}
            aria-hidden
          />
        ) : null}
        {points.map((p) => (
          <span
            key={p.date}
            title={`${dayLabel(p.date)} : ${p.amount.toLocaleString("fr-CD")} FC`}
            className={cn("flex-1 rounded-t-[2px]", p.amount > 0 ? "bg-plate-ink" : "h-1 bg-plate-rule")}
            style={p.amount > 0 ? { height: `${Math.max(4, (p.amount / scale) * 100)}%` } : undefined}
          />
        ))}
      </div>
      <figcaption className="mt-1.5 flex justify-between text-[14px] font-medium">
        <span>{dayLabel(points[0].date)}</span>
        {target > 0 ? <span>Pointillés : objectif {target.toLocaleString("fr-CD")} FC</span> : null}
        <span>{dayLabel(points[points.length - 1].date)}</span>
      </figcaption>
      <p className="mt-2 text-[16px]">
        <b>{paidDays} jours payés</b> sur {points.length} · <b>{total.toLocaleString("fr-CD")} FC</b> validés
      </p>
    </figure>
  );
}

/** Plaque miniature pour les lignes denses (tableaux, listes) : même cadre, même bande bleue, sans relief. */
export function PlateChip({ plateNumber, className }: { plateNumber: string | null; className?: string }) {
  const { main, province } = splitPlate(plateNumber ?? "");
  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-stretch overflow-hidden rounded-[5px] border-2 border-plate-ink bg-plate-white align-middle",
        className
      )}
    >
      <span className="w-2 shrink-0 bg-plate-band" aria-hidden />
      <span className="flex items-center whitespace-nowrap px-1.5 font-plate text-[17px] font-bold leading-none tracking-[0.03em]">
        <span className="sr-only">Plaque </span>
        {plateNumber ? main : "— — —"}
        {province ? <span className="ml-0.5 self-end pb-[3px] text-[13px]">{province}</span> : null}
      </span>
    </span>
  );
}
