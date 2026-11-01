"use client";

import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, KeyRound, Loader2, Phone, Search, UserCheck } from "lucide-react";
import { useFormState, useFormStatus } from "react-dom";
import {
  linkDriverToInvestor,
  assignFoundDriverToVehicle,
  resetDriverAccessCode,
  type LinkDriverActionState,
  type ResetAccessCodeState,
  type AvailableVehicle,
  type QuickAssignActionState
} from "@/actions/investor-fleet";
import { PlateChip, StateMark, vehicleStatusLabels, type DayState } from "@/components/driver/plate";
import type { DashboardVehicle } from "@/lib/dashboard/data";
import type { VehicleStatus } from "@/lib/supabase/types";

// ─── Bouton rechercher ────────────────────────────────────────────────────────

function SubmitSearchButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-secondary w-full px-5 sm:w-auto">
      {pending ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Search size={18} aria-hidden />}
      {pending ? "Recherche en cours…" : "Rechercher le chauffeur"}
    </button>
  );
}

// ─── Bouton assigner (par véhicule) ───────────────────────────────────────────

function SubmitQuickAssignButton({ driverName }: { driverName: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-secondary w-full px-4 text-[15px] sm:w-auto">
      {pending ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <UserCheck size={18} aria-hidden />}
      <span className="whitespace-normal">{pending ? "Assignation…" : `Confier à ${driverName}`}</span>
    </button>
  );
}

// ─── Nouveau code d'accès (chauffeurs inscrits par téléphone) ────────────────

const initialResetState: ResetAccessCodeState = { ok: false, message: "" };

function SubmitResetButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-[48px] items-center gap-1.5 rounded-xl border-2 border-plate-ink bg-plate-white px-4 text-[15px] font-bold text-plate-ink transition-colors hover:bg-plate-ground disabled:opacity-50"
    >
      {pending ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <KeyRound size={18} aria-hidden />}
      {pending ? "Génération…" : "Nouveau code d'accès"}
    </button>
  );
}

