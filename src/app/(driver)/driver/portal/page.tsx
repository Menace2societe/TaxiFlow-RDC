import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, Wrench } from "lucide-react";
import { reportBreakdown } from "@/actions/breakdowns";
import { updateVehicleStatus, type VehicleOperationalStatus } from "@/actions/vehicles";
import { DriverVersementForm } from "@/components/driver/DriverVersementForm";
import { MobileMoneyPayForm } from "@/components/driver/MobileMoneyPayForm";
import { OwnerDriverRegisterVehicleForm } from "@/components/driver/OwnerDriverRegisterVehicleForm";
import { OwnerPaymentActions } from "@/components/driver/OwnerPaymentActions";
import {
  LicensePlate,
  StateMark,
  VehicleStatusText,
  dayStateLabels,
  paymentDayState,
  vehicleStatusLabels,
  type DayState
} from "@/components/driver/plate";
import { MaintenanceActionButtons } from "@/components/shared/MaintenanceActionButtons";
import {
  getCurrentUserId,
  getDriverAssignedVehicle,
  getDriverProfile,
  getDriverRecentPayments,
  getDriverVehicleBreakdowns
} from "@/lib/dashboard/data";
import { getUsdToCdfRate } from "@/lib/fx/rate";
import { isPawapayConfigured } from "@/lib/mobile-money/pawapay";
import { loginWithNext, ROUTES } from "@/lib/routes";
import type { BreakdownStatus, VehicleStatus } from "@/lib/supabase/types";
import { recentDates, todayInAppTimezone } from "@/lib/time/kinshasa";
import { cn } from "@/lib/utils/cn";
import { formatCDF } from "@/lib/utils/currency";

type PortalPageProps = {
  searchParams?: Promise<{ error?: string; payment?: string; breakdown?: string }>;
};

const breakdownLabels: Record<BreakdownStatus, string> = {
  open: "Panne signalée, en attente de réparation",
  in_progress: "Réparation en cours",
  resolved: "Réparation terminée"
};

const statusChoices: Array<{ value: VehicleOperationalStatus; db: VehicleStatus }> = [
  { value: "en service", db: "en service" },
  { value: "maintenance", db: "maintenance" },
  { value: "repos", db: "repos" }
];

/** « 2026-11-01 » → « samedi 1er novembre » */
function longDay(isoDate: string) {
  const label = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(`${isoDate}T12:00:00Z`)
  );
  const withFirst = label.replace(/^(\S+) 1 /, "$1 1er ");
  return `${withFirst.charAt(0).toUpperCase()}${withFirst.slice(1)}`;
}

