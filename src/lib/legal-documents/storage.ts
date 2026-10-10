export const LEGAL_DOCUMENTS_BUCKET = "documents";

/** Durée de validité des liens de téléchargement. */
export const SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * Les premiers documents étaient dans le bucket « legal-documents » avec une URL
 * publique enregistrée dans file_url ; les suivants sont dans « documents ».
 */
export function bucketForDocument(fileUrl: string | null | undefined): string {
  return fileUrl?.includes("/legal-documents/") ? "legal-documents" : LEGAL_DOCUMENTS_BUCKET;
}
