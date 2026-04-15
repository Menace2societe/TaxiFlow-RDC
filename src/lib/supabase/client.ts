import { createBrowserClient } from "@supabase/ssr";
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dqswjpktzcdikmwwxokb.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxc3dqcGt0emNkaWttd3d4b2tiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NzI5MjEsImV4cCI6MjA5MTI0ODkyMX0.DE8bO0qvXN7d5jUIYzVGN-_z4nCBioNaZ5VFP1t28ls"
  );
}
