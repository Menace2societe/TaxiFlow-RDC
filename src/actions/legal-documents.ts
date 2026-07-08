"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ownerDriverDocumentTypeOptions } from "@/lib/legal-documents/constants";
import { loginWithNext, ROUTES } from "@/lib/routes";
import type { DocumentType } from "@/lib/supabase/types";

const uploadSchema = z.object({
  driver_id: z.string().uuid(),
  vehicle_id: z.string().uuid().optional().nullable(),
  document_type: z.enum([
    "contrat_employe",
    "contrat_location_vente",
    "assurance",
    "carte_rose",
    "permis",
    "controle_technique",
    "autorisation_transport"
  ]),
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
  const returnPath = String(formData.get("return_path") ?? ROUTES.INVESTOR_DOCUMENTS);
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(loginWithNext(returnPath));
  }

  const vehicleIdRaw = String(formData.get("vehicle_id") ?? "").trim();
  const parsed = uploadSchema.safeParse({
    driver_id: formData.get("driver_id"),
    vehicle_id: vehicleIdRaw === "" ? null : vehicleIdRaw,
    document_type: formData.get("document_type"),
    document_name: formData.get("document_name")
  });

  if (!parsed.success) {
    redirect(`${returnPath}?error=${encodeURIComponent("Document, vehicule ou chauffeur invalide.")}`);
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect(`${returnPath}?error=${encodeURIComponent("Selectionnez un fichier a televerser.")}`);
  }

  const isSelfUpload = parsed.data.driver_id === user.id;

  // Types autorisés pour le self-upload (Chauffeur-Patron)
  const allowedSelfTypes = new Set<DocumentType>([
    ...ownerDriverDocumentTypeOptions.map((option) => option.value),
    "permis"
  ]);

  if (isSelfUpload && !allowedSelfTypes.has(parsed.data.document_type)) {
    redirect(`${returnPath}?error=${encodeURIComponent("Un chauffeur-patron peut televerser uniquement Carte Rose, Assurance ou Permis.")}`);
  }

  // Résolution du véhicule
  let resolvedVehicleId: string | null = null;

  if (parsed.data.vehicle_id) {
    // Un véhicule spécifique est demandé : vérifier la propriété
    const ownerIdToCheck = isSelfUpload ? user.id : user.id;
    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id")
      .eq("id", parsed.data.vehicle_id)
      .eq("owner_id", ownerIdToCheck)
      .maybeSingle();

    if (vehicleError || !vehicle) {
      // Tenter via driver_id si pas owner (cas investisseur)
      if (!isSelfUpload) {
        const { data: driverVehicle, error: dvErr } = await supabase
          .from("vehicles")
          .select("id")
          .eq("id", parsed.data.vehicle_id)
          .eq("driver_id", parsed.data.driver_id)
          .maybeSingle();

        if (dvErr || !driverVehicle) {
          redirect(`${returnPath}?error=${encodeURIComponent("Ce vehicule ne correspond pas au chauffeur selectionne.")}`);
        }
        resolvedVehicleId = driverVehicle?.id ?? null;
      } else {
        // Chauffeur-Patron : le véhicule doit lui appartenir
        redirect(`${returnPath}?error=${encodeURIComponent("Ce vehicule ne vous appartient pas.")}`);
      }
    } else {
      resolvedVehicleId = vehicle.id;
    }
  } else if (!isSelfUpload) {
    // Investisseur sans vehicle_id spécifié : trouver le véhicule assigné à ce chauffeur
    const { data: vehicle } = await supabase
      .from("vehicles")
      .select("id")
      .eq("owner_id", user.id)
      .eq("driver_id", parsed.data.driver_id)
      .maybeSingle();

    resolvedVehicleId = vehicle?.id ?? null;

    if (!resolvedVehicleId) {
      redirect(`${returnPath}?error=${encodeURIComponent("Ce chauffeur n'est pas assigne a un vehicule de votre flotte.")}`);
    }
  }
  // Sinon : self-upload sans vehicle_id = autorisé (document sans véhicule)

  const storageName = safeStorageName(file.name) || "document";
  const vehicleSegment = resolvedVehicleId ?? "no-vehicle";
  const storagePath = `${user.id}/${parsed.data.driver_id}/${vehicleSegment}/${Date.now()}-${storageName}`;

  const { error: uploadError } = await supabase.storage
    .from("legal-documents")
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "application/octet-stream"
    });

  if (uploadError) {
    redirect(`${returnPath}?error=${encodeURIComponent(uploadError.message)}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from("legal-documents")
    .getPublicUrl(storagePath);

  const { error: insertError } = await supabase.from("legal_documents").insert({
    owner_id: user.id,
    driver_id: parsed.data.driver_id,
    vehicle_id: resolvedVehicleId,
    document_type: parsed.data.document_type,
    document_name: parsed.data.document_name,
    file_url: publicUrlData.publicUrl,
    storage_path: storagePath
  });

  if (insertError) {
    redirect(`${returnPath}?error=${encodeURIComponent(insertError.message)}`);
  }

  revalidatePath(ROUTES.INVESTOR_DOCUMENTS);
  revalidatePath(ROUTES.DRIVER_DOCUMENTS);
  redirect(`${returnPath}?uploaded=1`);
}
