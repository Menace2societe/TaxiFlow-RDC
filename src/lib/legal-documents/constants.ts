import type { DocumentType } from "@/lib/supabase/types";

export const documentTypeOptions = [
  { value: "contrat_employe", label: "Contrat Employe" },
  { value: "contrat_location_vente", label: "Contrat Location-Vente" },
  { value: "assurance", label: "Assurance" },
  { value: "carte_rose", label: "Carte Rose" },
  { value: "permis", label: "Permis" },
  { value: "controle_technique", label: "Controle Technique" },
  { value: "autorisation_transport", label: "Autorisation de transport" }
] as const satisfies ReadonlyArray<{ value: DocumentType; label: string }>;

export const ownerDriverDocumentTypeOptions = documentTypeOptions.filter((option) =>
  option.value === "carte_rose" || option.value === "assurance"
);

export const documentTypeLabelByValue = new Map<DocumentType, string>(
  documentTypeOptions.map((option) => [option.value, option.label])
);
