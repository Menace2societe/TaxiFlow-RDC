"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { loginWithNext, ROUTES } from "@/lib/routes";

const uploadSchema = z.object({
  driver_id: z.string().uuid(),
  document_name: z.string().min(2).max(160).transform((value) => value.trim())
});

function safeStorageName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export async function uploadLegalDocument(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(loginWithNext(ROUTES.INVESTOR_DOCUMENTS));
  }

  const parsed = uploadSchema.safeParse({
    driver_id: formData.get("driver_id"),
    document_name: formData.get("document_name")
  });

  if (!parsed.success) {
    redirect(`${ROUTES.INVESTOR_DOCUMENTS}?error=${encodeURIComponent("Document ou chauffeur invalide.")}`);
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect(`${ROUTES.INVESTOR_DOCUMENTS}?error=${encodeURIComponent("Selectionnez un fichier a televerser.")}`);
  }

  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .select("id")
    .eq("owner_id", user.id)
    .eq("driver_id", parsed.data.driver_id)
    .maybeSingle();

  if (vehicleError || !vehicle) {
    redirect(`${ROUTES.INVESTOR_DOCUMENTS}?error=${encodeURIComponent("Ce chauffeur n'est pas assigne a votre flotte.")}`);
  }

  const storageName = safeStorageName(file.name) || "document";
  const storagePath = `${user.id}/${parsed.data.driver_id}/${Date.now()}-${storageName}`;

  const { error: uploadError } = await supabase.storage
    .from("legal-documents")
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "application/octet-stream"
    });

  if (uploadError) {
    redirect(`${ROUTES.INVESTOR_DOCUMENTS}?error=${encodeURIComponent(uploadError.message)}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from("legal-documents")
    .getPublicUrl(storagePath);

  const { error: insertError } = await supabase.from("legal_documents").insert({
    owner_id: user.id,
    driver_id: parsed.data.driver_id,
    document_name: parsed.data.document_name,
    file_url: publicUrlData.publicUrl,
    storage_path: storagePath
  });

  if (insertError) {
    redirect(`${ROUTES.INVESTOR_DOCUMENTS}?error=${encodeURIComponent(insertError.message)}`);
  }

  revalidatePath(ROUTES.INVESTOR_DOCUMENTS);
  revalidatePath(ROUTES.DRIVER_DOCUMENTS);
  redirect(`${ROUTES.INVESTOR_DOCUMENTS}?uploaded=1`);
}
