"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { toNumber } from "@/lib/utils/currency";
import type { EntryCurrency } from "@/lib/supabase/types";

const usdToCdfRate = 2800;

export async function createDailyEntry(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard/entries");
  }

  const vehicleId = String(formData.get("vehicle_id") ?? "");
  const entryDate = String(formData.get("entry_date") ?? new Date().toISOString().slice(0, 10));
  const amount = toNumber(formData.get("amount"));
  const currency = String(formData.get("currency") ?? "CDF") as EntryCurrency;
  const mileage = toNumber(formData.get("mileage_km"));
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!vehicleId || !entryDate || amount <= 0 || mileage <= 0 || !["CDF", "USD"].includes(currency)) {
    redirect("/dashboard/entries?error=Veuillez renseigner un vehicule, un montant, un kilometrage et une date valides.");
  }

  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("id,driver_id")
    .eq("id", vehicleId)
    .eq("owner_id", user.id)
    .single();

  if (!vehicle) {
    redirect("/dashboard/entries?error=Ce vehicule n'appartient pas a votre flotte.");
  }

  const { data: duplicate } = await supabase
    .from("daily_entries")
    .select("id")
    .eq("owner_id", user.id)
    .eq("vehicle_id", vehicleId)
    .eq("entry_date", entryDate)
    .maybeSingle();

  if (duplicate) {
    redirect("/dashboard/entries?error=Une recette existe deja pour ce vehicule a cette date.");
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
  } as any);

  if (error) {
    redirect(`/dashboard/entries?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard/entries?created=1");
}
