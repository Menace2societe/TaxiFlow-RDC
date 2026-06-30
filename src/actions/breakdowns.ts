"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { loginWithNext, ROUTES } from "@/lib/routes";

const reportSchema = z.object({
  type: z.string().min(2).max(120),
  description: z
    .string()
    .max(2000)
    .optional()
    .transform((value) => (value == null || value === "" ? null : value)),
  estimated_cost: z.coerce.number().min(0).default(0)
});

const investorReportSchema = reportSchema.extend({
  vehicle_id: z.string().uuid()
});

export type BreakdownActionState = {
  ok: boolean;
  message: string;
};

export async function reportBreakdown(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(loginWithNext(ROUTES.DRIVER_PORTAL));
  }

  const { data: assigned, error: vehError } = await supabase
    .from("vehicles")
    .select("id")
    .eq("driver_id", user.id)
    .maybeSingle();

  if (vehError || !assigned?.id) {
    redirect(`${ROUTES.DRIVER_PORTAL}?error=Aucun%20vehicule%20assigne%20a%20votre%20compte.`);
  }

  const parsed = reportSchema.safeParse({
    type: formData.get("type"),
    description: String(formData.get("description") ?? ""),
    estimated_cost: formData.get("estimated_cost")
  });

  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors.type?.[0] ?? "Donnees invalides.";
    redirect(`${ROUTES.DRIVER_PORTAL}?error=${encodeURIComponent(first)}`);
  }

  const { data: newId, error } = await supabase.rpc("report_breakdown_transaction", {
    p_vehicle_id: assigned.id,
    p_type: parsed.data.type,
    p_description: parsed.data.description ?? undefined,
    p_estimated_cost: parsed.data.estimated_cost
  });

  if (error) {
    redirect(`${ROUTES.DRIVER_PORTAL}?error=${encodeURIComponent(error.message)}`);
  }

  if (!newId) {
    redirect(`${ROUTES.DRIVER_PORTAL}?error=Signalement%20non%20enregistre.`);
  }

  revalidatePath(ROUTES.DRIVER_PORTAL);
  revalidatePath(ROUTES.INVESTOR_FLEET);
  revalidatePath(ROUTES.DRIVER_MAINTENANCE);
  redirect(`${ROUTES.DRIVER_PORTAL}?breakdown=1`);
}

export async function reportInvestorBreakdown(formData: FormData): Promise<BreakdownActionState> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Session expiree. Reconnectez-vous pour declarer une panne." };
  }

  const parsed = investorReportSchema.safeParse({
    vehicle_id: formData.get("vehicle_id"),
    type: formData.get("type"),
    description: String(formData.get("description") ?? ""),
    estimated_cost: formData.get("estimated_cost")
  });

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const first = Object.values(errors)[0]?.[0] ?? "Donnees invalides.";
    return { ok: false, message: first };
  }

  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .select("id,label")
    .eq("id", parsed.data.vehicle_id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (vehicleError || !vehicle) {
    return { ok: false, message: "Vehicule introuvable ou acces refuse." };
  }

  const { error: insertError } = await supabase.from("breakdowns").insert({
    vehicle_id: parsed.data.vehicle_id,
    reported_by: user.id,
    type: parsed.data.type,
    description: parsed.data.description,
    estimated_cost: parsed.data.estimated_cost,
    status: "open"
  });

  if (insertError) {
    return { ok: false, message: insertError.message };
  }

  const { error: updateError } = await supabase
    .from("vehicles")
    .update({ status: "maintenance" })
    .eq("id", parsed.data.vehicle_id)
    .eq("owner_id", user.id);

  if (updateError) {
    return { ok: false, message: updateError.message };
  }

  revalidatePath(ROUTES.INVESTOR_DASHBOARD);
  revalidatePath(ROUTES.INVESTOR_FLEET);
  revalidatePath(ROUTES.DRIVER_MAINTENANCE);

  return { ok: true, message: `Panne declaree pour ${vehicle.label}.` };
}
