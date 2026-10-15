import { createClient } from "@/lib/supabase/server";
import type { DocumentType } from "@/lib/supabase/types";
import { bucketForDocument, SIGNED_URL_TTL_SECONDS } from "./storage";

export type LegalDocumentRow = {
  id: string;
  owner_id: string;
  driver_id: string;
  vehicle_id: string | null;
  document_type: DocumentType;
  document_name: string;
  /** Lien signé temporaire (1 h), vide si le fichier est introuvable. */
  file_url: string;
  storage_path: string;
  expires_at: string | null;
  created_at: string;
};

const documentColumns =
  "id,owner_id,driver_id,vehicle_id,document_type,document_name,file_url,storage_path,expires_at,created_at";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/** Remplace file_url par un lien signé : le bucket est privé. */
async function withSignedUrls(supabase: SupabaseServerClient, rows: LegalDocumentRow[]): Promise<LegalDocumentRow[]> {
  const pathsByBucket = new Map<string, string[]>();
  for (const row of rows) {
    const bucket = bucketForDocument(row.file_url);
    pathsByBucket.set(bucket, [...(pathsByBucket.get(bucket) ?? []), row.storage_path]);
  }

  const signedByKey = new Map<string, string>();
  await Promise.all(
    Array.from(pathsByBucket, async ([bucket, paths]) => {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
      if (error) {
        console.error("[legal-documents] Liens signés impossibles :", error.message);
        return;
      }
      for (const item of data ?? []) {
        if (item.path && item.signedUrl) {
          signedByKey.set(`${bucket}:${item.path}`, item.signedUrl);
        }
      }
    })
  );

  return rows.map((row) => ({
    ...row,
    file_url: signedByKey.get(`${bucketForDocument(row.file_url)}:${row.storage_path}`) ?? ""
  }));
}

async function getLegalDocuments(column: "owner_id" | "driver_id", userId: string, label: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("legal_documents")
    .select(documentColumns)
    .eq(column, userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(`[${label}]`, error.message);
    return [];
  }

  return withSignedUrls(supabase, data ?? []);
}

export async function getInvestorLegalDocuments(ownerId: string): Promise<LegalDocumentRow[]> {
  return getLegalDocuments("owner_id", ownerId, "getInvestorLegalDocuments");
}

export async function getDriverLegalDocuments(driverId: string): Promise<LegalDocumentRow[]> {
  return getLegalDocuments("driver_id", driverId, "getDriverLegalDocuments");
}
