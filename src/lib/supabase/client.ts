import { createBrowserClient } from "@supabase/ssr";
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "sb_publishable_N2vvxT3sSusU8ruIfrb9Ug_P4oDPe4o",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_secret_C8efoHzZ94KrShXonwwQ6g_rbD0CO9a"
  );
}
