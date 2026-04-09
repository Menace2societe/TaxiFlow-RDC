'use server'

import { createClient } from '@/lib/supabase/client'
import { getBaseUrl } from '@/lib/url'

export async function createCheckoutSession() {
  // On neutralise Stripe pour le moment pour valider le build
  console.log("Stripe est désactivé");
  const baseUrl = getBaseUrl();
  return { url: `${baseUrl}/dashboard` };
}
