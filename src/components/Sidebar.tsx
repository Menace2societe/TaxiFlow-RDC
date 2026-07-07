"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CarTaxiFront,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  Settings,
  ShieldCheck,
  UserCog,
  UserRound,
  Wrench
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ROUTES } from "@/lib/routes";
import type { UserRole } from "@/lib/supabase/types";

const navItems = {
  driver: [
    { href: ROUTES.DRIVER_PORTAL, label: "Portail terrain", icon: LayoutDashboard },
    { href: ROUTES.DRIVER_DASHBOARD, label: "Mes Recettes", icon: ReceiptText },
    { href: ROUTES.DRIVER_MAINTENANCE, label: "Maintenance Moto/Taxi", icon: Wrench },
    { href: ROUTES.DRIVER_PROFILE, label: "Mon Profil", icon: UserRound }
  ],
  investor: [
    { href: ROUTES.INVESTOR_DASHBOARD, label: "Etat de la Flotte", icon: CarTaxiFront },
    { href: ROUTES.INVESTOR_FLEET, label: "Flotte Investie", icon: CarTaxiFront },
    { href: ROUTES.INVESTOR_REVENUE, label: "Revenus", icon: BarChart3 },
    { href: ROUTES.INVESTOR_DOCUMENTS, label: "Documents Legaux", icon: FileText },
    { href: ROUTES.INVESTOR_SETTINGS, label: "Parametres", icon: Settings }
  ],
  admin: [
    { href: ROUTES.DASHBOARD_OVERVIEW, label: "Vue generale", icon: LayoutDashboard },
    { href: ROUTES.DASHBOARD_ENTRIES, label: "Recettes", icon: ClipboardList },
    { href: ROUTES.DASHBOARD_FLEET, label: "Flotte", icon: CarTaxiFront },
    { href: ROUTES.DASHBOARD_USERS, label: "Utilisateurs", icon: UserCog },
    { href: ROUTES.DASHBOARD_REPORTS, label: "Rapports globaux", icon: ShieldCheck }
  ]
} satisfies Record<UserRole, Array<{ href: string; label: string; icon: LucideIcon }>>;

type SidebarProps = {
  role: UserRole;
  name?: string | null;
};

export function Sidebar({ role, name }: SidebarProps) {
  const pathname = usePathname();
  const items = navItems[role];

  return (
    <aside className="flex h-full w-full flex-col border-r border-white/10 bg-stone-950 text-stone-100">
      <div className="border-b border-white/10 px-5 py-4">
        <Link href={ROUTES.HOME} className="text-lg font-bold text-white">
          TaxiFlow RDC
        </Link>
        <p className="mt-1 text-xs capitalize text-stone-400">
          {name ?? role} · portail {role}
        </p>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-stone-300 transition hover:bg-white/10 hover:text-white",
                active && "bg-emerald-500/10 text-emerald-300"
              )}
            >
              <Icon size={18} aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <form action={ROUTES.AUTH_SIGNOUT} method="post" className="border-t border-white/10 p-3">
        <button className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-stone-300 hover:bg-white/10 hover:text-white" type="submit">
          <LogOut size={18} aria-hidden />
          Deconnexion
        </button>
      </form>
    </aside>
  );
}
