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

/**
 * Action chauffeur : signalement rapide depuis le portail chauffeur.
 * Enveloppée dans un try/catch global pour éviter tout crash de page avec
 * bandeau rouge si la base renvoie une erreur inattendue.
 */
export async function reportBreakdown(formData: FormData) {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      redirect(loginWithNext(ROUTES.DRIVER_PORTAL));
    }

    // Récupération du véhicule assigné au chauffeur
    const { data: assigned, error: vehError } = await supabase
      .from("vehicles")
      .select("id")
      .eq("driver_id", user.id)
      .maybeSingle();

    if (vehError) {
      console.error("[reportBreakdown] Erreur récupération véhicule :", vehError.message);
      redirect(
        `${ROUTES.DRIVER_PORTAL}?error=${encodeURIComponent("Impossible de verifier votre vehicule. Reessayez.")}`
      );
    }

    if (!assigned?.id) {
      redirect(
        `${ROUTES.DRIVER_PORTAL}?error=${encodeURIComponent("Aucun vehicule assigne a votre compte.")}`
      );
    }

    // Validation du formulaire
    const parsed = reportSchema.safeParse({
      type: formData.get("type"),
      description: String(formData.get("description") ?? ""),
      estimated_cost: formData.get("estimated_cost")
    });

    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors.type?.[0] ?? "Donnees invalides.";
      redirect(`${ROUTES.DRIVER_PORTAL}?error=${encodeURIComponent(first)}`);
    }

    // Appel RPC transactionnel (insère la panne + passe le véhicule en maintenance)
    const { data: newId, error } = await supabase.rpc("report_breakdown_transaction", {
      p_vehicle_id: assigned.id,
      p_type: parsed.data.type,
      p_description: parsed.data.description ?? undefined,
      p_estimated_cost: parsed.data.estimated_cost
    });

    if (error) {
      console.error("[reportBreakdown] Erreur RPC :", error.message);
      redirect(`${ROUTES.DRIVER_PORTAL}?error=${encodeURIComponent(error.message)}`);
    }

    if (!newId) {
      redirect(
        `${ROUTES.DRIVER_PORTAL}?error=${encodeURIComponent("Signalement non enregistre. Contactez votre investisseur.")}`
      );
    }

    revalidatePath(ROUTES.DRIVER_PORTAL);
    revalidatePath(ROUTES.INVESTOR_FLEET);
    revalidatePath(ROUTES.DRIVER_MAINTENANCE);
    redirect(`${ROUTES.DRIVER_PORTAL}?breakdown=1`);
  } catch (error) {
    // Les erreurs de redirect() lancent une exception NEXT_REDIRECT — on les laisse passer.
    // Toute autre erreur est interceptée pour éviter le crash de page.
    const isRedirect =
      error != null &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest: unknown }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_REDIRECT");

    if (isRedirect) {
      throw error;
    }

    console.error("[reportBreakdown] Erreur inattendue :", error);
    redirect(
      `${ROUTES.DRIVER_PORTAL}?error=${encodeURIComponent("Signalement impossible. Verifiez votre connexion et reessayez.")}`
    );
  }
}

/**
 * Action investisseur : déclaration de panne depuis le tableau de bord investisseur.
 * Déjà correctement encapsulée dans un try/catch.
 */
export async function reportInvestorBreakdown(formData: FormData): Promise<BreakdownActionState> {
  try {
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
      return {
        ok: false,
        message: vehicleError?.message ?? "Vehicule introuvable ou acces refuse."
      };
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
  } catch (error) {
    console.error("[reportInvestorBreakdown]", error);
    return {
      ok: false,
      message: "Impossible de declarer la panne. Verifiez la connexion Supabase."
    };
  }
}
