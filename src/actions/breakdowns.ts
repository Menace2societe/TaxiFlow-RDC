"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { loginWithNext, ROUTES } from "@/lib/routes";

const reportSchema = z.object({
  type: z
    .string()
    .nullish()
    .transform((value) => {
      const normalized = value?.trim();
      return normalized ? normalized.slice(0, 120) : "Autre";
    }),
  description: z
    .string()
    .nullish()
    .transform((value) => value?.trim() ?? "")
    .transform((value) => (value === "" ? null : value.slice(0, 2000))),
  estimated_cost: z
    .unknown()
    .transform((cost) => Number(cost) || 0)
    .pipe(z.number().min(0))
});

const investorReportSchema = reportSchema.extend({
  vehicle_id: z.string().uuid()
});

export type BreakdownActionState = {
  ok: boolean;
  message: string;
};

function isNextRedirect(error: unknown) {
  return (
    error != null &&
    typeof error === "object" &&
    "digest" in error &&
    typeof (error as { digest: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

function revalidateBreakdownViews() {
  revalidatePath(ROUTES.DRIVER_PORTAL);
  revalidatePath(ROUTES.DRIVER_DASHBOARD);
  revalidatePath(ROUTES.DRIVER_MAINTENANCE);
  revalidatePath(ROUTES.INVESTOR_DASHBOARD);
  revalidatePath(ROUTES.INVESTOR_FLEET);
  revalidatePath(ROUTES.DASHBOARD_OVERVIEW);
}

export async function reportBreakdown(formData: FormData) {
  const returnPath = String(formData.get("return_path") ?? ROUTES.DRIVER_PORTAL);

  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      redirect(loginWithNext(returnPath));
    }

    const { data: assigned, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id")
      .eq("driver_id", user.id)
      .maybeSingle();

    if (vehicleError) {
      console.error("[reportBreakdown] Vehicle lookup failed:", vehicleError.message);
      redirect(
        `${returnPath}?error=${encodeURIComponent("Impossible de verifier votre vehicule. Reessayez.")}`
      );
    }

    if (!assigned?.id) {
      redirect(`${returnPath}?error=${encodeURIComponent("Aucun vehicule assigne a votre compte.")}`);
    }

    const parsed = reportSchema.safeParse({
      type: formData.get("type"),
      description: formData.get("description"),
      estimated_cost: formData.get("estimated_cost")
    });

    if (!parsed.success) {
      redirect(`${returnPath}?error=${encodeURIComponent("Donnees de panne invalides.")}`);
    }

    const { error: insertError } = await supabase.from("breakdowns").insert({
      vehicle_id: assigned.id,
      reported_by: user.id,
      type: parsed.data.type,
      description: parsed.data.description,
      estimated_cost: parsed.data.estimated_cost,
      status: "open"
    });

    if (insertError) {
      console.error("[reportBreakdown] Insert failed:", insertError.message);
      redirect(`${returnPath}?error=${encodeURIComponent(insertError.message)}`);
    }

    const { error: statusError } = await supabase
      .from("vehicles")
      .update({ status: "maintenance" })
      .eq("id", assigned.id)
      .eq("driver_id", user.id);

    if (statusError) {
      console.error("[reportBreakdown] Vehicle status update failed:", statusError.message);
    }

    revalidateBreakdownViews();
    redirect(`${returnPath}?breakdown=1`);
  } catch (error) {
    if (isNextRedirect(error)) {
      throw error;
    }

    console.error("[reportBreakdown] Unexpected failure:", error);
    redirect(
      `${returnPath}?error=${encodeURIComponent("Signalement impossible. Verifiez votre connexion et reessayez.")}`
    );
  }
}

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
      description: formData.get("description"),
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

    revalidateBreakdownViews();
    return { ok: true, message: `Panne declaree pour ${vehicle.label}.` };
  } catch (error) {
    console.error("[reportInvestorBreakdown]", error);
    return {
      ok: false,
      message: "Impossible de declarer la panne. Verifiez la connexion Supabase."
    };
  }
}

const breakdownStatusSchema = z.object({
  breakdown_id: z.string().uuid(),
  new_status: z.enum(["open", "in_progress", "resolved"])
});

/**
 * Permet à un chauffeur (ou chauffeur-patron) de mettre à jour le statut
 * d'une panne liée à son véhicule.
 * Si la panne passe à "resolved", le véhicule repasse en "en service".
 */
export async function updateBreakdownStatus(
  _prev: BreakdownActionState,
  formData: FormData
): Promise<BreakdownActionState> {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, message: "Session expirée. Reconnectez-vous." };
    }

    const parsed = breakdownStatusSchema.safeParse({
      breakdown_id: formData.get("breakdown_id"),
      new_status: formData.get("new_status")
    });

    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0] ?? "Données invalides.";
      return { ok: false, message: first };
    }

    const { breakdown_id, new_status } = parsed.data;

    // Vérifier que la panne appartient bien au véhicule du chauffeur connecté
    const { data: breakdown, error: bErr } = await supabase
      .from("breakdowns")
      .select("id,vehicle_id,status")
      .eq("id", breakdown_id)
      .maybeSingle();

    if (bErr || !breakdown) {
      return { ok: false, message: "Panne introuvable." };
    }

    // Vérifier que ce véhicule est bien assigné à l'utilisateur connecté
    const { data: vehicle, error: vErr } = await supabase
      .from("vehicles")
      .select("id,status")
      .eq("id", breakdown.vehicle_id)
      .eq("driver_id", user.id)
      .maybeSingle();

    if (vErr || !vehicle) {
      return {
        ok: false,
        message: "Accès refusé. Cette panne ne concerne pas votre véhicule."
      };
    }

    // Mettre à jour le statut de la panne
    const { error: updateErr } = await supabase
      .from("breakdowns")
      .update({ status: new_status })
      .eq("id", breakdown_id);

    if (updateErr) {
      return { ok: false, message: updateErr.message };
    }

    // Mise à jour du statut du véhicule selon la progression de la panne
    if (new_status === "in_progress" && vehicle.status !== "maintenance") {
      await supabase
        .from("vehicles")
        .update({ status: "maintenance" })
        .eq("id", vehicle.id);
    } else if (new_status === "resolved") {
      // Vérifier s'il reste des pannes non résolues sur ce véhicule
      const { count } = await supabase
        .from("breakdowns")
        .select("id", { head: true, count: "exact" })
        .eq("vehicle_id", vehicle.id)
        .neq("status", "resolved")
        .neq("id", breakdown_id);

      if ((count ?? 0) === 0) {
        // Plus de pannes actives → remettre le véhicule "en service"
        await supabase
          .from("vehicles")
          .update({ status: "en service" })
          .eq("id", vehicle.id);
      }
    }

    revalidateBreakdownViews();

    const labels: Record<string, string> = {
      open: "Signalée",
      in_progress: "En réparation",
      resolved: "Résolue"
    };

    return {
      ok: true,
      message: `Statut mis à jour : ${labels[new_status] ?? new_status}.`
    };
  } catch (err) {
    console.error("[updateBreakdownStatus]", err);
    return { ok: false, message: "Mise à jour impossible. Vérifiez la connexion." };
  }
}
