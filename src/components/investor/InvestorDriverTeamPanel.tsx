"use client";

import { useRef } from "react";
import {
  Loader2,
  Phone,
  Search,
  User,
  UserCheck,
  UserPlus,
  Users,
  CarTaxiFront,
  CheckCircle2
} from "lucide-react";
import { useFormState, useFormStatus } from "react-dom";
import { linkDriverToInvestor, type LinkDriverActionState } from "@/actions/investor-fleet";
import type { DashboardVehicle } from "@/lib/dashboard/data";

const initialState: LinkDriverActionState = { ok: false, message: "" };

function SubmitInviteButton() {
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
      {pending ? "Recherche en cours..." : "Rechercher le chauffeur"}
    </button>
  );
}

type TeamDriver = {
  id: string;
  name: string | null;
  phone: string | null;
  vehicle: { id: string; label: string; plate_number: string; status: string } | null;
};

type Props = {
  vehicles: DashboardVehicle[];
};

/**
 * Panneau d'équipe chauffeurs pour l'investisseur.
 * - Liste les chauffeurs liés (via vehicles.driver_id)
 * - Formulaire de recherche/invitation par téléphone ou UUID
 */
export function InvestorDriverTeamPanel({ vehicles }: Props) {
  const [state, formAction] = useFormState(linkDriverToInvestor, initialState);
  const formRef = useRef<HTMLFormElement>(null);

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

  const statusDot: Record<string, string> = {
    "en service": "bg-emerald-400",
    maintenance: "bg-amber-400",
    repos: "bg-neutral-500"
  };

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

                {/* Véhicule */}
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

      {/* ─── Formulaire d'invitation ─── */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="rounded-lg bg-emerald-500/10 p-1.5">
            <UserPlus size={15} className="text-emerald-400" />
          </div>
          <h3 className="text-sm font-semibold text-white">Inviter un chauffeur</h3>
        </div>

        <form ref={formRef} action={formAction} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="link-driver-identifier"
                className="mb-1.5 block text-xs font-medium text-neutral-400"
              >
                Téléphone (+243...) ou UUID
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

          {/* Feedback */}
          {state.message && (
            <div
              className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs font-medium ${
                state.ok
                  ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border border-red-500/30 bg-red-500/10 text-red-300"
              }`}
            >
              {state.ok ? <CheckCircle2 size={13} className="mt-0.5 shrink-0" /> : null}
              <span>{state.message}</span>
            </div>
          )}

          {/* Si chauffeur trouvé, afficher son profil */}
          {state.ok && state.driver && (
            <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-2.5">
              <p className="text-xs text-emerald-400 font-medium mb-1">Chauffeur identifié :</p>
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-emerald-500/15 p-1.5">
                  <User size={12} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{state.driver.full_name ?? "N/A"}</p>
                  {state.driver.phone && (
                    <p className="text-xs text-neutral-500">{state.driver.phone}</p>
                  )}
                </div>
              </div>
              <p className="mt-2 text-[11px] text-emerald-300/70">
                Assignez ce chauffeur à un de vos véhicules dans la liste ci-dessus.
              </p>
            </div>
          )}

          <SubmitInviteButton />
        </form>
      </div>
    </div>
  );
}
