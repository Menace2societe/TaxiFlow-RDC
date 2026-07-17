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
  // Utiliser 'layout' pour forcer une invalidation profonde du cache RSC :
  // sans cela, Next.js peut renvoyer le payload RSC en cache même après une
  // mise à jour en base de données.
  revalidatePath(ROUTES.DRIVER_PORTAL, "layout");
  revalidatePath(ROUTES.DRIVER_DASHBOARD, "layout");
  revalidatePath(ROUTES.DRIVER_MAINTENANCE, "layout");
  revalidatePath(ROUTES.INVESTOR_DASHBOARD, "layout");
  revalidatePath(ROUTES.INVESTOR_FLEET, "layout");
  revalidatePath(ROUTES.DASHBOARD_OVERVIEW, "layout");
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

    // Récupérer owner_id en plus de l'id : c'est l'investor_id qui sera notifié
    // de la panne via la requête dashboard investisseur (filtrage par vehicle_id).
    const { data: assigned, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id,owner_id")
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

    if (!assigned.owner_id) {
      console.error("[reportBreakdown] owner_id manquant sur le vehicule :", assigned.id);
      redirect(`${returnPath}?error=${encodeURIComponent("Vehicule sans proprietaire. Contactez le support.")}`);
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

    // Vérifier que ce véhicule est assigné à l'utilisateur connecté.
    // Deux cas légitimes :
    //   1. Chauffeur (driver_id = user.id) — doit pouvoir gérer les pannes de son véhicule.
    //   2. Investisseur/Patron (owner_id = user.id) — doit pouvoir gérer les pannes de sa flotte.
    const { data: vehicle, error: vErr } = await supabase
      .from("vehicles")
      .select("id,status,driver_id,owner_id")
      .eq("id", breakdown.vehicle_id)
      .maybeSingle();

    if (vErr || !vehicle) {
      return { ok: false, message: "Véhicule de la panne introuvable." };
    }

    const isDriver = vehicle.driver_id === user.id;
    const isOwner = vehicle.owner_id === user.id;

    if (!isDriver && !isOwner) {
      return {
        ok: false,
        message: "Accès refusé. Vous n'êtes ni le chauffeur ni le propriétaire de ce véhicule."
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

// ─── Actions sémantiques : startRepair / completeRepair ────────────────────────
// Ces deux actions sont les déclencheurs directs exposés aux boutons UI.
// Elles vérifient l'autorisation (chauffeur OU propriétaire), appliquent
// la transition de statut et synchronisent vehicles.status en backup du trigger.

/**
 * Démarre la réparation d'une panne signalée (open → in_progress).
 * Accessible au chauffeur assigné au véhicule OU au propriétaire.
 */
export async function startRepair(breakdownId: string): Promise<BreakdownActionState> {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, message: "Session expirée. Reconnectez-vous." };
    }

    const { data: breakdown, error: bErr } = await supabase
      .from("breakdowns")
      .select("id,vehicle_id,status")
      .eq("id", breakdownId)
      .maybeSingle();

    if (bErr || !breakdown) {
      return { ok: false, message: "Panne introuvable." };
    }

    if (breakdown.status !== "open") {
      return { ok: false, message: "Cette panne n'est pas en statut « Signalée »." };
    }

    const { data: vehicle, error: vErr } = await supabase
      .from("vehicles")
      .select("id,driver_id,owner_id,status")
      .eq("id", breakdown.vehicle_id)
      .maybeSingle();

    if (vErr || !vehicle) {
      return { ok: false, message: "Véhicule de la panne introuvable." };
    }

    if (vehicle.driver_id !== user.id && vehicle.owner_id !== user.id) {
      return { ok: false, message: "Accès refusé. Vous n'êtes ni le chauffeur ni le propriétaire." };
    }

    const { error: updateErr } = await supabase
      .from("breakdowns")
      .update({ status: "in_progress" })
      .eq("id", breakdownId);

    if (updateErr) {
      return { ok: false, message: updateErr.message };
    }

    // Synchronisation backup du statut véhicule (le trigger BDD couvre déjà ce cas)
    if (vehicle.status !== "maintenance") {
      await supabase
        .from("vehicles")
        .update({ status: "maintenance" })
        .eq("id", vehicle.id);
    }

    revalidateBreakdownViews();
    return { ok: true, message: "Réparation démarrée avec succès." };
  } catch (err) {
    console.error("[startRepair]", err);
    return { ok: false, message: "Impossible de démarrer la réparation. Vérifiez la connexion." };
  }
}

/**
 * Clôture la réparation et remet le véhicule en service (in_progress → resolved).
 * Accessible au chauffeur assigné au véhicule OU au propriétaire.
 * Si c'est la dernière panne active, vehicles.status repasse à 'en service'.
 */
export async function completeRepair(breakdownId: string): Promise<BreakdownActionState> {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, message: "Session expirée. Reconnectez-vous." };
    }

    const { data: breakdown, error: bErr } = await supabase
      .from("breakdowns")
      .select("id,vehicle_id,status")
      .eq("id", breakdownId)
      .maybeSingle();

    if (bErr || !breakdown) {
      return { ok: false, message: "Panne introuvable." };
    }

    if (breakdown.status !== "in_progress") {
      return { ok: false, message: "Cette panne n'est pas en cours de réparation." };
    }

    const { data: vehicle, error: vErr } = await supabase
      .from("vehicles")
      .select("id,driver_id,owner_id")
      .eq("id", breakdown.vehicle_id)
      .maybeSingle();

    if (vErr || !vehicle) {
      return { ok: false, message: "Véhicule de la panne introuvable." };
    }

    if (vehicle.driver_id !== user.id && vehicle.owner_id !== user.id) {
      return { ok: false, message: "Accès refusé. Vous n'êtes ni le chauffeur ni le propriétaire." };
    }

    const { error: updateErr } = await supabase
      .from("breakdowns")
      .update({ status: "resolved" })
      .eq("id", breakdownId);

    if (updateErr) {
      return { ok: false, message: updateErr.message };
    }

    // Vérifier s'il reste des pannes actives sur ce véhicule (autres que celle qu'on vient de résoudre)
    const { count } = await supabase
      .from("breakdowns")
      .select("id", { head: true, count: "exact" })
      .eq("vehicle_id", vehicle.id)
      .neq("status", "resolved")
      .neq("id", breakdownId);

    // Si plus aucune panne active → remettre en service (backup du trigger BDD)
    if ((count ?? 0) === 0) {
      await supabase
        .from("vehicles")
        .update({ status: "en service" })
        .eq("id", vehicle.id);
    }

    revalidateBreakdownViews();
    return { ok: true, message: "Réparation terminée. Véhicule remis en service." };
  } catch (err) {
    console.error("[completeRepair]", err);
    return { ok: false, message: "Impossible de terminer la réparation. Vérifiez la connexion." };
  }
}
