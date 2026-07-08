"use client";

import { useRef, useState } from "react";
import {
  CarTaxiFront,
  CheckCircle2,
  Loader2,
  Phone,
  Search,
  User,
  UserCheck,
  UserPlus,
  Users,
  AlertTriangle
} from "lucide-react";
import { useFormState, useFormStatus } from "react-dom";
import {
  linkDriverToInvestor,
  assignFoundDriverToVehicle,
  type LinkDriverActionState,
  type AvailableVehicle,
  type QuickAssignActionState
} from "@/actions/investor-fleet";
import type { DashboardVehicle } from "@/lib/dashboard/data";

// ─── Bouton rechercher ────────────────────────────────────────────────────────

function SubmitSearchButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary min-h-10 w-full sm:w-auto"
    >
      {pending ? (
        <Loader2 size={15} className="animate-spin" />
      ) : (
        <Search size={15} />
      )}
      {pending ? "Recherche en cours…" : "Rechercher le chauffeur"}
    </button>
  );
}

// ─── Bouton assigner (par véhicule) ───────────────────────────────────────────

function SubmitQuickAssignButton({ driverName }: { driverName: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition-all hover:bg-emerald-500/20 disabled:opacity-50"
    >
      {pending ? (
        <Loader2 size={12} className="animate-spin" />
      ) : (
        <UserCheck size={12} />
      )}
      {pending ? "Assignation…" : `Assigner à ${driverName}`}
    </button>
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
    <div className="rounded-lg border border-neutral-700 bg-neutral-800/40 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="rounded-md bg-emerald-500/10 p-1.5 shrink-0">
            <CarTaxiFront size={14} className="text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{vehicle.label}</p>
            <p className="text-[10px] text-neutral-500">
              {vehicle.plate_number} · {vehicle.type}
            </p>
          </div>
        </div>

        {/*
          Ce formulaire est INDÉPENDANT du formulaire de recherche ci-dessus.
          Il est intentionnellement rendu hors de tout <form> parent.
          Les inputs cachés véhiculent l'UUID du chauffeur et l'ID du véhicule.
        */}
        <form action={formAction} className="shrink-0">
          {/* UUID unique du chauffeur identifié — NE PAS mettre le nom ici */}
          <input type="hidden" name="driver_id" value={driverId} />
          {/* UUID du véhicule disponible */}
          <input type="hidden" name="vehicle_id" value={vehicle.id} />
          <SubmitQuickAssignButton driverName={driverName} />
        </form>
      </div>

      {state.message && (
        <div
          className={`flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium ${
            state.ok
              ? "bg-emerald-500/10 text-emerald-300"
              : "bg-red-500/10 text-red-300"
          }`}
        >
          {state.ok ? (
            <CheckCircle2 size={11} className="shrink-0" />
          ) : (
            <AlertTriangle size={11} className="shrink-0" />
          )}
          {state.message}
        </div>
      )}
    </div>
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

const statusDot: Record<string, string> = {
  "en service": "bg-emerald-400",
  maintenance: "bg-amber-400",
  repos: "bg-neutral-500"
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
    <div className="space-y-5">
      {/* ─── Header ─── */}
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-emerald-500/10 p-2.5">
          <Users className="text-emerald-400" size={20} aria-hidden />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Équipe de Chauffeurs</h2>
          <p className="text-xs text-neutral-500">
            {uniqueDrivers.length} chauffeur(s) lié(s) à votre flotte
          </p>
        </div>
      </div>

      {/* ─── Liste de l'équipe ─── */}
      {uniqueDrivers.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-neutral-800">
          <div className="divide-y divide-neutral-800">
            {uniqueDrivers.map((driver) => (
              <div
                key={driver.id}
                className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center"
              >
                {/* Avatar */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10">
                    <User size={16} className="text-emerald-400" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">
                      {driver.name ?? "Chauffeur sans nom"}
                    </p>
                    {driver.phone && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Phone size={10} className="text-neutral-500" />
                        <p className="text-xs text-neutral-500">{driver.phone}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Véhicule assigné */}
                {driver.vehicle && (
                  <div className="flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-2 sm:ml-auto">
                    <div
                      className={`h-2 w-2 rounded-full ${statusDot[driver.vehicle.status] ?? "bg-neutral-500"}`}
                    />
                    <CarTaxiFront size={13} className="text-neutral-400" aria-hidden />
                    <div>
                      <p className="text-xs font-semibold text-white">{driver.vehicle.label}</p>
                      <p className="text-[10px] text-neutral-500">{driver.vehicle.plate_number}</p>
                    </div>
                  </div>
                )}

                {/* Badge lié */}
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-300">
                  <UserCheck size={10} />
                  Lié
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-neutral-800 border-dashed bg-neutral-900/30 py-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-800">
            <Users size={20} className="text-neutral-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-300">Aucun chauffeur dans l&apos;équipe</p>
            <p className="mt-1 text-xs text-neutral-500">
              Invitez un chauffeur par son téléphone ou son UUID ci-dessous.
            </p>
          </div>
        </div>
      )}

      {/* ─── Formulaire de recherche / invitation ─── */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="rounded-lg bg-emerald-500/10 p-1.5">
            <UserPlus size={15} className="text-emerald-400" />
          </div>
          <h3 className="text-sm font-semibold text-white">Inviter / Rechercher un chauffeur</h3>
        </div>

        {/*
          FORMULAIRE DE RECHERCHE UNIQUEMENT.
          Les boutons d'assignation (AvailableVehicleCard) sont rendus
          EN DEHORS de ce <form> pour éviter l'imbrication HTML invalide.
        */}
        <form ref={formRef} action={searchFormAction} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="link-driver-identifier"
                className="mb-1.5 block text-xs font-medium text-neutral-400"
              >
                Téléphone (+243…) ou UUID
              </label>
              <input
                id="link-driver-identifier"
                name="identifier"
                type="text"
                className="field text-sm"
                placeholder="+243 81 234 5678 ou UUID"
                inputMode="tel"
                required
              />
            </div>
            <div>
              <label
                htmlFor="link-driver-name"
                className="mb-1.5 block text-xs font-medium text-neutral-400"
              >
                Nom complet (si nouveau chauffeur)
              </label>
              <input
                id="link-driver-name"
                name="full_name"
                type="text"
                className="field text-sm"
                placeholder="Jean-Pierre Mukendi"
              />
            </div>
          </div>

          {/* Message de feedback recherche */}
          {searchState.message && (
            <div
              className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs font-medium ${
                searchState.ok
                  ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border border-red-500/30 bg-red-500/10 text-red-300"
              }`}
            >
              {searchState.ok ? (
                <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              )}
              <span>{searchState.message}</span>
            </div>
          )}

          <SubmitSearchButton />
        </form>

        {/*
          SECTION ASSIGNATION — Rendue HORS du <form> de recherche.
          Condition : un chauffeur a été trouvé (foundDriver != null).
          Chaque AvailableVehicleCard contient son propre <form> indépendant.
        */}
        {foundDriver && (
          <div className="mt-4 space-y-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
            {/* Profil chauffeur identifié */}
            <div>
              <p className="mb-1.5 text-xs font-semibold text-emerald-400">
                Chauffeur identifié :
              </p>
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-emerald-500/15 p-1.5">
                  <User size={12} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {foundDriver.full_name ?? "N/A"}
                  </p>
                  {/* Affichage de l'UUID pour confirmation côté debug */}
                  <p className="text-[10px] text-neutral-600 font-mono truncate max-w-[220px]">
                    ID : {foundDriver.id}
                  </p>
                  {foundDriver.phone && (
                    <p className="text-xs text-neutral-500">{foundDriver.phone}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Véhicules disponibles */}
            {availableVehicles.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                  Vos véhicules disponibles ({availableVehicles.length})
                </p>
                <div className="space-y-2">
                  {availableVehicles.map((vehicle) => (
                    <AvailableVehicleCard
                      key={vehicle.id}
                      vehicle={vehicle}
                      driverId={foundDriver.id}
                      driverName={foundDriver.full_name ?? "ce chauffeur"}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-300">
                Tous vos véhicules sont déjà assignés. Libérez un véhicule depuis la liste
                ci-dessus pour pouvoir assigner ce chauffeur.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
