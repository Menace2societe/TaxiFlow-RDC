"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginWithNext, ROUTES } from "@/lib/routes";
import { toNumber } from "@/lib/utils/currency";
import type { EntryCurrency } from "@/lib/supabase/types";

const usdToCdfRate = 2800;

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
  const amount = toNumber(formData.get("amount"));
  const currency = String(formData.get("currency") ?? "CDF") as EntryCurrency;
  const mileage = toNumber(formData.get("mileage_km"));
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!vehicleId || !entryDate || amount <= 0 || mileage <= 0 || !["CDF", "USD"].includes(currency)) {
    redirect(`${ROUTES.DASHBOARD_ENTRIES}?error=Veuillez renseigner un vehicule, un montant, un kilometrage et une date valides.`);
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

  const revenueCdf = currency === "USD" ? Math.round(amount * usdToCdfRate) : amount;

  const { error } = await supabase.from("daily_entries").insert({
    owner_id: user.id,
    vehicle_id: vehicleId,
    driver_id: vehicle.driver_id,
    entry_date: entryDate,
    amount,
    currency,
    mileage_km: mileage,
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

export async function createDriverDailyEntry(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(loginWithNext(ROUTES.DRIVER_PORTAL));
  }

  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .select("id,driver_id,owner_id")
    .eq("driver_id", user.id)
    .maybeSingle();

  if (vehicleError || !vehicle) {
    redirect(`${ROUTES.DRIVER_PORTAL}?error=Aucun%20vehicule%20assigne.`);
  }

  const vehicleRow = vehicle as { id: string; driver_id: string | null; owner_id: string };

  const entryDate = String(formData.get("entry_date") ?? new Date().toISOString().slice(0, 10));
  const amount = toNumber(formData.get("amount"));
  const currency = String(formData.get("currency") ?? "CDF") as EntryCurrency;
  const mileage = toNumber(formData.get("mileage_km"));
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!entryDate || amount <= 0 || mileage <= 0 || !["CDF", "USD"].includes(currency)) {
    redirect(`${ROUTES.DRIVER_PORTAL}?error=Veuillez%20renseigner%20un%20montant%2C%20un%20kilometrage%20et%20une%20date%20valides.`);
  }

  const { data: duplicate } = await supabase
    .from("daily_entries")
    .select("id")
    .eq("owner_id", vehicleRow.owner_id)
    .eq("vehicle_id", vehicleRow.id)
    .eq("entry_date", entryDate)
    .maybeSingle();

  if (duplicate) {
    redirect(`${ROUTES.DRIVER_PORTAL}?error=Une%20recette%20existe%20deja%20pour%20cette%20date.`);
  }

  const revenueCdf = currency === "USD" ? Math.round(amount * usdToCdfRate) : amount;

  const { error } = await supabase.from("daily_entries").insert({
    owner_id: vehicleRow.owner_id,
    vehicle_id: vehicleRow.id,
    driver_id: user.id,
    entry_date: entryDate,
    amount,
    currency,
    mileage_km: mileage,
    revenue_cdf: revenueCdf,
    fuel_cdf: 0,
    maintenance_cdf: 0,
    notes
  });

  if (error) {
    redirect(`${ROUTES.DRIVER_PORTAL}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(ROUTES.DRIVER_PORTAL);
  revalidatePath(ROUTES.INVESTOR_FLEET);
  revalidatePath(ROUTES.DASHBOARD_ROOT);
  redirect(`${ROUTES.DRIVER_PORTAL}?created=1`);
}
