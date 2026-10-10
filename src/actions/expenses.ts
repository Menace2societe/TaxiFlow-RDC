"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUsdToCdfRate, usdToCdf } from "@/lib/fx/rate";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export type ExpenseActionState = { ok: boolean; message: string };

const expenseSchema = z.object({
  vehicle_id: z.string().uuid("Choisissez un véhicule."),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide."),
  category: z.enum(["carburant", "entretien", "reparation", "assurance", "taxe", "autre"]),
  amount: z.coerce.number().positive("Montant invalide."),
  currency: z.enum(["CDF", "USD"]),
  note: z.string().trim().max(300).optional()
});

export async function addExpense(_prev: ExpenseActionState, formData: FormData): Promise<ExpenseActionState> {
  const parsed = expenseSchema.safeParse({
    vehicle_id: formData.get("vehicle_id"),
    expense_date: formData.get("expense_date"),
    category: formData.get("category"),
    amount: formData.get("amount"),
    currency: formData.get("currency") ?? "CDF",
    note: formData.get("note") || undefined
  });
  if (!parsed.success) {
    return { ok: false, message: Object.values(parsed.error.flatten().fieldErrors)[0]?.[0] ?? "Données invalides." };
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Session expirée. Reconnectez-vous." };

  const { amount, currency } = parsed.data;
  const amountCdf = currency === "USD" ? usdToCdf(amount, (await getUsdToCdfRate()).rate) : Math.round(amount);
  const note = [parsed.data.note, currency === "USD" ? `${amount} USD` : null].filter(Boolean).join(" · ") || null;

  // RLS : le véhicule doit appartenir à l'investisseur.
  const { error } = await supabase.from("vehicle_expenses").insert({
    owner_id: user.id,
    vehicle_id: parsed.data.vehicle_id,
    expense_date: parsed.data.expense_date,
    category: parsed.data.category,
    amount_cdf: amountCdf,
    note,
    created_by: user.id
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath(ROUTES.INVESTOR_EXPENSES);
  return { ok: true, message: "Dépense enregistrée." };
}

export async function deleteExpense(formData: FormData) {
  const id = z.string().uuid().safeParse(formData.get("expense_id"));
  if (!id.success) return;

  const supabase = await createClient();
  await supabase.from("vehicle_expenses").delete().eq("id", id.data);
  revalidatePath(ROUTES.INVESTOR_EXPENSES);
}
