import "server-only";

import { createClient } from "@/lib/supabase/server";
import { todayInAppTimezone } from "@/lib/time/kinshasa";
import { canAddVehicle, monthlyQuote, subscriptionState, type MonthlyQuote, type SubscriptionState } from "./plans";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type OwnerBilling = {
  state: SubscriptionState;
  quote: MonthlyQuote;
  vehicleCount: number;
};

/** Abonnement de l'utilisateur connecté (l'essai démarre à la première lecture). */
export async function getOwnerBilling(supabase: SupabaseServerClient, ownerId: string): Promise<OwnerBilling | null> {
  const [{ data: subscription, error }, { data: vehicles }] = await Promise.all([
    supabase.rpc("ensure_subscription"),
    supabase.from("vehicles").select("type").eq("owner_id", ownerId)
  ]);

  if (error || !subscription) {
    // Migration pas encore appliquée : on ne bloque personne.
    console.error("[getOwnerBilling]", error?.message);
    return null;
  }

  const types = (vehicles ?? []).map((vehicle) => vehicle.type);
  return {
    state: subscriptionState(subscription, todayInAppTimezone()),
    quote: monthlyQuote(types),
    vehicleCount: types.length
  };
}

/** Message d'erreur si l'abonnement ne permet pas d'ajouter un véhicule, sinon null. */
export async function vehicleLimitMessage(supabase: SupabaseServerClient, ownerId: string): Promise<string | null> {
  const billing = await getOwnerBilling(supabase, ownerId);
  if (!billing || canAddVehicle(billing.state, billing.vehicleCount)) return null;
  return "Votre abonnement a expiré : renouvelez-le dans « Abonnement » pour ajouter des véhicules.";
}
