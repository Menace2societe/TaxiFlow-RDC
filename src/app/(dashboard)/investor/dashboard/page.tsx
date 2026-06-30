"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  Bike,
  CarTaxiFront,
  CheckCircle2,
  Clock,
  Loader2,
  PlusCircle,
  RefreshCw,
  UserPlus,
  Wrench,
  X
} from "lucide-react";
import { reportInvestorBreakdown } from "@/actions/breakdowns";
import { getInvestorDashboardData, type InvestorDashboardDataResult } from "@/actions/investor-dashboard";
import { registerOrAssignDriverByPhone } from "@/actions/investor-fleet";
import { createVehicleFromInvestorDashboard } from "@/actions/vehicles";
import type { DashboardEntry, DashboardVehicle } from "@/lib/dashboard/data";

type ModalName = "vehicle" | "driver" | "breakdown";
type Notice = { type: "success" | "error"; message: string } | null;

const phonePattern = "\\+243[0-9]{9}";

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

function vehicleName(vehicle?: DashboardVehicle) {
  if (!vehicle) {
    return "Vehicule";
  }
  return `${vehicle.label} - ${vehicle.plate_number}`;
}

function VehicleIcon({ type }: { type: "taxi" | "moto" }) {
  const Icon = type === "taxi" ? CarTaxiFront : Bike;
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-300">
      <Icon size={17} aria-hidden />
    </span>
  );
}

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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-white/10 bg-[#111d19] p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button type="button" className="rounded-md p-2 text-stone-400 transition hover:bg-white/10 hover:text-white" onClick={onClose} aria-label="Fermer">
            <X size={20} />
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
    <div className={`rounded-lg border px-4 py-3 text-sm ${ok ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200" : "border-red-400/30 bg-red-500/10 text-red-200"}`}>
      {notice.message}
    </div>
  );
}

function EmptyState({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-white/10 bg-black/10 px-5 py-8 text-center">
      <p className="font-medium text-white">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-stone-400">{text}</p>
      {action ? <div className="mt-4">{action}</div> : null}
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

    setIsSubmitting(false);
  }

  return (
    <ModalShell title="Ajouter un vehicule" onClose={onClose}>
      <form onSubmit={onSubmit} className="mt-5 grid gap-4">
        <label className="grid gap-1 text-sm font-medium text-stone-200">
          Plaque d'immatriculation
          <input className="field" name="plate_number" required minLength={3} value={plateNumber} onChange={(event) => setPlateNumber(event.target.value)} placeholder="KN 4215 AB" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-stone-200">
          Modele
          <input className="field" name="label" required minLength={2} value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Toyota Noah" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-stone-200">
          Type
          <select className="field" name="type" value={type} onChange={(event) => setType(event.target.value as "taxi" | "moto")}>
            <option value="taxi">Taxi</option>
            <option value="moto">Moto</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-stone-200">
          Objectif journalier (CDF)
          <input className="field" name="target_daily_revenue" type="number" min="1" step="1" required value={targetDailyRevenue} onChange={(event) => setTargetDailyRevenue(event.target.value)} />
        </label>
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secondary min-h-10" onClick={onClose} disabled={isSubmitting}>
            Annuler
          </button>
          <button type="submit" className="btn-primary min-h-10" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" size={18} aria-hidden /> : <PlusCircle size={18} aria-hidden />}
            {isSubmitting ? "Enregistrement..." : "Ajouter le vehicule"}
          </button>
        </div>
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

    setIsSubmitting(false);
  }

  return (
    <ModalShell title="Associer un chauffeur" onClose={onClose}>
      {vehicles.length === 0 ? (
        <EmptyState title="Aucun vehicule disponible" text="Ajoutez d'abord un taxi ou une moto avant d'associer un chauffeur." />
      ) : (
        <form onSubmit={onSubmit} className="mt-5 grid gap-4">
          <label className="grid gap-1 text-sm font-medium text-stone-200">
            Vehicule
            <select className="field" name="vehicle_id" required value={vehicleId} onChange={(event) => setVehicleId(event.target.value)}>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicleName(vehicle)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-stone-200">
            Nom du chauffeur
            <input className="field" name="full_name" required minLength={2} value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Jean Kabongo" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-stone-200">
            Telephone RDC
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
          <label className="flex items-start gap-2 rounded-lg border border-white/10 bg-black/10 p-3 text-sm text-stone-300">
            <input className="mt-1" type="checkbox" checked={confirmReassign} onChange={(event) => setConfirmReassign(event.target.checked)} />
            Confirmer la reassignation si ce chauffeur est deja lie a un autre vehicule de ma flotte.
          </label>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary min-h-10" onClick={onClose} disabled={isSubmitting}>
              Annuler
            </button>
            <button type="submit" className="btn-primary min-h-10" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" size={18} aria-hidden /> : <UserPlus size={18} aria-hidden />}
              {isSubmitting ? "Association..." : "Associer le chauffeur"}
            </button>
          </div>
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

    setIsSubmitting(false);
  }

  return (
    <ModalShell title="Declarer une panne" onClose={onClose}>
      {vehicles.length === 0 ? (
        <EmptyState title="Aucun vehicule disponible" text="Votre flotte est vide. Ajoutez un vehicule avant de declarer une panne." />
      ) : (
        <form onSubmit={onSubmit