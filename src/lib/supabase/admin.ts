import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Client service role : contourne la RLS. Serveur uniquement, et seulement pour
 * les opérations d'administration Auth (création de comptes chauffeurs).
 * Retourne null si SUPABASE_SERVICE_ROLE_KEY n'est pas configurée.
 */
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    return null;
  }

  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}
