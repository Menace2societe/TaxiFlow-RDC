export const dynamic = "force-dynamic";
import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return (
    <div className="min-h-screen bg-[#0a0a14]">
      <Sidebar />
      <main className="md:ml-56 pb-20 md:pb-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}
