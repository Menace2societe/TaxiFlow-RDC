"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginWithNext, ROUTES } from "@/lib/routes";
import { toNumber } from "@/lib/utils/currency";
import type { EntryCurrency } from "@/lib/supabase/types";

const usdToCdfRate = 2800;
const suspiciousDistanceKm = 50;
const suspiciousMinDeclaredAmountCdf = 5000;

export type EntryActionResult = {
  ok: boolean;
  message: string;
};

function getEntryMetrics(formData: FormData) {
  const amount = toNumber(formData.get("amount") ?? formData.get("declared_amount"));
  const explicitDeclaredAmount = toNumber(formData.get("declared_amount"));
  const declaredAmount = explicitDeclaredAmount > 0 ? explicitDeclaredAmount : amount;
  const startKm = toNumber(formData.get("start_km"));
  const endKm = toNumber(formData.get("end_km") ?? formData.get("mileage_km"));
  const mileage = endKm > 0 ? endKm : toNumber(formData.get("mileage_km"));
  const distanceCovered = Math.max(endKm - startKm, 0);
  const isSuspicious =
    distanceCovered > suspiciousDistanceKm && declaredAmount <= suspiciousMinDeclaredAmountCdf;

  return {
    amount,
    declaredAmount,
    startKm,
    endKm,
    mileage,
    distanceCovered,
    isSuspicious
  };
}

function isValidCurrency(currency: string): currency is EntryCurrency {
  return ["CDF", "USD"].includes(currency);
}

export async function createDailyEntry(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(loginWithNext(ROUTES.DASHBOARD_ENTRIES));
  }

  const vehicleId = String(formData.get("vehicle_id") ?? "");
  const entryDate = String(formData.get("entry_date") ?? new Date().toISOString().slice(0, 10));
  const currencyValue = String(formData.get("currency") ?? "CDF");
  const metrics = getEntryMetrics(formData);
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (
    !vehicleId ||
    !entryDate ||
    metrics.amount <= 0 ||
    metrics.startKm < 0 ||
    metrics.endKm <= 0 ||
    metrics.endKm < metrics.startKm ||
    !isValidCurrency(currencyValue)
  ) {
    redirect(`${ROUTES.DASHBOARD_ENTRIES}?error=Veuillez renseigner un vehicule, un montant, une date et des kilometrages valides.`);
  }

  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("id,driver_id")
    .eq("id", vehicleId)
    .eq("owner_id", user.id)
    .single();

  if (!vehicle) {
    redirect(`${ROUTES.DASHBOARD_ENTRIES}?error=Ce vehicule n'appartient pas a votre flotte.`);
  }

  const { data: duplicate } = await supabase
    .from("daily_entries")
    .select("id")
    .eq("owner_id", user.id)
    .eq("vehicle_id", vehicleId)
    .eq("entry_date", entryDate)
    .maybeSingle();

  if (duplicate) {
    redirect(`${ROUTES.DASHBOARD_ENTRIES}?error=Une recette existe deja pour ce vehicule a cette date.`);
  }

  const revenueCdf = currencyValue === "USD" ? Math.round(metrics.amount * usdToCdfRate) : metrics.amount;

  const { error } = await supabase.from("daily_entries").insert({
    owner_id: user.id,
    vehicle_id: vehicleId,
    driver_id: vehicle.driver_id,
    entry_date: entryDate,
    amount: metrics.amount,
    declared_amount: metrics.declaredAmount,
    currency: currencyValue,
    mileage_km: metrics.mileage,
    start_km: metrics.startKm,
    end_km: metrics.endKm,
    revenue_cdf: revenueCdf,
    fuel_cdf: 0,
    maintenance_cdf: 0,
    notes
  });

  if (error) {
    redirect(`${ROUTES.DASHBOARD_ENTRIES}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(ROUTES.DASHBOARD_ROOT);
  redirect(`${ROUTES.DASHBOARD_ENTRIES}?created=1`);
}

export async function submitDriverDailyEntry(formData: FormData): Promise<EntryActionResult> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Session expiree. Reconnectez-vous puis relancez la synchronisation." };
  }

  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .select("id,driver_id,owner_id")
    .eq("driver_id", user.id)
    .maybeSingle();

  if (vehicleError || !vehicle) {
    return { ok: false, message: "Aucun vehicule assigne." };
  }

  const vehicleRow = vehicle as { id: string; driver_id: string | null; owner_id: string };

  const entryDate = String(formData.get("entry_date") ?? new Date().toISOString().slice(0, 10));
  const currencyValue = String(formData.get("currency") ?? "CDF");
  const metrics = getEntryMetrics(formData);
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (
    !entryDate ||
    metrics.amount <= 0 ||
    metrics.startKm < 0 ||
    metrics.endKm <= 0 ||
    metrics.endKm < metrics.startKm ||
    !isValidCurrency(currencyValue)
  ) {
    return {
      ok: false,
      message: "Veuillez renseigner un montant, une date et des kilometrages valides."
    };
  }

  const { data: duplicate } = await supabase
    .from("daily_entries")
    .select("id")
    .eq("owner_id", vehicleRow.owner_id)
    .eq("vehicle_id", vehicleRow.id)
    .eq("entry_date", entryDate)
    .maybeSingle();

  if (duplicate) {
    return { ok: false, message: "Une recette existe deja pour cette date." };
  }

  const revenueCdf = currencyValue === "USD" ? Math.round(metrics.amount * usdToCdfRate) : metrics.amount;

  const { error } = await supabase.from("daily_entries").insert({
    owner_id: vehicleRow.owner_id,
    vehicle_id: vehicleRow.id,
    driver_id: user.id,
    entry_date: entryDate,
    amount: metrics.amount,
    declared_amount: metrics.declaredAmount,
    currency: currencyValue,
    mileage_km: metrics.mileage,
    start_km: metrics.startKm,
    end_km: metrics.endKm,
    revenue_cdf: revenueCdf,
    fuel_cdf: 0,
    maintenance_cdf: 0,
    notes
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath(ROUTES.DRIVER_PORTAL);
  revalidatePath(ROUTES.INVESTOR_FLEET);
  revalidatePath(ROUTES.DASHBOARD_ROOT);
  return {
    ok: true,
    message: metrics.isSuspicious
      ? "Versement enregistre. Alerte kilometrique signalee a l'investisseur."
      : "Versement enregistre avec succes."
  };
}

export async function createDriverDailyEntry(formData: FormData) {
  const result = await submitDriverDailyEntry(formData);
  if (!result.ok) {
    if (result.message.startsWith("Session expiree")) {
      redirect(loginWithNext(ROUTES.DRIVER_PORTAL));
    }
    redirect(`${ROUTES.DRIVER_PORTAL}?error=${encodeURIComponent(result.message)}`);
  }

  redirect(`${ROUTES.DRIVER_PORTAL}?created=1`);
}
