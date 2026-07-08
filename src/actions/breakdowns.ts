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