function ResetAccessCodeForm({ driverId }: { driverId: string }) {
  const [state, formAction] = useFormState(resetDriverAccessCode, initialResetState);
  return (
    <form action={formAction} className="grid justify-items-start gap-1.5">
      <input type="hidden" name="driver_id" value={driverId} />
      <SubmitResetButton />
      {state.message && (
        <p
          role={state.ok ? "status" : "alert"}
          className={`max-w-xs text-[15px] font-semibold ${state.ok ? "text-plate-ok" : "text-plate-bad"}`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}

// ─── Carte d'un véhicule disponible ───────────────────────────────────────────
// IMPORTANT : Ce composant doit être rendu EN DEHORS de tout autre <form>
// (les formulaires HTML imbriqués sont invalides et silencieusement ignorés).

const initialQuickState: QuickAssignActionState = { ok: false, message: "" };

function AvailableVehicleCard({
  vehicle,
  driverId,
  driverName
}: {
  vehicle: AvailableVehicle;
  driverId: string;
  driverName: string;
}) {
  const [state, formAction] = useFormState(assignFoundDriverToVehicle, initialQuickState);

  return (
    <li className="border-t-2 border-plate-rule py-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <p className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[15px]">
          <PlateChip plateNumber={vehicle.plate_number} />
          <span className="min-w-0">
            <b>{vehicle.label}</b> · {vehicle.type === "moto" ? "moto-taxi" : "taxi"}
          </span>
        </p>

        {/*
          Ce formulaire est INDÉPENDANT du formulaire de recherche ci-dessus.
          Il est intentionnellement rendu hors de tout <form> parent.
          Les inputs cachés véhiculent l'UUID du chauffeur et l'ID du véhicule.
        */}
        <form action={formAction} className="sm:shrink-0">
          {/* UUID unique du chauffeur identifié — NE PAS mettre le nom ici */}
          <input type="hidden" name="driver_id" value={driverId} />
          {/* UUID du véhicule disponible */}
          <input type="hidden" name="vehicle_id" value={vehicle.id} />
          <SubmitQuickAssignButton driverName={driverName} />
        </form>
      </div>

      {state.message && (
        <p
          role={state.ok ? "status" : "alert"}
          className={`mt-2 flex items-start gap-2 text-[15px] font-semibold ${state.ok ? "text-plate-ok" : "text-plate-bad"}`}
        >
          {state.ok ? (
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden />
          ) : (
            <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
          )}
          {state.message}
        </p>
      )}
    </li>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type TeamDriver = {
  id: string;
  name: string | null;
  phone: string | null;
  vehicle: { id: string; label: string; plate_number: string; status: string } | null;
};

type Props = {
  vehicles: DashboardVehicle[];
};

const initialSearchState: LinkDriverActionState = { ok: false, message: "" };

const statusState: Record<string, DayState> = {
  "en service": "ok",
  maintenance: "wait",
  repos: "none"
};

// ─── Composant principal ──────────────────────────────────────────────────────

/**
 * Panneau d'équipe chauffeurs pour l'investisseur.
 *
 * ARCHITECTURE FORM :
 * - La recherche est un <form> indépendant.
 * - La section "chauffeur identifié + véhicules disponibles" est rendue
 *   EN DEHORS du <form> de recherche pour éviter l'imbrication HTML invalide
 *   qui rendrait les boutons d'assignation non-fonctionnels.
 * - L'état du chauffeur trouvé est mémorisé via useState pour persister
 *   entre les re-renders sans être lié au formulaire de recherche.
 */
export function InvestorDriverTeamPanel({ vehicles }: Props) {
  const [searchState, searchFormAction] = useFormState(
    linkDriverToInvestor,
    initialSearchState
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Mémoriser le dernier chauffeur trouvé pour l'afficher hors du <form>
  const [foundDriver, setFoundDriver] = useState<{
    id: string;
    full_name: string | null;
    phone: string | null;
  } | null>(null);

  // Synchroniser le chauffeur trouvé dès que l'état de recherche change
  // (utilisation d'un effet de synchronisation via le render)
  if (
    searchState.ok &&
    searchState.driver &&
    searchState.driver.id !== foundDriver?.id
  ) {
    setFoundDriver(searchState.driver);
  }

  // Dériver les chauffeurs liés depuis la liste de véhicules
  const teamDrivers: TeamDriver[] = vehicles
    .filter((v) => v.driver_id !== null)
    .map((v) => ({
      id: v.driver_id as string,
      name: v.driver_name,
      phone: v.driver_phone,
      vehicle: {
        id: v.id,
        label: v.label,
        plate_number: v.plate_number,
        status: v.status
      }
    }));

  const uniqueDrivers = Array.from(
    new Map(teamDrivers.map((d) => [d.id, d])).values()
  );

  // Véhicules disponibles pour assignation (driver_id === null)
  const availableVehicles: AvailableVehicle[] = vehicles
    .filter((v) => v.driver_id === null)
    .map((v) => ({
      id: v.id,
      label: v.label,
      plate_number: v.plate_number,
      type: v.type,
      status: v.status
    }));

  return (
    <div>
      {/* ─── En-tête ─── */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="team-title" className="font-plate text-[24px] font-bold">
          Équipe de chauffeurs
        </h2>
        <p className="text-[15px] font-medium">
          {uniqueDrivers.length} chauffeur{uniqueDrivers.length > 1 ? "s" : ""} lié{uniqueDrivers.length > 1 ? "s" : ""} à
          votre flotte
        </p>
      </div>

      {/* ─── Liste de l'équipe ─── */}
      {uniqueDrivers.length > 0 ? (
        <ul className="mt-2 border-b-2 border-plate-rule">
          {uniqueDrivers.map((driver) => (
            <li
              key={driver.id}
              className="grid gap-3 border-t-2 border-plate-rule py-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto] md:items-center"
            >
              <div className="min-w-0">
                <p className="truncate text-[17px] font-bold">{driver.name ?? "Chauffeur sans nom"}</p>
                {driver.phone && (
                  <p className="mt-0.5 flex items-center gap-1.5 text-[15px]">
                    <Phone size={15} aria-hidden />
                    {driver.phone}
                  </p>
                )}
              </div>

              {/* Véhicule assigné */}
              {driver.vehicle ? (
                <p className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[15px]">
                  <PlateChip plateNumber={driver.vehicle.plate_number} />
                  <span className="min-w-0">{driver.vehicle.label}</span>
                  <span className="inline-flex items-center gap-2 font-semibold">
                    <StateMark state={statusState[driver.vehicle.status] ?? "none"} />
                    {vehicleStatusLabels[driver.vehicle.status as VehicleStatus] ?? "Statut inconnu"}
                  </span>
                </p>
              ) : (
                <span aria-hidden />
              )}

              <ResetAccessCodeForm driverId={driver.id} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-3 rounded-xl border-2 border-dashed border-plate-ink px-5 py-6">
          <p className="text-[17px] font-bold">Aucun chauffeur dans l&apos;équipe</p>
          <p className="mt-1 text-[16px]">Invitez un chauffeur avec son numéro de téléphone ci-dessous.</p>
        </div>
      )}

      {/* ─── Formulaire de recherche / invitation ─── */}
      <div className="mt-6">
        <h3 className="text-[17px] font-bold">Inviter ou rechercher un chauffeur</h3>

        {/*
          FORMULAIRE DE RECHERCHE UNIQUEMENT.
          Les boutons d'assignation (AvailableVehicleCard) sont rendus
          EN DEHORS de ce <form> pour éviter l'imbrication HTML invalide.
        */}
        <form ref={formRef} action={searchFormAction} className="mt-3 grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label htmlFor="link-driver-identifier" className="block text-[15px] font-semibold">
              Téléphone du chauffeur
              <input
                id="link-driver-identifier"
                name="identifier"
                type="text"
                className="field mt-1.5"
                placeholder="+243 81 234 5678 ou 081 234 5678"
                inputMode="tel"
                required
              />
            </label>
            <label htmlFor="link-driver-name" className="block text-[15px] font-semibold">
              Nom complet (si nouveau chauffeur)
              <input
                id="link-driver-name"
                name="full_name"
                type="text"
                className="field mt-1.5"
                placeholder="Jean-Pierre Mukendi"
              />
            </label>
          </div>

          {/* Retour de la recherche */}
          {searchState.message && (
            <p
              role={searchState.ok ? "status" : "alert"}
              className={`flex items-start gap-2 rounded-lg border-2 bg-plate-white px-4 py-3 text-[15px] font-semibold ${
                searchState.ok ? "border-plate-ok text-plate-ok" : "border-plate-bad text-plate-bad"
              }`}
            >
              {searchState.ok ? (
                <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden />
              ) : (
                <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
              )}
              <span>{searchState.message}</span>
            </p>
          )}

          <SubmitSearchButton />
        </form>

        {/*
          SECTION ASSIGNATION — Rendue HORS du <form> de recherche.
          Condition : un chauffeur a été trouvé (foundDriver != null).
          Chaque AvailableVehicleCard contient son propre <form> indépendant.
        */}
        {foundDriver && (
          <div className="mt-4 rounded-xl border-2 border-plate-ink bg-plate-white px-4 py-4">
            {/* Profil chauffeur identifié */}
            <p className="text-[15px] font-semibold">Chauffeur identifié</p>
            <p className="mt-0.5 text-[17px] font-bold">{foundDriver.full_name ?? "Nom inconnu"}</p>
            {foundDriver.phone && <p className="text-[15px]">{foundDriver.phone}</p>}

            {/* Véhicules disponibles */}
            {availableVehicles.length > 0 ? (
              <div className="mt-4">
                <p className="text-[15px] font-semibold">Vos véhicules sans chauffeur ({availableVehicles.length})</p>
                <ul className="mt-1 border-b-2 border-plate-rule">
                  {availableVehicles.map((vehicle) => (
                    <AvailableVehicleCard
                      key={vehicle.id}
                      vehicle={vehicle}
                      driverId={foundDriver.id}
                      driverName={foundDriver.full_name ?? "ce chauffeur"}
                    />
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-3 flex items-start gap-2 text-[15px] font-semibold">
                <StateMark state="wait" className="mt-1" />
                Tous vos véhicules ont déjà un chauffeur. Libérez un véhicule dans la liste pour pouvoir confier celui-ci.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