/** « 2026-10-31 » → « Ven. 31 » */
function shortDay(isoDate: string) {
  const date = new Date(`${isoDate}T12:00:00Z`);
  const weekday = new Intl.DateTimeFormat("fr-FR", { weekday: "short", timeZone: "UTC" }).format(date);
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${date.getUTCDate()}`;
}

function firstName(fullName: string | null | undefined) {
  return fullName?.trim().split(/\s+/)[0] || null;
}

export default async function DriverPortalPage({ searchParams }: PortalPageProps) {
  const usdRate = await getUsdToCdfRate();
  const params = await searchParams;
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect(loginWithNext(ROUTES.DRIVER_PORTAL));
  }

  const [vehicle, recentPayments, driverProfile, allBreakdowns] = await Promise.all([
    getDriverAssignedVehicle(userId),
    getDriverRecentPayments(userId, 14),
    getDriverProfile(userId),
    getDriverVehicleBreakdowns(userId)
  ]);

  const activeBreakdown = allBreakdowns.find((b) => b.status !== "resolved") ?? null;
  const hasVehicle = Boolean(vehicle);
  const isOwnerDriver = Boolean(driverProfile?.is_owner_driver);
  const name = firstName(driverProfile?.full_name);

  const today = todayInAppTimezone();
  const dayOf = (payment: (typeof recentPayments)[number]) => payment.payment_date ?? payment.created_at.slice(0, 10);
  const todayPayment = recentPayments.find((p) => dayOf(p) === today) ?? null;
  const todayState: DayState = todayPayment ? paymentDayState(todayPayment.status) : "none";

  // Les 7 jours avant aujourd'hui, du plus récent au plus ancien, tous à la même échelle.
  const pastDays = recentDates(8).slice(0, 7).reverse();
  const week = pastDays.map((date) => {
    const payments = recentPayments.filter((p) => dayOf(p) === date);
    const amount = payments.reduce((sum, p) => sum + p.amount, 0);
    const state: DayState = payments.length ? paymentDayState(payments[0].status) : "none";
    return { date, amount, state, payments };
  });
  const scale = Math.max(vehicle?.target_daily_revenue ?? 0, ...week.map((d) => d.amount), 1);
  const weekValidated = week.filter((d) => d.state === "ok").reduce((sum, d) => sum + d.amount, 0);

  // Véhicule en réparation ou au repos, rien déclaré : on n'attend pas de versement.
  const stopped = Boolean(vehicle && vehicle.status !== "en service" && todayState === "none");

  const todayHeadline: Record<DayState, string> = {
    none: "Pas encore déclaré",
    wait: "Déclaré, en attente",
    ok: "Versement validé",
    bad: "Versement rejeté"
  };

  return (
    <div className="pb-6">
      <div className="flex items-baseline justify-between gap-3 text-[15px] font-semibold">
        <span>{name ? `Mbote, ${name}` : "Mbote"}</span>
        <span className="font-medium">1 USD = {usdRate.rate.toLocaleString("fr-CD")} FC</span>
      </div>

      {params?.error ? (
        <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg border-2 border-plate-bad bg-plate-white px-4 py-3 text-[15px] font-semibold text-plate-bad">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
          {params.error}
        </p>
      ) : null}
      {params?.payment ? (
        <p role="status" className="mt-3 flex items-start gap-2 rounded-lg border-2 border-plate-ok bg-plate-white px-4 py-3 text-[15px] font-semibold text-plate-ok">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden />
          Versement envoyé.
        </p>
      ) : null}
      {params?.breakdown ? (
        <p role="status" className="mt-3 flex items-start gap-2 rounded-lg border-2 border-plate-ink bg-plate-white px-4 py-3 text-[15px] font-semibold">
          <Wrench size={18} className="mt-0.5 shrink-0" aria-hidden />
          Panne signalée. Le véhicule passe en réparation.
        </p>
      ) : null}

      <h1 className="sr-only">Aujourd&apos;hui</h1>

      <div className="mt-4">
        <LicensePlate plateNumber={vehicle?.plate_number ?? null} />
      </div>

      {vehicle ? (
        <p className="mt-2 flex items-baseline justify-between gap-3 text-[15px]">
          <span>
            {vehicle.label} · <b>{vehicle.type === "moto" ? "moto-taxi" : "taxi"}</b>
          </span>
          <VehicleStatusText status={vehicle.status} />
        </p>
      ) : isOwnerDriver ? (
        <section className="mt-5">
          <h2 className="font-plate text-[26px] font-bold leading-tight">Enregistrez votre véhicule</h2>
          <p className="mt-1 text-[16px]">Vous êtes chauffeur-propriétaire : vos versements seront validés tout de suite.</p>
          <div className="mt-4">
            <OwnerDriverRegisterVehicleForm />
          </div>
        </section>
      ) : (
        <section className="mt-5 rounded-xl border-2 border-dashed border-plate-ink px-5 py-6">
          <h2 className="font-plate text-[26px] font-bold leading-tight">Pas encore de véhicule</h2>
          <p className="mt-1 text-[16px]">
            Votre investisseur doit vous affecter un véhicule avec votre numéro. Dès que c&apos;est fait, il apparaît ici.
          </p>
        </section>
      )}

      {activeBreakdown ? (
        <section aria-live="polite" className="mt-5 rounded-xl border-2 border-plate-ink bg-plate-white px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-[17px] font-bold">
                <StateMark state={activeBreakdown.status === "open" ? "bad" : "wait"} />
                {breakdownLabels[activeBreakdown.status]}
              </h2>
              <p className="mt-1 text-[15px]">
                {activeBreakdown.type}
                {activeBreakdown.description ? ` : ${activeBreakdown.description}` : ""}
              </p>
            </div>
            <Link href={ROUTES.DRIVER_MAINTENANCE} className="shrink-0 text-[15px] font-semibold underline underline-offset-4">
              Détails
            </Link>
          </div>
          <div className="mt-3">
            <MaintenanceActionButtons breakdownId={activeBreakdown.id} currentStatus={activeBreakdown.status} />
          </div>
        </section>
      ) : null}

      {vehicle ? (
        <section aria-labelledby="today-title" className="vignette-stick mt-5 rounded-2xl bg-plate-vignette px-5 pb-5 pt-4">
          <h2 id="today-title" className="flex items-center gap-2.5 font-plate text-[34px] font-bold leading-[1.05]">
            {todayState !== "none" ? <StateMark state={todayState} className="h-4 w-4" /> : null}
            {stopped ? "Véhicule à l'arrêt" : todayHeadline[todayState]}
          </h2>
          <p className="mt-2 text-[16px] leading-snug">
            {longDay(today)}
            {" · "}
            {todayPayment ? (
              <>
                vous avez déclaré <b>{formatCDF(todayPayment.amount)}</b>.
                {todayState === "wait" ? " Votre investisseur doit le valider." : null}
                {todayState === "bad" ? " Voyez le motif dans vos recettes et déclarez à nouveau." : null}
              </>
            ) : stopped ? (
              <>pas de versement attendu tant que le véhicule est {vehicle.status === "maintenance" ? "en réparation" : "au repos"}.</>
            ) : (
              <>
                versement attendu : <b>{formatCDF(vehicle.target_daily_revenue)}</b>. Notez le compteur avant de rendre le véhicule.
              </>
            )}
          </p>
          {stopped ? (
            <a href="#declarer" className="mt-3 inline-block py-2 text-[16px] font-bold underline underline-offset-4">
              Déclarer quand même un versement
            </a>
          ) : todayState === "none" || todayState === "bad" ? (
            <div className="mt-4 grid gap-2">
              <a href="#declarer" className="btn-primary w-full no-underline">
                Déclarer mon versement
              </a>
              {!isOwnerDriver ? (
                <a href="#mobile-money" className="py-2 text-center text-[16px] font-bold underline underline-offset-4">
                  Payer par Mobile Money
                </a>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {vehicle ? (
        <section aria-labelledby="week-title" className="mt-8">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="week-title" className="font-plate text-[24px] font-bold">
              Les 7 derniers jours
            </h2>
            <p className="text-[14px] font-medium">Validé : {formatCDF(weekValidated)}</p>
          </div>
          <ol className="mt-2 border-b-2 border-plate-rule">
            {week.map((day) => (
              <li key={day.date} className="border-t-2 border-plate-rule py-2.5">
                <div className="grid grid-cols-[64px_1fr_auto] items-center gap-3">
                  <span className="text-[16px] font-bold">{shortDay(day.date)}</span>
                  <span className="h-3 rounded-sm bg-plate-rule/60" aria-hidden>
                    <span
                      className={cn("block h-3 rounded-sm", day.state === "bad" ? "bg-plate-bad" : "bg-plate-ink")}
                      style={{ width: `${Math.round((day.amount / scale) * 100)}%` }}
                    />
                  </span>
                  <span className="min-w-[96px] text-right font-plate text-[21px] font-bold">
                    {day.amount ? day.amount.toLocaleString("fr-CD") : "—"}
                  </span>
                </div>
                <p className="mt-0.5 flex items-center gap-2 pl-[76px] text-[14px] font-semibold">
                  <StateMark state={day.state} />
                  {dayStateLabels[day.state]}
                </p>
                {isOwnerDriver && day.payments.length ? (
                  <div className="mt-2 pl-[76px]">
                    {day.payments.map((payment) => (
                      <OwnerPaymentActions key={payment.id} paymentId={payment.id} currentStatus={payment.status} />
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
          <Link href={ROUTES.DRIVER_DASHBOARD} className="mt-3 inline-block text-[16px] font-bold underline underline-offset-4">
            Toutes mes recettes
          </Link>
        </section>
      ) : null}

      <section id="declarer" aria-labelledby="declarer-title" className="mt-10 scroll-mt-4">
        <h2 id="declarer-title" className="font-plate text-[26px] font-bold">
          Déclarer mon versement
        </h2>
        <p className="mt-1 text-[16px]">
          Le compteur du matin, celui du soir, et une photo nette. Sans réseau, le versement part dès le retour de la connexion.
        </p>
        <div className="mt-4">
          <DriverVersementForm hasVehicle={hasVehicle} usdRate={usdRate.rate} />
        </div>
      </section>

      {hasVehicle && !isOwnerDriver ? (
        <section id="mobile-money" aria-labelledby="mm-title" className="mt-10 scroll-mt-4">
          <h2 id="mm-title" className="font-plate text-[26px] font-bold">
            Payer par Mobile Money
          </h2>
          <p className="mt-1 text-[16px]">M-Pesa, Airtel Money ou Orange Money. Le versement est validé dès que l&apos;argent arrive.</p>
          <div className="mt-4">
            <MobileMoneyPayForm defaultPhone={driverProfile?.phone ?? null} enabled={isPawapayConfigured()} />
          </div>
        </section>
      ) : null}

      {vehicle ? (
        <section aria-labelledby="status-title" className="mt-10">
          <h2 id="status-title" className="font-plate text-[26px] font-bold">
            État du véhicule
          </h2>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {statusChoices.map((choice) => {
              const active = vehicle.status === choice.db;
              return (
                <form key={choice.value} action={updateVehicleStatus.bind(null, vehicle.id, choice.value)}>
                  <button
                    type="submit"
                    aria-pressed={active}
                    className={cn(
                      "min-h-[52px] w-full rounded-xl border-2 border-plate-ink px-1 text-[15px] font-bold transition-colors",
                      active ? "bg-plate-ink text-plate-white" : "bg-plate-white text-plate-ink hover:bg-plate-ground"
                    )}
                  >
                    {vehicleStatusLabels[choice.db]}
                  </button>
                </form>
              );
            })}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="panne-title" className="mt-10">
        <h2 id="panne-title" className="font-plate text-[26px] font-bold">
          Signaler une panne
        </h2>
        <p className="mt-1 text-[16px]">Le véhicule passe en réparation et votre investisseur est prévenu.</p>
        <form action={reportBreakdown} className="mt-4 grid gap-4">
          <label className="block text-[15px] font-semibold">
            Type de panne
            <select className="field mt-1.5" name="type" disabled={!hasVehicle} defaultValue="">
              <option value="" disabled>
                Choisir…
              </option>
              <option value="Moteur">Moteur</option>
              <option value="Pneu">Pneu</option>
              <option value="Freinage">Freins</option>
              <option value="Electricite">Électricité</option>
              <option value="Accident">Accident</option>
              <option value="Autre">Autre</option>
            </select>
          </label>
          <label className="block text-[15px] font-semibold">
            Ce qui s&apos;est passé
            <input
              className="field mt-1.5"
              name="description"
              maxLength={500}
              placeholder="Ex. : crevaison roue arrière gauche"
              disabled={!hasVehicle}
            />
          </label>
          <label className="block text-[15px] font-semibold">
            Coût estimé en FC (si vous le savez)
            <input
              className="field mt-1.5"
              name="estimated_cost"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              disabled={!hasVehicle}
            />
          </label>
          <button id="portal-submit-breakdown" className="btn-warning w-full" type="submit" disabled={!hasVehicle}>
            <Wrench size={18} aria-hidden />
            Signaler la panne
          </button>
        </form>
      </section>
    </div>
  );
}
