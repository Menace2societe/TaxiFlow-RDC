"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { todayInAppTimezone } from "@/lib/time/kinshasa";

export type ContractActionState = { ok: boolean; message: string };

const contractSchema = z
  .object({
    driver_id: z.string().uuid("Choisissez un chauffeur."),
    vehicle_id: z.string().uuid("Choisissez un véhicule."),
    contract_type: z.enum(["employe", "location_vente"]),
    possession_total_cdf: z.coerce.number().nonnegative().optional(),
    daily_amount_cdf: z.coerce.number().nonnegative().optional(),
    started_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date de début invalide."),
    notes: z.string().trim().max(500).optional()
  })
  .refine((data) => data.contract_type !== "location_vente" || (data.possession_total_cdf ?? 0) > 0, {
    message: "Indiquez le prix total du véhicule pour une location-vente.",
    path: ["possession_total_cdf"]
  });

function revalidateContracts() {
  revalidatePath(ROUTES.INVESTOR_CONTRACTS);
  revalidatePath(ROUTES.DRIVER_DASHBOARD, "layout");
}

export async function createContract(_prev: ContractActionState, formData: FormData): Promise<ContractActionState> {
  const optionalNumber = (key: string) => (formData.get(key) ? formData.get(key) : undefined);
  const parsed = contractSchema.safeParse({
    driver_id: formData.get("driver_id"),
    vehicle_id: formData.get("vehicle_id"),
    contract_type: formData.get("contract_type"),
    possession_total_cdf: optionalNumber("possession_total_cdf"),
    daily_amount_cdf: optionalNumber("daily_amount_cdf"),
    started_at: formData.get("started_at"),
    notes: formData.get("notes") || undefined
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Session expirée. Reconnectez-vous." };

  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("id")
    .eq("id", parsed.data.vehicle_id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!vehicle) return { ok: false, message: "Ce véhicule n'appartient pas à votre flotte." };

  // Un seul contrat actif par chauffeur : l'ancien est clôturé.
  await supabase
    .from("driver_contracts")
    .update({ status: "terminated", ends_at: parsed.data.started_at })
    .eq("owner_id", user.id)
    .eq("driver_id", parsed.data.driver_id)
    .eq("status", "active");

  const isLeaseToOwn = parsed.data.contract_type === "location_vente";
  const { error } = await supabase.from("driver_contracts").insert({
    owner_id: user.id,
    driver_id: parsed.data.driver_id,
    vehicle_id: parsed.data.vehicle_id,
    contract_type: parsed.data.contract_type,
    status: "active",
    possession_total_cdf: isLeaseToOwn ? parsed.data.possession_total_cdf : null,
    possession_paid_cdf: isLeaseToOwn ? 0 : null,
    daily_amount_cdf: parsed.data.daily_amount_cdf || null,
    started_at: parsed.data.started_at,
    notes: parsed.data.notes ?? null
  });
  if (error) return { ok: false, message: error.message };

  revalidateContracts();
  return { ok: true, message: "Contrat enregistré." };
}

export async function closeContract(formData: FormData) {
  const id = z.string().uuid().safeParse(formData.get("contract_id"));
  const status = z.enum(["completed", "terminated"]).safeParse(formData.get("status"));
  if (!id.success || !status.success) return;

  const supabase = await createClient();
  const today = todayInAppTimezone();
  // RLS driver_contracts_owner_all : seul l'investisseur propriétaire peut clôturer.
  await supabase.from("driver_contracts").update({ status: status.data, ends_at: today }).eq("id", id.data);
  revalidateContracts();
}
