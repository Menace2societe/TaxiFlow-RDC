import { createClient } from "@/lib/supabase/server";
import type { DocumentType } from "@/lib/supabase/types";

export type LegalDocumentRow = {
  id: string;
  owner_id: string;
  driver_id: string;
  vehicle_id: string | null;
  document_type: DocumentType;
  document_name: string;
  file_url: string;
  storage_path: string;
  created_at: string;
};

export async function getInvestorLegalDocuments(ownerId: string): Promise<LegalDocumentRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("legal_documents")
    .select("id,owner_id,driver_id,vehicle_id,document_type,document_name,file_url,storage_path,created_at")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getInvestorLegalDocuments]", error.message);
    return [];
  }

  return data ?? [];
}

export async function getDriverLegalDocuments(driverId: string): Promise<LegalDocumentRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("legal_documents")
    .select("id,owner_id,driver_id,vehicle_id,document_type,document_name,file_url,storage_path,created_at")
    .eq("driver_id", driverId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getDriverLegalDocuments]", error.message);
    return [];
  }

  return data ?? [];
}
