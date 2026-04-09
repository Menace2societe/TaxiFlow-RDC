"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
const NAV = [
  { href: "/overview", label: "Tableau de bord", icon: "📊" },
  { href: "/fleet", label: "Flotte", icon: "🚗" },
  { href: "/entries", label: "Saisies", icon: "📝" },
  { href: "/reports", label: "Rapports", icon: "📈" },
];
export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const supabase = createClient();
  async function handleLogout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 min-h-screen bg-[#0d0d1a] border-r border-[#2a2a40] fixed left-0 top-0 z-40">
        <div className="p-5 border-b border-[#2a2a40]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#7c63f5] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">T</span>
            </div>
            <span className="text-sm font-bold text-white">taxiflow</span>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map(item => (
            <Link
              key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                pathname === item.href
                  ? "bg-[#7c63f5]/15 text-[#7c63f5]"
                  : "text-[#94a3b8] hover:text-white hover:bg-[#1a1a2e]"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-[#2a2a40]">
          <button
            onClick={handleLogout} disabled={loggingOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#64748b] hover:text-[#ef4444] hover:bg-red-500/5 transition-all"
          >
            <span>🚪</span>
            <span>{loggingOut ? "Déconnexion..." : "Déconnexion"}</span>
          </button>
        </div>
      </aside>
      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0d0d1a] border-t border-[#2a2a40] z-40 flex">
        {NAV.map(item => (
          <Link
            key={item.href} href={item.href}
            className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 text-xs transition-colors ${
              pathname === item.href ? "text-[#7c63f5]" : "text-[#64748b]"
            }`}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span className="font-medium">{item.label.split(" ")[0]}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
