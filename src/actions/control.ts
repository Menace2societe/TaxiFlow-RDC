"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export type ReviewEntryState = { ok: boolean; message: string };

const reviewSchema = z.object({
  entry_id: z.string().uuid(),
  decision: z.enum(["justified", "fraud"]),
  note: z.string().trim().max(500).optional()
});

/** L'investisseur tranche une recette signalée : justifiée ou fraude. */
export async function reviewEntry(_prev: ReviewEntryState, formData: FormData): Promise<ReviewEntryState> {
  const parsed = reviewSchema.safeParse({
    entry_id: formData.get("entry_id"),
    decision: formData.get("decision"),
    note: formData.get("note") || undefined
  });
  if (!parsed.success) return { ok: false, message: "Données invalides." };

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Session expirée. Reconnectez-vous." };

  // RLS daily_entries_owner_all : seul le propriétaire peut modifier.
  const { data, error } = await supabase
    .from("daily_entries")
    .update({
      review_status: parsed.data.decision,
      review_note: parsed.data.note ?? null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id
    })
    .eq("id", parsed.data.entry_id)
    .eq("owner_id", user.id)
    .select("id");

  if (error) return { ok: false, message: error.message };
  if (!data?.length) return { ok: false, message: "Recette introuvable." };

  revalidatePath(ROUTES.INVESTOR_CONTROL);
  return {
    ok: true,
    message: parsed.data.decision === "fraud" ? "Marquée comme fraude." : "Marquée comme justifiée."
  };
}
